const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    cost: { type: Number, required: true, min: 0 },
    tax_percent: { type: Number, default: 0, min: 0, max: 100 },
    image_url: { type: String, default: '' },
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    stock_qty: { type: Number, default: 0, min: 0 },
    is_available: { type: Boolean, default: true },
    addons: [
      {
        name: { type: String },
        price: { type: Number, default: 0 },
      },
    ],
    combos: [
      {
        name: { type: String },
        description: { type: String, default: '' },
        discount_percent: { type: Number, default: 0 },
        items: [
          {
            product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            qty: { type: Number, default: 1 },
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

// Full-text search index
productSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
