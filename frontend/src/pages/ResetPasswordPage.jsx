import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import './Auth.css';

export default function ResetPasswordPage() {
  const { token }              = useParams();
  const navigate               = useNavigate();
  const [password, setPassword]= useState('');
  const [confirm, setConfirm]  = useState('');
  const [showPw, setShowPw]    = useState(false);
  const [loading, setLoading]  = useState(false);
  const [done, setDone]        = useState(false);
  const [error, setError]      = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Reset link is invalid or expired.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🔑</div>
        <h1 className="auth-title">Reset Password</h1>

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
            <p style={{ color: 'var(--success)', fontWeight: 700, fontSize: 16, marginBottom: 10 }}>Password updated!</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Redirecting you to login in 3 seconds…</p>
            <Link to="/login" className="btn btn-primary btn-full" style={{ marginTop: 20 }}>Go to Login</Link>
          </div>
        ) : (
          <>
            <p className="auth-subtitle">Choose a new password for your account.</p>
            {error && <div className="auth-error">⚠️ {error}</div>}
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="input-group">
                <label htmlFor="reset-password">New Password</label>
                <div className="password-wrap">
                  <input
                    id="reset-password"
                    className="input"
                    type={showPw ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                  />
                  <button type="button" className="eye-toggle" onClick={() => setShowPw(v => !v)}>
                    {showPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div className="input-group">
                <label htmlFor="reset-confirm">Confirm Password</label>
                <div className="password-wrap">
                  <input
                    id="reset-confirm"
                    className="input"
                    type={showPw ? 'text' : 'password'}
                    placeholder="Same as above"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading} id="reset-submit">
                {loading ? <span className="spinner-sm" /> : '🔑 Set New Password'}
              </button>
            </form>
            <p className="auth-footer"><Link to="/login">← Back to Login</Link></p>
          </>
        )}
      </div>
    </div>
  );
}
