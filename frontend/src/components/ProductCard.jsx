import { useState } from 'react';
import { useCartStore } from '../store/cartStore';
import toast from 'react-hot-toast';
import './ProductCard.css';

const getStockLabel = (qty) => {
  if (qty === 0) return { label: 'Out of Stock', cls: 'avail-out' };
  if (qty <= 5) return { label: `Only ${qty} left`, cls: 'avail-low' };
  return { label: 'In Stock', cls: 'avail-in' };
};

export default function ProductCard({ product, onAddOnOpen }) {
  const addItem = useCartStore((s) => s.addItem);
  const [adding, setAdding] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (product.addons?.length > 0 || product.combos?.length > 0) {
      onAddOnOpen?.(product);
      return;
    }
    setAdding(true);
    addItem(product, 1, []);
    toast.success(`${product.title} added!`, { icon: '🛒' });
    setTimeout(() => setAdding(false), 600);
  };

  const stockInfo = getStockLabel(product.stock_qty);
  const totalPrice = (product.cost * (1 + (product.tax_percent || 0) / 100)).toFixed(0);

  return (
    <div className="product-card" onClick={() => onAddOnOpen?.(product)} id={`product-${product._id}`}>
      <div className="product-img-wrap">
        {!imgError && product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="product-img-placeholder">
            {product.category_id?.name?.toLowerCase().includes('pizza') ? '🍕'
              : product.category_id?.name?.toLowerCase().includes('drink') ? '🥤'
              : product.category_id?.name?.toLowerCase().includes('dessert') ? '🍰'
              : product.category_id?.name?.toLowerCase().includes('side') ? '🍟'
              : '🍔'}
          </div>
        )}
        {product.stock_qty === 0 && <div className="out-of-stock-overlay">Out of Stock</div>}
        {(product.addons?.length > 0 || product.combos?.length > 0) && (
          <span className="combo-tag">🎁 Combos</span>
        )}
        <div className="stock-badge">
          <span className={`chip ${stockInfo.cls}`}>{stockInfo.label}</span>
        </div>
      </div>
      <div className="product-info">
        <div className="product-cat">{product.category_id?.name || 'Item'}</div>
        <h3 className="product-title">{product.title}</h3>
        <p className="product-desc">{product.description}</p>
        <div className="product-footer">
          <div className="product-price">
            <span className="price-main">₹{product.cost}</span>
            {product.tax_percent > 0 && (
              <span className="price-tax">+{product.tax_percent}% GST = ₹{totalPrice}</span>
            )}
          </div>
          <button
            className={`add-btn ${adding ? 'adding' : ''}`}
            onClick={handleAddToCart}
            disabled={product.stock_qty === 0}
            title={product.stock_qty === 0 ? 'Out of stock' : 'Add to cart'}
          >
            {adding ? '✓' : '+'}
          </button>
        </div>
      </div>
    </div>
  );
}
