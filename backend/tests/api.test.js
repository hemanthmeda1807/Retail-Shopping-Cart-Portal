// Set env vars BEFORE requiring server/models so mongoose uses in-memory URI
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
process.env.API_KEY = 'test_api_key';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let app;
let User;
let mongoServer;
let adminToken;
let userToken;
let categoryId;
let productId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();
  // Require app AFTER setting MONGO_URI so connectDB gets the in-memory URI
  app = require('../server');
  // Models must be required after app (they register with mongoose)
  User = require('../models/User');
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ── Auth Tests ──────────────────────────────────────────────
describe('POST /api/auth/signup', () => {
  it('201 — creates user', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'User',
      email: 'user@test.com',
      password: 'pass1234',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    userToken = res.body.data.token;
  });

  it('400 — duplicate email', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'User',
      email: 'user@test.com',
      password: 'pass1234',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('400 — missing name', async () => {
    const res = await request(app).post('/api/auth/signup').send({ email: 'a@b.com', password: 'pass1234' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    // Create admin
    const admin = await User.create({ name: 'Admin', email: 'admin@test.com', password_hash: 'Admin1234', role: 'admin' });
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'Admin1234' });
    adminToken = res.body.data.token;
  });

  it('200 — returns token', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'user@test.com', password: 'pass1234' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  it('401 — wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'user@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

// ── Category Tests ──────────────────────────────────────────
describe('POST /api/categories', () => {
  it('201 — admin creates category', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Burgers', description: 'Tasty burgers' });
    expect(res.status).toBe(201);
    categoryId = res.body.data._id;
  });

  it('403 — regular user denied', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Drinks' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

// ── Product Tests ───────────────────────────────────────────
describe('POST /api/products', () => {
  it('201 — admin creates product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Cheeseburger', cost: 99, category_id: categoryId, stock_qty: 50 });
    expect(res.status).toBe(201);
    productId = res.body.data._id;
  });

  it('403 — user cannot create product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Burger', cost: 99, category_id: categoryId });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/products', () => {
  it('200 — returns paginated list', async () => {
    const res = await request(app).get('/api/products?page=1&limit=10');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });
});

describe('GET /api/products/search', () => {
  it('200 — returns search results', async () => {
    const res = await request(app).get('/api/products/search?q=burger');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('PUT /api/products/:id/stock', () => {
  it('200 — admin updates stock', async () => {
    const res = await request(app)
      .put(`/api/products/${productId}/stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ change_qty: 10, reason: 'Restock' });
    expect(res.status).toBe(200);
    expect(res.body.data.new_stock).toBe(60);
  });

  it('400 — INSUFFICIENT_STOCK on negative result', async () => {
    const res = await request(app)
      .put(`/api/products/${productId}/stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ change_qty: -9999, reason: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
  });
});

// ── Order Tests ─────────────────────────────────────────────
describe('POST /api/orders', () => {
  it('201 — creates order & deducts stock', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ items: [{ product_id: productId, qty: 2 }] });
    expect(res.status).toBe(201);
    expect(res.body.data.total).toBeGreaterThan(0);
  });

  it('401 — guest cannot order', async () => {
    const res = await request(app).post('/api/orders').send({ items: [{ product_id: productId, qty: 1 }] });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/orders', () => {
  it('200 — returns user order history', async () => {
    const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── Stock Ledger Tests ───────────────────────────────────
describe('GET /api/stock/ledger', () => {
  it('200 — admin gets full ledger with entries', async () => {
    const res = await request(app)
      .get('/api/stock/ledger')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.summary).toBeDefined();
    // Should have at least the manual stock-update entry + order deduction entry
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('403 — regular user denied', async () => {
    const res = await request(app)
      .get('/api/stock/ledger')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('200 — ledger entry has snapshot_qty and source', async () => {
    const res = await request(app)
      .get('/api/stock/ledger')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const entry = res.body.data[0];
    expect(entry).toHaveProperty('snapshot_qty');
    expect(entry).toHaveProperty('source');
    expect(['initial', 'manual', 'edit', 'order', 'reorder']).toContain(entry.source);
  });

  it('200 — filter by source=manual returns only manual entries', async () => {
    const res = await request(app)
      .get('/api/stock/ledger?source=manual')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach(e => expect(e.source).toBe('manual'));
  });
});

describe('GET /api/products/:id/stock-history', () => {
  it('200 — admin gets per-product stock history', async () => {
    const res = await request(app)
      .get(`/api/products/${productId}/stock-history`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    // manual stock update + order should both appear
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
