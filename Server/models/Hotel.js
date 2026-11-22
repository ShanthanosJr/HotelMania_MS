const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Hotel name is required'],
    trim: true,
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  amenities: [{
    type: String,
    trim: true,
  }],
  photos: [{
    type: String, // URL to image
    trim: true,
  }],
  contactInfo: {
    phone: String,
    email: String,
    website: String,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Room types belonging to this hotel (resolved by RoomType.hotel)
hotelSchema.virtual('roomTypes', {
  ref: 'RoomType',
  localField: '_id',
  foreignField: 'hotel',
});

module.exports = mongoose.model('Hotel', hotelSchema);