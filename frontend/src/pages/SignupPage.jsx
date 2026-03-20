import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import './Auth.css';

export default function SignupPage() {
  const [form, setForm]     = useState({ name: '', email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/google', { token: credentialResponse.credential });
      setAuth(data.data.user, data.data.token);
      toast.success(`Welcome, ${data.data.user.name}! 🍔`);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Google Sign Up failed.');
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', form);
      setAuth(data.data.user, data.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-icon">🍔</div>
            <h1>Ri<span>ser</span></h1>
          </div>
          <p className="auth-subtitle">
            <strong>Create your account</strong> and start ordering in seconds.
          </p>

          {error && (
            <div className="auth-error">
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google Sign Up Failed')}
              useOneTap
            />
          </div>
          <div className="auth-divider" style={{ textAlign: 'center', margin: '1rem 0', color: '#888', fontSize: '14px', position: 'relative' }}>
            <span style={{ background: '#1e1e1e', padding: '0 10px', position: 'relative', zIndex: 1 }}>or sign up with email</span>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.1)', zIndex: 0 }}></div>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} id="signup-form">
            <div className="input-group">
              <label>Full Name</label>
              <input
                type="text"
                className="input"
                placeholder="John Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                id="signup-name"
              />
            </div>
            <div className="input-group">
              <label>Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                id="signup-email"
              />
            </div>
            <div className="input-group">
              <label>Password</label>
              <div className="password-wrap">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                  id="signup-password"
                />
                <button
                  type="button"
                  className="eye-toggle"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-full auth-submit"
              disabled={loading}
              id="signup-submit"
            >
              {loading ? <><span className="spinner-sm" /> Creating account...</> : '🎉 Create Account'}
            </button>
          </form>

          <p className="auth-switch" style={{ marginTop: '1.5rem' }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
