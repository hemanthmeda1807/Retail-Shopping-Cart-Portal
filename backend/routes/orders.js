const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const { sendOrderConfirmation } = require('../utils/email');
const User = require('../models/User');
const logStock = require('../utils/logStock');

// POST /api/orders — authenticated user
router.post('/', auth, async (req, res, next) => {
  try {
    const { items, delivery_address } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Items array is required' },
      });
    }

    // Validate products and build order items
    const orderItems = [];
    let subtotal = 0;
    let taxTotal = 0;

    // Decrement stock and collect items for ledger
      const stockLedgerItems = [];
      for (const item of items) {
        const product = await Product.findById(item.product_id);
        if (!product) {
          return res.status(404).json({
            success: false,
            error: { code: 'PRODUCT_NOT_FOUND', message: `Product ${item.product_id} not found` },
          });
        }
        if (product.stock_qty < item.qty) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INSUFFICIENT_STOCK',
              message: `Insufficient stock for "${product.title}". Available: ${product.stock_qty}`,
            },
          });
        }
        const addonTotal = (item.addons || []).reduce((s, a) => s + (a.price || 0), 0);
        const unitPrice = product.cost + addonTotal;
        const itemTotal = unitPrice * item.qty;
        const itemTax = itemTotal * (product.tax_percent / 100);
        subtotal += itemTotal;
        taxTotal += itemTax;
        orderItems.push({
          product_id: product._id,
          title: product.title,
          qty: item.qty,
          unit_price: unitPrice,
          addons: item.addons || [],
        });
        // Decrement stock
        product.stock_qty -= item.qty;
        await product.save();
        // Stash for ledger logging after order is created
        stockLedgerItems.push({ product_id: product._id, change_qty: -item.qty, snapshot_qty: product.stock_qty });
      }

    const total = subtotal + taxTotal;
    const order = await Order.create({
      user_id: req.user.id,
      items: orderItems,
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(taxTotal.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      delivery_address: delivery_address || '',
    });

    // Write ledger entries now that we have the order id
    await Promise.all(stockLedgerItems.map(entry =>
      logStock({
        product_id:   entry.product_id,
        change_qty:   entry.change_qty,
        snapshot_qty: entry.snapshot_qty,
        reason:       `Order #${order._id}`,
        source:       'order',
        order_id:     order._id,
      })
    ));

    // Send confirmation email (non-blocking)
    const user = await User.findById(req.user.id);
    if (user) {
      sendOrderConfirmation({ to: user.email, name: user.name, order }).catch(() => {});
    }

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders — user's own orders
router.get('/', auth, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      Order.find({ user_id: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments({ user_id: req.user.id }),
    ]);
    res.json({
      success: true,
      data: orders,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id — single order
router.get('/:id', auth, async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' },
      });
    }
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/:id/reorder — clone past order
router.post('/:id/reorder', auth, async (req, res, next) => {
  try {
    const original = await Order.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!original) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Original order not found' },
      });
    }
    // Check stock for each item
    for (const item of original.items) {
      const product = await Product.findById(item.product_id);
      if (!product || product.stock_qty < item.qty) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: `Insufficient stock for "${item.title}"`,
          },
        });
      }
    }
    // Deduct stock & create order
    const newItems = [];
    let subtotal = 0;
    let taxTotal = 0;
    const reorderLedgerItems = [];
    for (const item of original.items) {
      const product = await Product.findById(item.product_id);
      product.stock_qty -= item.qty;
      await product.save();
      reorderLedgerItems.push({ product_id: product._id, change_qty: -item.qty, snapshot_qty: product.stock_qty });
      const itemTotal = item.unit_price * item.qty;
      const itemTax = itemTotal * ((product.tax_percent || 0) / 100);
      subtotal += itemTotal;
      taxTotal += itemTax;
      newItems.push({ ...item.toObject(), _id: undefined });
    }
    const total = subtotal + taxTotal;
    const order = await Order.create({
      user_id: req.user.id,
      items: newItems,
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(taxTotal.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
    });

    // Write ledger entries
    await Promise.all(reorderLedgerItems.map(entry =>
      logStock({
        product_id:   entry.product_id,
        change_qty:   entry.change_qty,
        snapshot_qty: entry.snapshot_qty,
        reason:       `Reorder — original order #${original._id}, new order #${order._id}`,
        source:       'reorder',
        order_id:     order._id,
      })
    ));

    const user = await User.findById(req.user.id);
    if (user) sendOrderConfirmation({ to: user.email, name: user.name, order }).catch(() => {});
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
