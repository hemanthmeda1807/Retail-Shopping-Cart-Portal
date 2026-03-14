const mongoose = require('mongoose');
const dns = require('dns');

// Force public DNS — local ISP DNS often blocks MongoDB SRV record lookups
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const connectDB = async (retries = 0) => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    const delay = Math.min(5000 * (retries + 1), 30000);
    console.log(`🔄 Retrying in ${delay / 1000}s... (attempt ${retries + 1})`);
    setTimeout(() => connectDB(retries + 1), delay);
  }
};

module.exports = connectDB;
