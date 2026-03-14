const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    role: { type: String, enum: ['guest', 'user', 'admin'], default: 'user' },
    resetPasswordToken:  { type: String, default: null },
    resetPasswordExpiry: { type: Date,   default: null },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password_hash')) return next();
  this.password_hash = await bcrypt.hash(this.password_hash, 12);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password_hash);
};

userSchema.methods.toSafeObject = function () {
  const { _id, name, email, role, createdAt } = this;
  return { _id, name, email, role, createdAt };
};

module.exports = mongoose.model('User', userSchema);
