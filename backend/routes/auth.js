const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const apiKey = require('../middleware/apiKey');

const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/email');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: errors.array()[0].msg },
    });
  }
  next();
};

// POST /api/auth/signup
router.post(
  '/signup',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, email, password } = req.body;
      const exists = await User.findOne({ email });
      if (exists) {
        return res.status(400).json({
          success: false,
          error: { code: 'EMAIL_TAKEN', message: 'Email already registered' },
        });
      }
      const user = await User.create({ name, email, password_hash: password });
      // Send welcome email (non-blocking — failure won't affect signup response)
      sendWelcomeEmail({ to: user.email, name: user.name }).catch(() => {});
      const token = jwt.sign(
        { id: user._id, role: user.role, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
      res.status(201).json({ success: true, data: { user: user.toSafeObject(), token } });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        });
      }
      const valid = await user.comparePassword(password);
      if (!valid) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        });
      }
      const token = jwt.sign(
        { id: user._id, role: user.role, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
      res.json({ success: true, data: { user: user.toSafeObject(), token } });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/google
router.post('/google', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: { message: 'Token is required' } });
    }
    
    const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { email, name } = payload;

    let user = await User.findOne({ email });
    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString('hex');
      user = await User.create({ name, email, password_hash: randomPassword });
    }

    const jwtToken = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    res.json({ success: true, data: { user: user.toSafeObject(), token: jwtToken } });
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_GOOGLE_TOKEN', message: 'Invalid or expired Google token' },
    });
  }
});


// ── Admin-Only Routes ──────────────────────────────────────────

// POST /api/auth/admin/signup
// Creates an admin account. Requires X-API-Key header (machine-to-machine).
// Usage: POST /api/auth/admin/signup  +  Header: X-API-Key: <your_api_key>
router.post(
  '/admin/signup',
  apiKey,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, email, password } = req.body;
      const exists = await User.findOne({ email });
      if (exists) {
        return res.status(400).json({
          success: false,
          error: { code: 'EMAIL_TAKEN', message: 'Email already registered' },
        });
      }
      const user = await User.create({ name, email, password_hash: password, role: 'admin' });
      // Send welcome email to new admin (non-blocking)
      sendWelcomeEmail({ to: user.email, name: user.name }).catch(() => {});
      const token = jwt.sign(
        { id: user._id, role: user.role, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
      res.status(201).json({ success: true, data: { user: user.toSafeObject(), token } });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/admin/users
// Returns all registered users. Requires Admin JWT in Authorization header.
// Usage: GET /api/auth/admin/users  +  Header: Authorization: Bearer <admin_jwt>
router.get('/admin/users', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = role ? { role } : {};
    const [users, total] = await Promise.all([
      User.find(filter).select('-password_hash').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: users,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/admin/users/:id
// Delete a user account (Admin only).
router.delete('/admin/users/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/forgot-password
// Sends a password-reset link to the user's email. Never reveals if email exists.
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Valid email required').normalizeEmail()],
  validate,
  async (req, res, next) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
      }
      // Generate secure token (32 bytes hex = 64 chars)
      const token = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken  = token;
      user.resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save({ validateBeforeSave: false });
      // Build reset URL
      const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${token}`;
      await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl }).catch(() => {});
      res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    } catch (err) { next(err); }
  }
);

// POST /api/auth/reset-password/:token
router.post(
  '/reset-password/:token',
  [body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')],
  validate,
  async (req, res, next) => {
    try {
      const { token } = req.params;
      const { password } = req.body;
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpiry: { $gt: Date.now() },
      });
      if (!user) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_RESET_TOKEN', message: 'Reset link is invalid or has expired.' },
        });
      }
      user.password_hash       = password; // pre-save hook will hash it
      user.resetPasswordToken  = null;
      user.resetPasswordExpiry = null;
      await user.save();
      res.json({ success: true, message: 'Password updated successfully. You can now log in.' });
    } catch (err) { next(err); }
  }
);

module.exports = router;
