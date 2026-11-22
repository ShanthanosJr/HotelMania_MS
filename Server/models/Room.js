const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: [true, 'Room number is required'],
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
  // Bumped inside booking transactions so concurrent bookings of the same room conflict
  bookingVersion: {
    type: Number,
    default: 0,
  },
  currentBooking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
  },
}, {
  timestamps: true,
});

// Room numbers are unique within a hotel (two hotels can both have a room 101)
roomSchema.index({ hotel: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ type: 1 });

module.exports = mongoose.model('Room', roomSchema);