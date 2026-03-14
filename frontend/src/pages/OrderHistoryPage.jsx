import { useState, useEffect } from 'react';
import api from '../api/axios';
import Breadcrumb from '../components/Breadcrumb';
import { useCartStore } from '../store/cartStore';
import toast from 'react-hot-toast';
import './OrderHistory.css';

const STATUS_COLORS = {
  pending: 'chip-yellow', confirmed: 'chip-green', preparing: 'chip-yellow',
  delivered: 'chip-green', cancelled: 'chip-red',
};
const STATUS_ICONS = {
  pending: '⏳', confirmed: '✅', preparing: '👨‍🍳', delivered: '🎉', cancelled: '❌',
};

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(null);
  const [expanded, setExpanded] = useState({});
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    api.get('/orders').then(({ data }) => {
      setOrders(data.data || []);
      setLoading(false);
      // Auto-expand the most recent order
      if (data.data?.length > 0) {
        setExpanded({ [data.data[0]._id]: true });
      }
    }).catch(() => setLoading(false));
  }, []);

  const handleReorder = async (orderId) => {
    setReordering(orderId);
    try {
      await api.post(`/orders/${orderId}/reorder`);
      toast.success('Reorder placed! 🎉');
      const { data } = await api.get('/orders');
      setOrders(data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Reorder failed');
    } finally {
      setReordering(null);
    }
  };

  const handleAddItemToCart = (item) => {
    // We only have item data (no full product object), so create a synthetic product
    const syntheticProduct = {
      _id: item.product_id,
      title: item.title,
      cost: item.unit_price,
      tax_percent: 0,
      image_url: '',
      stock_qty: 99,
      addons: [],
    };
    addItem(syntheticProduct, item.qty, item.addons || []);
    toast.success(`${item.title} added to cart!`, { icon: '🛒' });
  };

  const toggleExpand = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  if (loading) return <div className="page-loader"><div className="spinner" /><span>Loading orders...</span></div>;

  return (
    <div className="orders-page container">
      <Breadcrumb crumbs={[{ label: 'Home', to: '/' }, { label: 'My Orders' }]} />
      <h1 className="section-title">📦 My Orders</h1>

      {orders.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📦</div>
          <h3>No orders yet</h3>
          <p>Start ordering delicious food and it'll show up here!</p>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order._id} className="order-card card">
              {/* Header (clickable to expand) */}
              <div className="order-header" onClick={() => toggleExpand(order._id)}>
                <div>
                  <p className="order-id">#{order._id.slice(-8).toUpperCase()}</p>
                  <p className="order-date">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="order-header-right">
                  <span className={`chip ${STATUS_COLORS[order.status] || 'chip-yellow'}`}>
                    {STATUS_ICONS[order.status]} {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                  <span className="order-toggle">{expanded[order._id] ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Expanded body */}
              {expanded[order._id] && (
                <div className="order-body">
                  {order.items.map((item, i) => (
                    <div key={i} className="order-item-row">
                      <span className="oi-qty">{item.qty}×</span>
                      <span className="oi-name">{item.title}</span>
                      {item.addons?.length > 0 && (
                        <span className="oi-addons">(+{item.addons.map((a) => a.name).join(', ')})</span>
                      )}
                      <span className="oi-price">₹{(item.unit_price * item.qty).toFixed(0)}</span>
                      <button
                        className="oi-add-btn"
                        onClick={(e) => { e.stopPropagation(); handleAddItemToCart(item); }}
                        title="Add to cart"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                  {order.delivery_address && (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 10 }}>
                      📍 {order.delivery_address}
                    </p>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="order-footer">
                <div className="order-total">
                  Total <strong>₹{order.total?.toFixed(0)}</strong>
                </div>
                <div className="order-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleReorder(order._id)}
                    disabled={reordering === order._id}
                    id={`reorder-${order._id}`}
                  >
                    {reordering === order._id ? <><span className="spinner-sm" /> Reordering...</> : '↺ Reorder All'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
