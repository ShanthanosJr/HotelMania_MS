const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: [true, 'Room number is required'],
    unique: true,
    trim: true,
  },
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: [true, 'Hotel is required'],
  },
  type: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RoomType',
    required: [true, 'Room type is required'],
  },
  status: {
    type: String,
    enum: {
      values: ['available', 'occupied', 'maintenance', 'dirty'],
      message: 'Status must be either available, occupied, maintenance, or dirty'
    },
    default: 'available',
  },
  currentBooking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Room', roomSchema);