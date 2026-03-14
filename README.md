# 🍔 Riser — Retail Shopping Cart Portal

> A production-grade full-stack food e-commerce application featuring JWT authentication, role-based access control, a complete stock ledger, infinite scroll, and a rich admin dashboard — built with **Node.js + Express + MongoDB** on the backend and **React (Vite) + Zustand** on the frontend.

---

## 📋 Table of Contents

- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Features Overview](#-features-overview)
- [Frontend Features](#-frontend-features-in-detail)
- [Backend Features](#-backend-features-in-detail)
- [Stock History Ledger](#-stock-history-ledger)
- [Security Model](#-security-model)
- [API Reference](#-api-reference)
- [Response Format & Error Codes](#-response-format--error-codes)
- [Setup Instructions](#-setup-instructions)
- [Running Tests](#-running-tests)
- [Postman Collection](#-postman-collection)
- [CI/CD & Deployment](#-cicd--deployment)

---

## 🏗️ Architecture

```
riser-shopping-cart/
├── backend/
│   ├── config/         # MongoDB connection (dns4 resolver fix)
│   ├── middleware/     # JWT auth, RBAC (requireRole), API key guard
│   ├── models/         # Mongoose schemas: User, Product, Category, Order, StockHistory
│   ├── routes/         # auth, products, categories, orders, stock (ledger)
│   ├── utils/          # logStock helper, nodemailer email, multer upload
│   ├── tests/          # Jest + Supertest + MongoMemoryServer
│   └── seed.js         # Demo data seeder
└── frontend/
    └── src/
        ├── api/         # Axios instance (base URL from env)
        ├── components/  # Navbar, CartDrawer, ProductCard, AddOnModal,
        │                  FilterPanel, CategoryTabs, Breadcrumb, ProtectedRoute
        ├── pages/       # Home, Login, Signup, OrderHistory, AdminDashboard,
        │                  AdminSetup, ForgotPassword, ResetPassword
        └── store/       # Zustand slices: authStore, cartStore
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, React Router v6, Zustand, Axios |
| **Styling** | Vanilla CSS, CSS custom properties (design tokens) |
| **Backend** | Node.js, Express 4, Mongoose 8 |
| **Database** | MongoDB Atlas (NoSQL) |
| **Auth** | JWT (`jsonwebtoken`), bcryptjs password hashing |
| **Validation** | express-validator |
| **Security** | Helmet, CORS, API Key guard |
| **Email** | Nodemailer (SMTP / Gmail App Password) |
| **File Upload** | Multer (local `/uploads` directory) |
| **Testing** | Jest, Supertest, MongoMemoryServer (in-memory DB) |
| **Dev tooling** | Nodemon, ESLint |

---

## ✨ Features Overview

### Customer-Facing
- 🔍 Fuzzy full-text **product search** with debounced input
- 📂 **Category browsing** — sticky sidebar (desktop) & horizontal scroll pills (mobile)
- 🎠 **Horizontal category sliders** — one row per category with ‹ › arrow navigation in the "All Items" view
- ♾️ **Infinite scroll** in the All Items view; traditional **numbered pagination** in category view
- 🔽 **Filter panel** — sort by (newest / price asc/desc / name / stock), price range slider, in-stock toggle
- 🛒 **Cart drawer** — live subtotal, GST breakdown, grand total, delivery address, place order
- ➕ **Add-ons modal** — quantity selector, optional paid add-ons, real-time price breakdown
- 📦 **Order history** — expandable per-order cards, per-item "Add to Cart", Reorder All
- 👤 **Auth** — Signup, Login, Forgot Password (email link), Reset Password
- 📧 **Email confirmation** on every order (Nodemailer)

### Admin-Facing
- 🍔 **Products tab** — create/edit/delete products; image upload (file or URL); add-on builder; stock quantity
- 📂 **Categories tab** — create/delete categories with name, description, logo
- 📦 **Stock tab** — select product, enter ± change qty and reason; per-product history table
- 📒 **Stock Ledger tab** — full cross-product ledger with summary stats, filters, and pagination *(see below)*
- 👥 **Users tab** — view all registered users with roles and join date

---

## 🖥️ Frontend Features in Detail

### Home Page — Product Discovery
| Sub-feature | Detail |
|---|---|
| **Hero section** | Gradient banner with animated floating food emojis and a prominent search bar |
| **Category sidebar** | Sticky, scrollable list visible on screens ≥ 900px; hides on mobile |
| **Category pills** | Horizontal scrollable pill row on mobile; hides on desktop |
| **All Items view** | Products grouped by category; each category shows **one horizontal slider row** with left/right arrow buttons and CSS `scroll-snap` for smooth card-by-card navigation |
| **Category view** | Selecting a category switches to a full paginated grid (10 items per page) with numbered page buttons |
| **Infinite scroll** | In the All Items view, an `IntersectionObserver` sentinel triggers automatic next-page fetches as the user scrolls (12 items per fetch) |
| **Search** | 350ms debounce; hits `/products/search` with MongoDB `$text` index; falls back to regex on older collections |
| **Filter panel** | Sort options, price range inputs, in-stock checkbox; any active filter resets pagination cleanly |
| **Loading skeletons** | Skeleton cards shown while the initial fetch is in progress |
| **Empty states** | Contextual empty-state illustrations for no results and no items yet |

### Cart & Checkout
| Sub-feature | Detail |
|---|---|
| **CartDrawer** | Slides in as an overlay; lists all cart items with quantity controls and remove buttons |
| **Price breakdown** | Shows item subtotal, GST amount (derived from `tax_percent` per product), and grand total |
| **AddOnModal** | Opens per-product; lets the user pick optional add-ons (e.g. Extra Cheese) and adjust qty; updates price live |
| **Stock guard** | "Add to Cart" is disabled if `stock_qty === 0`; cart submit is blocked on the backend too |
| **Place Order** | Sends `POST /api/orders`; on success clears cart and shows a toast notification |

### Authentication
| Sub-feature | Detail |
|---|---|
| **Signup / Login** | Email + password; JWT returned on success and stored in Zustand + localStorage |
| **Forgot Password** | User enters email → backend sends a time-limited reset link via SMTP |
| **Reset Password** | Token from the email link is verified; new password is set |
| **Auto-redirect** | `ProtectedRoute` and `GuestRoute` HOC components guard routes; admins are redirected if they try to access user-only areas |

### Admin Dashboard
| Tab | Features |
|---|---|
| **Products** | Full CRUD table; inline image preview; dynamic add-ons builder (add/remove rows); real-time search within list |
| **Categories** | Card grid; create with name + description + logo URL; one-click delete with confirm |
| **Stock** | Dropdown product selector loads per-product history immediately; submit ± change qty with optional reason text |
| **Ledger** | See the [Stock History Ledger](#-stock-history-ledger) section below |
| **Users** | Full user list with avatar initials, email, role badge (admin/user), and join date |

---

## ⚙️ Backend Features in Detail

### Products
- Paginated listing with `minPrice`, `maxPrice`, `inStock`, and `sort` query params
- Full-text `$text` search endpoint with relevance scoring
- Image upload via Multer stored to `/uploads/`; URL also accepted
- Add-on and combo arrays embedded in the product document
- Dynamic `priceRange` aggregation returned alongside results for the filter slider UI

### Orders
- Server-side stock validation before any deduction (atomic per-product)
- Tax computation using per-product `tax_percent`
- Reorder endpoint — clones a past order, re-validates stock, deducts, creates new order
- Email confirmation dispatched asynchronously (non-blocking)

### Authentication & Security
- Passwords hashed with **bcryptjs** (salt rounds 12)
- JWT signed with `JWT_SECRET`; expires in `JWT_EXPIRES_IN` (default 7d)
- **RBAC middleware** (`requireRole('admin')`) returns `403 FORBIDDEN` for non-admins
- **API Key middleware** guards admin-signup and the `/api/health` route
- **Helmet** sets security headers; **CORS** restricted to `CLIENT_URL`
- **Morgan** request logging in development

### Email (Nodemailer)
- SMTP transport configured via `SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS`
- Sends HTML order-confirmation emails on `POST /api/orders` and `POST /api/orders/:id/reorder`
- Password reset emails contain a time-limited token link

---

## 📒 Stock History Ledger

Every stock mutation — regardless of *where* it happens — is automatically logged to a dedicated **`StockHistory`** MongoDB collection.

### What gets logged

| Event | Source Tag | Triggered By |
|---|---|---|
| Product created with stock | `initial` | Admin creates product via POST /api/products |
| Admin manually adjusts qty | `manual` | PUT /api/products/:id/stock |
| Admin edits product & changes qty | `edit` | PUT /api/products/:id |
| Customer places an order | `order` | POST /api/orders |
| Customer reorders a past order | `reorder` | POST /api/orders/:id/reorder |

### Schema fields

| Field | Type | Description |
|---|---|---|
| `product_id` | ObjectId → Product | Which product changed |
| `change_qty` | Number | `+` = stock added, `−` = stock removed |
| `snapshot_qty` | Number | Balance **after** this change |
| `reason` | String | Human-readable note (e.g. "Restock", "Order #abc123") |
| `source` | Enum | `initial` / `manual` / `edit` / `order` / `reorder` |
| `updated_by` | ObjectId → User | Admin who made the change (null for order-triggered events) |
| `order_id` | ObjectId → Order | Set for `order` and `reorder` sources |
| `createdAt` | Date | Auto-set timestamp |

### Admin Ledger UI

The **📒 Ledger** tab in the Admin Dashboard shows:
- **Summary cards** — Total Added, Total Deducted, Total Entries (filtered or global)
- **Filter bar** — filter by Product, Direction (In / Out), Source (initial / manual / edit / order / reorder)
- **Paginated table** — Product, Change (color-coded chip), Balance After, Source badge, Reason, Updated By, Date/Time
- **Prev / Next pagination**

### API

```
GET /api/stock/ledger               — full cross-product ledger (Admin JWT required)
GET /api/products/:id/stock-history — per-product history (Admin JWT required)
```

Query params for `/api/stock/ledger`:
`page`, `limit`, `product` (id), `direction` (in|out), `source` (initial|manual|edit|order|reorder), `from` (ISO date), `to` (ISO date)

---

## 🔐 Security Model

| Layer | Implementation |
|---|---|
| **JWT Tokens** | Issued on login, required in `Authorization: Bearer <token>` header |
| **RBAC** | `user` role for customers, `admin` role for managers |\
| **API Key** | `X-API-Key` header required for `/api/health` and admin signup |
| **Password Hashing** | bcryptjs with 12 salt rounds |
| **Helmet** | Sets `X-Content-Type-Options`, `X-Frame-Options`, CSP, HSTS headers |
| **CORS** | Restricted to `CLIENT_URL`; credentials allowed |

**Creating the first admin:**
```bash
POST /api/auth/admin/signup
X-API-Key: <your_api_key>
Content-Type: application/json

{ "name": "Admin", "email": "admin@riser.com", "password": "admin1234" }
```

---

## 📌 API Reference

### Authentication (`/api/auth`)

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/signup` | POST | None | Register new user |
| `/api/auth/login` | POST | None | Login, returns JWT |
| `/api/auth/forgot-password` | POST | None | Send password-reset email |
| `/api/auth/reset-password/:token` | POST | None | Reset password with token |
| `/api/auth/admin/signup` | POST | API Key | Create admin account |
| `/api/auth/admin/users` | GET | Admin JWT | List all users |
| `/api/auth/admin/users/:id` | DELETE | Admin JWT | Delete user |

### Categories (`/api/categories`)

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/categories` | GET | None | List all categories |
| `/api/categories` | POST | Admin | Create category |
| `/api/categories/:id` | GET | None | Get category by ID |
| `/api/categories/:id` | PUT | Admin | Update category |
| `/api/categories/:id` | DELETE | Admin | Delete category |
| `/api/categories/:id/products` | GET | None | Products in a category |

### Products (`/api/products`)

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/products` | GET | None | List products (paginated, filtered) |
| `/api/products` | POST | Admin | Create product (logs `initial` stock entry) |
| `/api/products/search` | GET | None | Full-text fuzzy search |
| `/api/products/:id` | GET | None | Get single product |
| `/api/products/:id` | PUT | Admin | Update product (logs `edit` entry if qty changes) |
| `/api/products/:id` | DELETE | Admin | Delete product |
| `/api/products/:id/stock` | PUT | Admin | Adjust stock ± (logs `manual` entry) |
| `/api/products/:id/stock-history` | GET | Admin | Per-product stock audit trail |

### Orders (`/api/orders`)

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/orders` | POST | User | Place order (logs `order` ledger entries) |
| `/api/orders` | GET | User | Get own order history |
| `/api/orders/:id` | GET | User | Get single order |
| `/api/orders/:id/reorder` | POST | User | Clone past order (logs `reorder` ledger entries) |

### Stock Ledger (`/api/stock`)

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/stock/ledger` | GET | Admin | Full cross-product ledger with summary stats |

### System

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/ping` | GET | None | Lightweight health check |
| `/api/health` | GET | API Key | Full health check (DB connection status) |

---

## 📊 Response Format & Error Codes

All API responses use a consistent envelope:

**Success:**
```json
{
  "success": true,
  "data": { "..." },
  "pagination": { "page": 1, "limit": 12, "total": 48, "pages": 4 }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Insufficient stock for \"Cheeseburger\". Available: 2"
  }
}
```

### Custom Error Codes

| Code | HTTP | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Missing/invalid request fields |
| `EMAIL_TAKEN` | 400 | Signup with already-registered email |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `UNAUTHORIZED` | 401 | Missing or expired JWT |
| `FORBIDDEN` | 403 | Valid JWT but insufficient role |
| `NOT_FOUND` | 404 | Route not found |
| `PRODUCT_NOT_FOUND` | 404 | Product ID not in DB |
| `CATEGORY_NOT_FOUND` | 404 | Category ID not in DB |
| `ORDER_NOT_FOUND` | 404 | Order ID not in DB |
| `INSUFFICIENT_STOCK` | 400 | Order qty exceeds available stock |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled server error |

---

## ⚙️ Setup Instructions

### Prerequisites
- Node.js ≥ 18
- MongoDB Atlas account (or local MongoDB ≥ 6)
- Gmail account (or any SMTP server) for email — optional but recommended

### 1. Clone and install

```bash
git clone https://github.com/K-JAYAVARDHANREDDY/Risers.git
cd Riser-Shopping-Cart

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment

**`backend/.env`**
```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/riser?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_key_change_in_prod
JWT_EXPIRES_IN=7d
API_KEY=your_api_key_here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
CLIENT_URL=http://localhost:5173
```

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Seed the database

```bash
cd backend
npm run seed
```

Creates demo categories (Burgers, Pizza, Cold Drinks, Breads, Sides, Desserts) and sample products with stock.

### 4. Run locally

```bash
# Terminal 1 — Backend (http://localhost:5000)
cd backend && npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend && npm run dev
```

---

## 🧪 Running Tests

Tests use **Jest + Supertest + MongoMemoryServer** — no real database needed.

```bash
cd backend
npm test
```

**Test coverage includes:**
- Auth: signup (success, duplicate email, missing fields), login (success, wrong password)
- Categories: admin create, user denied
- Products: admin create, user denied, paginated list, fuzzy search
- Stock: admin stock update, insufficient stock guard
- Orders: place order + stock deduction, guest denied, order history
- **Stock Ledger**: full ledger (admin access, user denied), `snapshot_qty` and `source` fields, `source` filter, per-product history

---

## 📬 Postman Collection

Import `Riser-Shopping-Cart.postman_collection.json` from the project root into Postman.

**Recommended flow:**
1. **Admin Signup** — sets `{{adminToken}}` environment variable
2. **User Signup** — sets `{{userToken}}`
3. **Create Category** → **Create Product** → **Update Stock**
4. **Place Order** (as user) → check **Ledger** (as admin)
5. Use **Collection Runner** to execute all requests in sequence

All requests include `pm.test()` assertions for status codes and response shapes.

---

## 🚀 CI/CD & Deployment

GitHub Actions pipeline defined in `.github/workflows/`.

| Service | Platform |
|---|---|
| **Backend API** | Railway / Render / Heroku — set all `backend/.env` vars in the platform dashboard |
| **Frontend SPA** | Vercel / Netlify — set `VITE_API_URL` to your deployed backend URL |
| **Database** | MongoDB Atlas (M0 free tier sufficient for development) |

---

