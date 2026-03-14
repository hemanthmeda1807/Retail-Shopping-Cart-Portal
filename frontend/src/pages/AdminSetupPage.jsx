import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import './Auth.css';

export default function AdminSetupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', apiKey: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.apiKey.trim()) {
      setError('API Key is required to create an admin account.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post(
        '/auth/admin/signup',
        { name: form.name, email: form.email, password: form.password },
        { headers: { 'X-API-Key': form.apiKey } }
      );
      setSuccess(`Admin account created for ${data.data.user.email}! Logging you in...`);
      setAuth(data.data.user, data.data.token);
      setTimeout(() => navigate('/admin'), 1500);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed. Check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Subtle "private" page indicator */}
      <div style={{
        position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(255,199,44,0.1)', border: '1px solid rgba(255,199,44,0.25)',
        borderRadius: 99, padding: '5px 16px', fontSize: 12, fontWeight: 700,
        color: 'var(--accent)', letterSpacing: '0.06em', whiteSpace: 'nowrap',
      }}>
        🔐 RESTRICTED — Admin Setup
      </div>

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-icon">⚙️</div>
            <h1>Admin <span>Setup</span></h1>
          </div>
          <p className="auth-subtitle">
            Create a new <strong>admin account</strong>. Requires the server API key.
          </p>

          {error && <div className="auth-error">⚠️ {error}</div>}

          {success && (
            <div style={{
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
              borderRadius: 'var(--radius)', padding: '12px 14px', fontSize: 14,
              color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 4,
            }}>
              ✅ {success}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit} id="admin-setup-form">
            <div className="input-group">
              <label>🔑 API Key</label>
              <input
                type="password"
                className="input"
                placeholder="Enter server API key from .env"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                required
                id="admin-api-key"
              />
            </div>

            <div className="divider" />

            <div className="input-group">
              <label>Full Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Riser Admin"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                id="admin-name"
              />
            </div>
            <div className="input-group">
              <label>Email</label>
              <input
                type="email"
                className="input"
                placeholder="admin@yourcompany.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                id="admin-email"
              />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                className="input"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
                id="admin-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-accent btn-full auth-submit"
              disabled={loading}
              id="admin-setup-submit"
            >
              {loading
                ? <><span className="spinner-sm" /> Creating Admin...</>
                : '⚙️ Create Admin Account'}
            </button>
          </form>

          <div className="auth-divider">or</div>
          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            The API key is defined in <code style={{ background: 'var(--dark-4)', padding: '1px 6px', borderRadius: 4 }}>backend/.env</code> → <code style={{ background: 'var(--dark-4)', padding: '1px 6px', borderRadius: 4 }}>API_KEY</code>
          </p>
        </div>
      </div>
    </div>
  );
}
