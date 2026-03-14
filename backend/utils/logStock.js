/**
 * logStock — writes a single entry to the StockHistory collection.
 *
 * @param {Object} params
 * @param {string}  params.product_id   — Mongoose ObjectId or string
 * @param {number}  params.change_qty   — positive = added, negative = removed
 * @param {number}  params.snapshot_qty — stock balance AFTER this change
 * @param {string}  [params.reason]     — human-readable reason
 * @param {string}  [params.source]     — 'initial' | 'manual' | 'edit' | 'order' | 'reorder'
 * @param {string}  [params.updated_by] — admin user id (undefined for order flows)
 * @param {string}  [params.order_id]   — order id (only for order/reorder sources)
 * @returns {Promise<Document>}
 */
const StockHistory = require('../models/StockHistory');

async function logStock({ product_id, change_qty, snapshot_qty, reason, source = 'manual', updated_by, order_id }) {
  return StockHistory.create({
    product_id,
    change_qty,
    snapshot_qty,
    reason: reason || 'Manual update',
    source,
    updated_by: updated_by || undefined,
    order_id:   order_id   || undefined,
  });
}

module.exports = logStock;
