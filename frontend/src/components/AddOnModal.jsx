import { useState } from 'react';
import { useCartStore } from '../store/cartStore';
import toast from 'react-hot-toast';
import './AddOnModal.css';

export default function AddOnModal({ product, onClose }) {
  const addItem = useCartStore((s) => s.addItem);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [qty, setQty] = useState(1);

  const toggleAddon = (addon) => {
    setSelectedAddons((prev) =>
      prev.find((a) => a.name === addon.name)
        ? prev.filter((a) => a.name !== addon.name)
        : [...prev, addon]
    );
  };

  const addonTotal = selectedAddons.reduce((s, a) => s + (a.price || 0), 0);
  const basePrice = product.cost;
  const taxAmount = ((basePrice + addonTotal) * qty * (product.tax_percent || 0)) / 100;
  const total = (basePrice + addonTotal) * qty + taxAmount;

  const handleAdd = () => {
    addItem(product, qty, selectedAddons);
    toast.success(`${qty}× ${product.title} added to cart!`, { icon: '🛒' });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} id="addon-modal-overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()} id="addon-modal">
        {/* Header */}
        <div className="addon-modal-header">
          <div>
            {product.image_url ? (
              <img className="addon-product-img" src={product.image_url} alt={product.title} />
            ) : (
              <div className="addon-product-img-placeholder">🍔</div>
            )}
          </div>
          <div className="addon-title-group">
            <div className="addon-category">{product.category_id?.name}</div>
            <h2>{product.title}</h2>
            {product.description && <p>{product.description}</p>}
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Quantity */}
        <div className="addon-section">
          <p className="addon-section-title">Quantity</p>
          <div className="qty-row">
            <span className="qty-label">How many?</span>
            <div className="qty-controls">
              <button className="qty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>−</button>
              <span className="qty-num">{qty}</span>
              <button className="qty-btn" onClick={() => setQty((q) => q + 1)} disabled={qty >= product.stock_qty}>+</button>
            </div>
          </div>
        </div>

        {/* Addons */}
        {product.addons?.length > 0 && (
          <div className="addon-section">
            <p className="addon-section-title">Add-ons (optional)</p>
            {product.addons.map((addon) => {
              const checked = selectedAddons.find((a) => a.name === addon.name);
              return (
                <div
                  key={addon.name}
                  className={`addon-item ${checked ? 'selected' : ''}`}
                  onClick={() => toggleAddon(addon)}
                >
                  <div className="addon-check">{checked ? '✓' : ''}</div>
                  <div className="addon-info">
                    <div className="addon-name">{addon.name}</div>
                    {addon.price > 0 && <div className="addon-price">+₹{addon.price}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Combos */}
        {product.combos?.length > 0 && (
          <div className="addon-section">
            <p className="addon-section-title">🎁 Combo Options</p>
            {product.combos.map((combo) => (
              <div key={combo.name} className="addon-item">
                <div className="addon-info">
                  <div className="addon-name">{combo.name}</div>
                  {combo.description && <div className="addon-price">{combo.description}</div>}
                  {combo.discount_percent > 0 && (
                    <span className="chip chip-green" style={{ marginTop: 4 }}>
                      {combo.discount_percent}% OFF
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Price Breakdown */}
        <div className="price-breakdown">
          <div className="price-row">
            <span>Base price × {qty}</span>
            <span>₹{(basePrice * qty).toFixed(0)}</span>
          </div>
          {addonTotal > 0 && (
            <div className="price-row">
              <span>Add-ons × {qty}</span>
              <span>₹{(addonTotal * qty).toFixed(0)}</span>
            </div>
          )}
          {product.tax_percent > 0 && (
            <div className="price-row">
              <span>GST ({product.tax_percent}%)</span>
              <span>₹{taxAmount.toFixed(0)}</span>
            </div>
          )}
          <div className="price-row total">
            <span>Total</span>
            <span>₹{total.toFixed(0)}</span>
          </div>
        </div>

        {/* CTA */}
        <div className="addon-cta">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={product.stock_qty === 0}
            id="add-to-cart-confirm"
          >
            🛒 Add to Cart · ₹{total.toFixed(0)}
          </button>
        </div>
      </div>
    </div>
  );
}
