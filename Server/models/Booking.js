const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Room is required'],
  },
  checkInDate: {
    type: Date,
    required: [true, 'Check-in date is required'],
  },
  checkOutDate: {
    type: Date,
    required: [true, 'Check-out date is required'],
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: 0,
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'],
      message: 'Status must be either pending, confirmed, checked_in, checked_out, or cancelled'
    },
    default: 'pending',
  },
  paymentStatus: {
    type: String,
    enum: {
      values: ['pending', 'paid', 'refunded'],
      message: 'Payment status must be either pending, paid, or refunded'
    },
    default: 'pending',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Booking', bookingSchema);