const nodemailer = require('nodemailer');

const isSmtpConfigured = () =>
  process.env.SMTP_USER &&
  process.env.SMTP_USER !== 'your_email@gmail.com' &&
  process.env.SMTP_PASS &&
  process.env.SMTP_PASS !== 'your_gmail_app_password';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
};

// ── Welcome email sent on user registration ────────────────────
const sendWelcomeEmail = async ({ to, name }) => {
  if (!isSmtpConfigured()) {
    console.log(`[Email] Skipped — SMTP not configured. Welcome email for ${to}`);
    return;
  }
  try {
    const transporter = createTransporter();
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
        <div style="background:#DA291C;padding:32px 24px;text-align:center;">
          <h1 style="color:#FFC72C;margin:0;font-size:32px;letter-spacing:-1px;">🍔 Riser</h1>
          <p style="color:#fff;margin:8px 0 0;font-size:16px;opacity:0.9;">Welcome to the family!</p>
        </div>
        <div style="padding:36px 32px;">
          <p style="font-size:18px;margin:0 0 12px;">Hi <strong>${name}</strong> 👋</p>
          <p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 24px;">
            Your account has been created successfully. You can now browse our menu,
            add items to your cart, and place orders — all in one place!
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}"
               style="background:#DA291C;color:#fff;text-decoration:none;padding:14px 32px;
                      border-radius:99px;font-size:16px;font-weight:700;display:inline-block;">
              🍔 Start Ordering
            </a>
          </div>
          <div style="background:#f9f9f9;border-radius:10px;padding:20px 24px;margin:24px 0;">
            <p style="margin:0 0 12px;font-weight:700;color:#333;">What you can do:</p>
            <p style="margin:6px 0;color:#555;">🛒 &nbsp; Browse and order from our full menu</p>
            <p style="margin:6px 0;color:#555;">🎁 &nbsp; Customize with add-ons and combos</p>
            <p style="margin:6px 0;color:#555;">📦 &nbsp; Track your order history</p>
            <p style="margin:6px 0;color:#555;">↺ &nbsp; Reorder your favourites in one click</p>
          </div>
          <p style="color:#999;font-size:13px;margin:24px 0 0;text-align:center;">
            If you did not create this account, you can safely ignore this email.<br/>
            — The Riser Team 🍔
          </p>
        </div>
        <div style="background:#f0f0f0;padding:16px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#999;">
            © ${new Date().getFullYear()} Riser · Crafted with ❤️
          </p>
        </div>
      </div>
    `;
    await transporter.sendMail({
      from: `"Riser 🍔" <${process.env.SMTP_USER}>`,
      to,
      subject: `Welcome to Riser, ${name}! 🍔`,
      html,
    });
    console.log(`[Email] Welcome email sent to ${to}`);
  } catch (err) {
    // Log but never crash — email failure must not block registration
    console.error(`[Email] Failed to send welcome email to ${to}:`, err.message);
  }
};

// ── Order confirmation email ───────────────────────────────────
const sendOrderConfirmation = async ({ to, name, order }) => {
  if (!isSmtpConfigured()) {
    console.log(`[Email] Skipped — SMTP not configured. Order ${order._id} confirmed for ${to}`);
    return;
  }
  try {
    const transporter = createTransporter();
    const itemsHtml = order.items
      .map(
        (i) =>
          `<tr>
            <td style="padding:8px;border-bottom:1px solid #f0f0f0;">${i.title}</td>
            <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:center;">${i.qty}</td>
            <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right;">₹${(i.unit_price * i.qty).toFixed(2)}</td>
          </tr>`
      )
      .join('');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
        <div style="background:#DA291C;padding:24px;text-align:center;">
          <h1 style="color:#FFC72C;margin:0;font-size:28px;">🍔 Riser</h1>
          <p style="color:#fff;margin:8px 0 0;">Order Confirmed! 🎉</p>
        </div>
        <div style="padding:32px;">
          <p style="font-size:16px;">Hi <strong>${name}</strong>,</p>
          <p>Your order <strong>#${order._id}</strong> has been confirmed and is being prepared.</p>
          <table style="width:100%;border-collapse:collapse;margin:24px 0;">
            <thead>
              <tr style="background:#f9f9f9;">
                <th style="padding:8px;text-align:left;">Item</th>
                <th style="padding:8px;text-align:center;">Qty</th>
                <th style="padding:8px;text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div style="background:#f9f9f9;padding:16px;border-radius:8px;">
            <p style="margin:4px 0;">Subtotal: <strong>₹${order.subtotal?.toFixed(2)}</strong></p>
            <p style="margin:4px 0;">Tax: <strong>₹${order.tax?.toFixed(2)}</strong></p>
            <p style="margin:4px 0;font-size:18px;">Total: <strong style="color:#DA291C;">₹${order.total?.toFixed(2)}</strong></p>
          </div>
          <p style="color:#888;font-size:13px;margin-top:24px;">Thank you for ordering from Riser!</p>
        </div>
      </div>
    `;
    await transporter.sendMail({
      from: `"Riser 🍔" <${process.env.SMTP_USER}>`,
      to,
      subject: `Order Confirmed! #${order._id}`,
      html,
    });
    console.log(`[Email] Order confirmation sent to ${to}`);
  } catch (err) {
    console.error(`[Email] Failed to send order confirmation to ${to}:`, err.message);
  }
};

// ── Password Reset Email ───────────────────────────────────────
const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  if (!isSmtpConfigured()) {
    console.log(`[Email] Skipped — SMTP not configured. Reset link for ${to}: ${resetUrl}`);
    return;
  }
  try {
    const transporter = createTransporter();
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
        <div style="background:#DA291C;padding:32px 24px;text-align:center;">
          <h1 style="color:#FFC72C;margin:0;font-size:30px;">🍔 Riser</h1>
          <p style="color:#fff;margin:8px 0 0;font-size:15px;">Password Reset Request</p>
        </div>
        <div style="padding:36px 32px;">
          <p style="font-size:17px;margin:0 0 10px;">Hi <strong>${name}</strong>,</p>
          <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 28px;">
            We received a request to reset your Riser account password. Click the button below to set a new password. 
            This link is valid for <strong>1 hour</strong>.
          </p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${resetUrl}"
               style="background:#DA291C;color:#fff;text-decoration:none;padding:14px 36px;
                      border-radius:99px;font-size:16px;font-weight:700;display:inline-block;">
              🔑 Reset My Password
            </a>
          </div>
          <p style="font-size:13px;color:#888;margin:20px 0 0;">
            If you did not request this, you can safely ignore this email — your password will not change.
          </p>
          <div style="background:#f9f9f9;border-radius:8px;padding:12px 16px;margin-top:20px;">
            <p style="font-size:12px;color:#999;margin:0;word-break:break-all;">
              Or copy this link: <a href="${resetUrl}" style="color:#DA291C;">${resetUrl}</a>
            </p>
          </div>
        </div>
        <div style="background:#f0f0f0;padding:14px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#999;">© ${new Date().getFullYear()} Riser · This link expires in 1 hour</p>
        </div>
      </div>
    `;
    await transporter.sendMail({
      from: `"Riser 🍔" <${process.env.SMTP_USER}>`,
      to,
      subject: `Reset your Riser password 🔑`,
      html,
    });
    console.log(`[Email] Password reset email sent to ${to}`);
  } catch (err) {
    console.error(`[Email] Failed to send reset email to ${to}:`, err.message);
  }
};

module.exports = { sendWelcomeEmail, sendPasswordResetEmail, sendOrderConfirmation };

