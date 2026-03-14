# Database Migration & Seeding Steps

## Prerequisites
- MongoDB running (local or Atlas URI in `backend/.env`)
- Node.js 18+ installed

## Step 1: Configure `.env`

```bash
cd backend
cp .env.example .env
# Edit .env and set:
# MONGO_URI=mongodb://localhost:27017/riser   (local)
# or
# MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/riser   (Atlas)
```

## Step 2: Run the Seeder

```bash
cd backend
node seed.js
# or
npm run seed
```

The seeder will:
1. ✅ Clear existing `users`, `categories`, `products` collections
2. ✅ Create **Admin** user: `admin@riser.com` / `Admin@1234`
3. ✅ Create **Regular user**: `john@example.com` / `User@1234`
4. ✅ Insert **5 categories**: Burgers, Pizza, Cold Drinks, Sides & Breads, Desserts
5. ✅ Insert **12 products** across all categories with real images

## Step 3: Verify in MongoDB Compass (optional)

Connect to `mongodb://localhost:27017/riser` and check:
- `users` → 2 documents
- `categories` → 5 documents
- `products` → 12 documents

## MongoDB Atlas Setup (Cloud)

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a free M0 cluster
3. Network Access → Add `0.0.0.0/0` (for dev) or specific IPs
4. Database Access → Create user with read/write role
5. Connect → get URI → paste into `backend/.env` as `MONGO_URI`

## Resetting Data

To re-seed fresh data, simply run `npm run seed` again — it clears all data before re-inserting.

> ⚠️ **Warning**: Running the seeder in production will delete all existing data. This is for development/staging only.
