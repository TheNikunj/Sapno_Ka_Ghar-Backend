const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  home: { type: mongoose.Schema.Types.ObjectId, ref: 'Home', required: true },
  actorName: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { 
    type: Date, 
    default: Date.now,
    expires: 86400 // Index automatically drops this document after exactly 24 hours
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
