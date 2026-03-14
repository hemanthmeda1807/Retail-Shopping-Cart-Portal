import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import './CartDrawer.css';

export default function CartDrawer({ onClose }) {
  const { items, removeItem, updateQty, clearCart, getTotal } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [placing, setPlacing] = useState(false);

  const subtotal = items.reduce((s, i) => s + i.product.cost * i.qty + (i.addons || []).reduce((a, ad) => a + ad.price * i.qty, 0), 0);
  const tax = items.reduce((s, i) => s + (i.product.cost + (i.addons || []).reduce((a, ad) => a + ad.price, 0)) * i.qty * (i.product.tax_percent || 0) / 100, 0);
  const grandTotal = subtotal + tax;

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to place an order');
      navigate('/login');
      onClose();
      return;
    }
    setPlacing(true);
    try {
      const payload = {
        items: items.map((i) => ({
          product_id: i.product._id,
          qty: i.qty,
          addons: i.addons,
        })),
        delivery_address: address,
      };
      await api.post('/orders', payload);
      clearCart();
      onClose();
      toast.success('Order placed! 🎉 Check your email for confirmation.');
      navigate('/orders');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Order failed. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} id="cart-drawer-overlay">
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()} id="cart-drawer">
        <div className="cart-header">
          <h2>Your Cart 🛒</h2>
          <button className="modal-close" onClick={onClose} id="cart-close">✕</button>
        </div>

        {items.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🛒</div>
            <h3>Cart is empty</h3>
            <p>Add some delicious items from the menu!</p>
            <button className="btn btn-primary" onClick={onClose}>Browse Menu</button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map((item, idx) => (
                <div key={idx} className="cart-item">
                  <img
                    src={item.product.image_url || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=100'}
                    alt={item.product.title}
                  />
                  <div className="cart-item-info">
                    <h4>{item.product.title}</h4>
                    {item.addons?.length > 0 && (
                      <p className="cart-addons">+ {item.addons.map((a) => a.name).join(', ')}</p>
                    )}
                    <div className="cart-item-price">
                      ₹{item.lineTotal?.toFixed(0) || (item.product.cost * item.qty).toFixed(0)}
                    </div>
                  </div>
                  <div className="cart-qty">
                    <button onClick={() => updateQty(item.product._id, item.addons, item.qty - 1)}>−</button>
                    <span>{item.qty}</span>
                    <button onClick={() => updateQty(item.product._id, item.addons, item.qty + 1)}>+</button>
                  </div>
                  <button className="remove-btn" onClick={() => removeItem(item.product._id, item.addons)} title="Remove">✕</button>
                </div>
              ))}
            </div>

            <div className="cart-footer">
              {/* Price Breakdown */}
              <div className="cart-breakdown">
                <div className="cart-breakdown-row">
                  <span>Subtotal ({items.reduce((s, i) => s + i.qty, 0)} items)</span>
                  <span>₹{subtotal.toFixed(0)}</span>
                </div>
                {tax > 0 && (
                  <div className="cart-breakdown-row">
                    <span>GST</span>
                    <span>₹{tax.toFixed(0)}</span>
                  </div>
                )}
                <div className="cart-breakdown-row grand">
                  <span>Grand Total</span>
                  <span>₹{grandTotal.toFixed(0)}</span>
                </div>
              </div>

              {/* Address */}
              <div className="cart-address input-group">
                <label>Delivery Address (optional)</label>
                <input
                  className="input"
                  placeholder="Enter your delivery address..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  id="delivery-address"
                />
              </div>

              <button
                className="btn btn-primary btn-lg btn-full"
                onClick={handleCheckout}
                disabled={placing}
                id="place-order-btn"
              >
                {placing ? (
                  <><span className="spinner-sm" /> Placing Order...</>
                ) : (
                  `Place Order · ₹${grandTotal.toFixed(0)}`
                )}
              </button>
              <button className="btn btn-ghost btn-sm btn-full" onClick={clearCart}>Clear Cart</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
