const mongoose = require('mongoose');

const stockHistorySchema = new mongoose.Schema(
  {
    product_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    change_qty:   { type: Number, required: true },          // +ve = stock added, -ve = stock removed
    snapshot_qty: { type: Number, required: true },          // stock balance AFTER this change
    reason:       { type: String, default: 'Manual update' },
    source:       {
      type: String,
      enum: ['initial', 'manual', 'edit', 'order', 'reorder'],
      default: 'manual',
    },
    updated_by:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null for order-triggered entries
    order_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, // only set for order/reorder sources
  },
  { timestamps: true }  // gives us createdAt for sorting
);

// Indexes for the admin ledger queries
stockHistorySchema.index({ product_id: 1, createdAt: -1 });
stockHistorySchema.index({ source: 1 });
stockHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('StockHistory', stockHistorySchema);
