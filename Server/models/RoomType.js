const mongoose = require('mongoose');

const roomTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Room type name is required'],
    trim: true,
  },
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: [true, 'Hotel is required'],
  },
  basePrice: {
    type: Number,
    required: [true, 'Base price is required'],
    min: 0,
  },
  maxOccupancy: {
    type: Number,
    required: [true, 'Maximum occupancy is required'],
    min: 1,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
  },
  photos: [{
    type: String, // URL to image
    trim: true,
  }],
  amenities: [{
    type: String,
    trim: true,
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('RoomType', roomTypeSchema);