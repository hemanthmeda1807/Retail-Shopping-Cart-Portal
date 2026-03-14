const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Category = require('../models/Category');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const upload = require('../utils/upload');

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

// POST /api/categories — Admin only
router.post(
  '/',
  auth,
  requireRole('admin'),
  upload.single('logo'),
  [body('name').trim().notEmpty().withMessage('Category name is required')],
  validate,
  async (req, res, next) => {
    try {
      const { name, description } = req.body;
      const logo_url = req.file
        ? `/uploads/${req.file.filename}`
        : req.body.logo_url || '';
      const category = await Category.create({ name, description, logo_url });
      res.status(201).json({ success: true, data: category });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/categories — public
router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
});

// GET /api/categories/:id — public
router.get('/:id', async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: { code: 'CATEGORY_NOT_FOUND', message: 'Category not found' },
      });
    }
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
});

// PUT /api/categories/:id — Admin only
router.put(
  '/:id',
  auth,
  requireRole('admin'),
  upload.single('logo'),
  async (req, res, next) => {
    try {
      const category = await Category.findById(req.params.id);
      if (!category) {
        return res.status(404).json({
          success: false,
          error: { code: 'CATEGORY_NOT_FOUND', message: 'Category not found' },
        });
      }
      const { name, description } = req.body;
      if (name !== undefined) category.name = name;
      if (description !== undefined) category.description = description;
      if (req.file) {
        category.logo_url = `/uploads/${req.file.filename}`;
      } else if (req.body.logo_url !== undefined) {
        category.logo_url = req.body.logo_url;
      }
      await category.save();
      res.json({ success: true, data: category });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/categories/:id — Admin only
router.delete('/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: { code: 'CATEGORY_NOT_FOUND', message: 'Category not found' },
      });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/categories/:id/products — UC-302/303 canonical endpoint
router.get('/:id/products', async (req, res, next) => {
  try {
    const Product = require('../models/Product');
    const { page = 1, limit = 12, in_stock } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = { category_id: req.params.id };
    if (in_stock === 'true') filter.stock_qty = { $gt: 0 };

    const [products, total, category] = await Promise.all([
      Product.find(filter).populate('category_id', 'name logo_url').skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      Product.countDocuments(filter),
      Category.findById(req.params.id),
    ]);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: { code: 'CATEGORY_NOT_FOUND', message: 'Category not found' },
      });
    }

    res.json({
      success: true,
      data: products,
      category,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
