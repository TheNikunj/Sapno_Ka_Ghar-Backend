const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Owner', 'Member'], default: 'Owner' },
  isVerified: { type: Boolean, default: false }, // Admin verifies owners, Owners verify members
  isBlocked: { type: Boolean, default: false } // System block flag
});

module.exports = mongoose.model('User', userSchema);
