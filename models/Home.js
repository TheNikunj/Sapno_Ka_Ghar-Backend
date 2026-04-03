const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Light, Fan, AC
  type: { type: String, required: true }, // light, fan, ac
  isOn: { type: Boolean, default: false }
});

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Bedroom, Hall
  devices: [deviceSchema]
});

const homeSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  houseName: { type: String, required: true },
  uniqueHomeName: { type: String, required: true, unique: true },
  homeCode: { type: String, required: true }, // 4-digit code
  rooms: [roomSchema],
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'approved', 'blocked'], default: 'pending' },
    role: { type: String, enum: ['member', 'admin'], default: 'member' }
  }]
});

module.exports = mongoose.model('Home', homeSchema);
