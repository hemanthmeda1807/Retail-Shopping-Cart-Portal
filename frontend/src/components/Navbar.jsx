import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import './Navbar.css';

export default function Navbar({ onCartOpen }) {
  const itemCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.qty, 0));
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    setDropOpen(false);
    navigate('/');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <nav className="navbar">
      <div className="container nav-inner">
        {/* Logo */}
        <Link to="/" className="nav-logo">
          <div className="nav-logo-icon">🍔</div>
          <span className="nav-logo-text">Ri<span>ser</span></span>
        </Link>

        {/* Actions */}
        <div className="nav-actions">
          {isAuthenticated && user?.role === 'admin' && (
            <Link
              to="/admin"
              className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
            >
              ⚙️ <span className="admin-badge">Admin</span>
            </Link>
          )}

          {isAuthenticated ? (
            <div className="user-dropdown-wrap" ref={dropRef}>
              <button className="nav-user-btn" onClick={() => setDropOpen((v) => !v)}>
                <div className="nav-avatar">{initials}</div>
                <span className="nav-username">{user?.name?.split(' ')[0]}</span>
                <span>{dropOpen ? '▲' : '▼'}</span>
              </button>
              {dropOpen && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <strong>{user?.name}</strong>
                    <p>{user?.email}</p>
                  </div>
                  <button
                    className="dropdown-item"
                    onClick={() => { setDropOpen(false); navigate('/orders'); }}
                  >
                    📦 My Orders
                  </button>
                  {user?.role === 'admin' && (
                    <button
                      className="dropdown-item"
                      onClick={() => { setDropOpen(false); navigate('/admin'); }}
                    >
                      ⚙️ Admin Dashboard
                    </button>
                  )}
                  <div className="dropdown-divider" />
                  <button className="dropdown-item danger" onClick={handleLogout}>
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/signup" className="btn btn-primary btn-sm">Sign Up</Link>
            </>
          )}

          {/* Cart */}
          <button className="nav-cart-btn" onClick={onCartOpen} id="cart-btn">
            🛒
            <span>Cart</span>
            {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
          </button>
        </div>
      </div>
    </nav>
  );
}
