import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import CartDrawer from './components/CartDrawer';
import Home from './pages/Home';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminSetupPage from './pages/AdminSetupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { ProtectedRoute, GuestRoute } from './components/ProtectedRoute';

export default function App() {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <BrowserRouter>
      <Navbar onCartOpen={() => setCartOpen(true)} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/signup" element={<GuestRoute><SignupPage /></GuestRoute>} />
        <Route path="/orders" element={<ProtectedRoute><OrderHistoryPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/setup" element={<AdminSetupPage />} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="*" element={
          <div className="empty-state" style={{ minHeight: '60vh' }}>
            <div className="icon">🍔</div>
            <h3>Page not found</h3>
            <p>Looks like this page went missing.</p>
            <a href="/" className="btn btn-primary">Go Home</a>
          </div>
        } />
      </Routes>
      {cartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: '#1e1e1e', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' },
        }}
      />
    </BrowserRouter>
  );
}
