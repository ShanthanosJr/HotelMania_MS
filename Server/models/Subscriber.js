const mongoose = require('mongoose');

/** Newsletter sign-ups from the site footer. */
const subscriberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 200,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
  },
  source: { type: String, trim: true, maxlength: 40, default: 'footer' },
}, { timestamps: true });

module.exports = mongoose.model('Subscriber', subscriberSchema);
