const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
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
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    required: [true, 'Comment is required'],
  },
  date: {
    type: Date,
    default: Date.now,
  },
  // Staff can hide a review from the public website without deleting it
  hidden: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Review', reviewSchema);