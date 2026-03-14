const express = require('express');
const router = express.Router();
const StockHistory = require('../models/StockHistory');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// GET /api/stock/ledger — full ledger across all products (admin only)
// Query: ?page=1&limit=20&product=<id>&direction=in|out&source=manual|order|initial|edit|reorder&from=<ISO>&to=<ISO>
router.get('/ledger', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, product, direction, source, from, to } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (product)   filter.product_id = product;
    if (direction === 'in')  filter.change_qty = { $gt: 0 };
    if (direction === 'out') filter.change_qty = { $lt: 0 };
    if (source)    filter.source = source;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }

    const [entries, total, summary] = await Promise.all([
      StockHistory.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('product_id', 'title stock_qty')
        .populate('updated_by', 'name email')
        .populate('order_id', '_id'),
      StockHistory.countDocuments(filter),
      // Summary stats — total added and total deducted
      StockHistory.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalAdded:    { $sum: { $cond: [{ $gt: ['$change_qty', 0] }, '$change_qty', 0] } },
            totalDeducted: { $sum: { $cond: [{ $lt: ['$change_qty', 0] }, '$change_qty', 0] } },
            totalEntries:  { $sum: 1 },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: entries,
      summary: summary[0] || { totalAdded: 0, totalDeducted: 0, totalEntries: 0 },
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) { next(err); }
});

module.exports = router;
