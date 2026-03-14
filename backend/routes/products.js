const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const upload = require('../utils/upload');
const logStock = require('../utils/logStock');

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

// POST /api/products — Admin only
router.post(
  '/',
  auth,
  requireRole('admin'),
  upload.single('image'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('cost').isFloat({ min: 0 }).withMessage('Cost must be a positive number'),
    body('category_id').notEmpty().withMessage('Category ID is required'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { title, description, cost, tax_percent, category_id, stock_qty, addons, combos } = req.body;
      const image_url = req.file
        ? `/uploads/${req.file.filename}`
        : req.body.image_url || '';
      const initialQty = parseInt(stock_qty || 0);
      const product = await Product.create({
        title,
        description,
        cost: parseFloat(cost),
        tax_percent: parseFloat(tax_percent || 0),
        image_url,
        category_id,
        stock_qty: initialQty,
        addons: addons ? (typeof addons === 'string' ? JSON.parse(addons) : addons) : [],
        combos: combos ? (typeof combos === 'string' ? JSON.parse(combos) : combos) : [],
      });
      // Log initial stock if non-zero
      if (initialQty > 0) {
        await logStock({
          product_id:   product._id,
          change_qty:   initialQty,
          snapshot_qty: initialQty,
          reason:       'Initial stock on product creation',
          source:       'initial',
          updated_by:   req.user.id,
        });
      }
      res.status(201).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/products/search?q=&page=1&limit=12&category=&minPrice=&maxPrice=&inStock=&sort=
router.get('/search', async (req, res, next) => {
  try {
    const { q = '', page = 1, limit = 12, category, minPrice, maxPrice, inStock, sort = 'relevance' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter — start with text or regex
    let filter = {};
    if (q.trim()) {
      try {
        // Try $text index first (fast, stemmed, fuzzy)
        filter.$text = { $search: q };
      } catch {
        // Fallback: regex on title + description
        filter.$or = [
          { title: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
        ];
      }
    }

    // Nested filters
    if (category) filter.category_id = category;
    if (minPrice || maxPrice) {
      filter.cost = {};
      if (minPrice) filter.cost.$gte = parseFloat(minPrice);
      if (maxPrice) filter.cost.$lte = parseFloat(maxPrice);
    }
    if (inStock === 'true') filter.stock_qty = { $gt: 0 };

    // Sort
    let sortObj = { createdAt: -1 };
    if (sort === 'price_asc') sortObj = { cost: 1 };
    else if (sort === 'price_desc') sortObj = { cost: -1 };
    else if (sort === 'name_asc') sortObj = { title: 1 };
    else if (sort === 'stock_desc') sortObj = { stock_qty: -1 };
    else if (q.trim() && filter.$text) sortObj = { score: { $meta: 'textScore' } };

    const query = Product.find(filter).populate('category_id', 'name').skip(skip).limit(parseInt(limit));
    if (filter.$text) query.select({ score: { $meta: 'textScore' } });
    query.sort(sortObj);

    const [products, total] = await Promise.all([query, Product.countDocuments(filter)]);

    res.json({
      success: true,
      data: products,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/products?page=1&limit=12&category=&minPrice=&maxPrice=&inStock=&sort=
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 12, category, minPrice, maxPrice, inStock, sort = 'newest' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build nested filter
    const filter = {};
    if (category) filter.category_id = category;
    if (minPrice || maxPrice) {
      filter.cost = {};
      if (minPrice) filter.cost.$gte = parseFloat(minPrice);
      if (maxPrice) filter.cost.$lte = parseFloat(maxPrice);
    }
    if (inStock === 'true') filter.stock_qty = { $gt: 0 };

    // Sort
    let sortObj = { createdAt: -1 };
    if (sort === 'price_asc') sortObj = { cost: 1 };
    else if (sort === 'price_desc') sortObj = { cost: -1 };
    else if (sort === 'name_asc') sortObj = { title: 1 };
    else if (sort === 'stock_desc') sortObj = { stock_qty: -1 };

    const [products, total, priceAgg] = await Promise.all([
      Product.find(filter).populate('category_id', 'name').skip(skip).limit(parseInt(limit)).sort(sortObj),
      Product.countDocuments(filter),
      // Return min/max price for filter UI slider
      Product.aggregate([
        { $match: category ? { category_id: new (require('mongoose').Types.ObjectId)(category) } : {} },
        { $group: { _id: null, min: { $min: '$cost' }, max: { $max: '$cost' } } },
      ]),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
      priceRange: priceAgg[0] ? { min: priceAgg[0].min, max: priceAgg[0].max } : { min: 0, max: 1000 },
    });
  } catch (err) {
    next(err);
  }
});


// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('category_id', 'name logo_url');
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' },
      });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id — Admin only (full edit)
router.put(
  '/:id',
  auth,
  requireRole('admin'),
  upload.single('image'),
  async (req, res, next) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' },
        });
      }
      const { title, description, cost, tax_percent, category_id, stock_qty, addons, combos, is_available } = req.body;
      const oldQty = product.stock_qty;  // capture before any changes
      if (title !== undefined) product.title = title;
      if (description !== undefined) product.description = description;
      if (cost !== undefined) product.cost = parseFloat(cost);
      if (tax_percent !== undefined) product.tax_percent = parseFloat(tax_percent);
      if (category_id !== undefined) product.category_id = category_id;
      if (stock_qty !== undefined) product.stock_qty = parseInt(stock_qty);
      if (is_available !== undefined) product.is_available = is_available === 'true' || is_available === true;
      if (req.file) {
        product.image_url = `/uploads/${req.file.filename}`;
      } else if (req.body.image_url !== undefined) {
        product.image_url = req.body.image_url;
      }
      if (addons !== undefined) {
        product.addons = typeof addons === 'string' ? JSON.parse(addons) : addons;
      }
      if (combos !== undefined) {
        product.combos = typeof combos === 'string' ? JSON.parse(combos) : combos;
      }
      await product.save();
      // Log stock change if qty was edited
      if (stock_qty !== undefined && parseInt(stock_qty) !== oldQty) {
        const newQty = product.stock_qty;
        await logStock({
          product_id:   product._id,
          change_qty:   newQty - oldQty,
          snapshot_qty: newQty,
          reason:       'Quantity adjusted via product edit',
          source:       'edit',
          updated_by:   req.user.id,
        });
      }
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/products/:id/stock — Admin only
router.put('/:id/stock', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { change_qty, reason } = req.body;
    if (change_qty === undefined || isNaN(change_qty)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'change_qty is required and must be a number' },
      });
    }
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' },
      });
    }
    const newQty = product.stock_qty + parseInt(change_qty);
    if (newQty < 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INSUFFICIENT_STOCK', message: 'Resulting stock cannot be negative' },
      });
    }
    product.stock_qty = newQty;
    await product.save();
    await logStock({
      product_id:   product._id,
      change_qty:   parseInt(change_qty),
      snapshot_qty: newQty,
      reason:       reason || 'Manual update',
      source:       'manual',
      updated_by:   req.user.id,
    });
    res.json({ success: true, data: { product, new_stock: newQty } });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id/stock-history — Admin only
router.get('/:id/stock-history', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' },
      });
    }
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [history, total] = await Promise.all([
      StockHistory.find({ product_id: req.params.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('updated_by', 'name email'),
      StockHistory.countDocuments({ product_id: req.params.id }),
    ]);
    res.json({
      success: true,
      data: history,
      product: { _id: product._id, title: product.title, stock_qty: product.stock_qty },
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/by-category/:categoryId (convenience)
router.get('/by-category/:categoryId', async (req, res, next) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = { category_id: req.params.categoryId };
    const [products, total] = await Promise.all([
      Product.find(filter).populate('category_id', 'name').skip(skip).limit(parseInt(limit)),
      Product.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: products,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id — Admin only
router.delete('/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' },
      });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
