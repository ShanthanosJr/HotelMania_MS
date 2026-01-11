const mongoose = require('mongoose');

const serviceRequestSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Room is required'],
  },
  type: {
    type: String,
    enum: {
      values: ['cleaning', 'food', 'repair'],
      message: 'Service type must be either cleaning, food, or repair'
    },
    required: [true, 'Service type is required'],
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'in_progress', 'completed'],
      message: 'Status must be either pending, in_progress, or completed'
    },
    default: 'pending',
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);