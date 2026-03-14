import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import './Auth.css';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🍔</div>
        <h1 className="auth-title">Forgot Password?</h1>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>📬</div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
              If an account with <strong style={{ color: 'var(--text-primary)' }}>{email}</strong> exists,
              we've sent a password reset link. Check your inbox (and spam folder).
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
              The link expires in <strong>1 hour</strong>.
            </p>
            <Link to="/login" className="btn btn-primary btn-full">← Back to Login</Link>
          </div>
        ) : (
          <>
            <p className="auth-subtitle">
              Enter your registered email and we'll send you a reset link.
            </p>
            {error && <div className="auth-error">⚠️ {error}</div>}
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="input-group">
                <label htmlFor="forgot-email">Email Address</label>
                <input
                  id="forgot-email"
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loading}
                id="forgot-submit"
              >
                {loading ? <span className="spinner-sm" /> : '📨 Send Reset Link'}
              </button>
            </form>
            <p className="auth-footer">
              Remembered it? <Link to="/login">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
