require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/db');

const authRoutes     = require('./routes/auth');
const productRoutes  = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const orderRoutes    = require('./routes/orders');
const stockRoutes    = require('./routes/stock');

const app = express();

// Connect to MongoDB (skip in test — tests connect manually)
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// Security & Logging
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth',       authRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders',     orderRoutes);
app.use('/api/stock',      stockRoutes);

// Public ping (no auth)
app.get('/api/ping', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Health check — requires X-API-Key (showcases API key auth per requirements)
const apiKeyMiddleware = require('./middleware/apiKey');
app.get('/api/health', apiKeyMiddleware, (req, res) =>
  res.json({
    status: 'ok',
    timestamp: new Date(),
    db: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected',
    version: '1.0.0',
  })
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Something went wrong',
    },
  });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

module.exports = app;
