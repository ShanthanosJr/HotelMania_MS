const mongoose = require('mongoose');

/** A message sent from the public Contact form. Staff handle these from Admin → Enquiries. */
const TOPICS = ['general', 'reservation', 'events', 'dining', 'spa', 'feedback'];
const STATUSES = ['new', 'in_progress', 'closed'];

const enquirySchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    maxlength: 200,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
  },
  phone: { type: String, trim: true, maxlength: 40 },
  topic: { type: String, enum: { values: TOPICS, message: 'Please choose a topic' }, default: 'general' },
  checkIn: Date,
  checkOut: Date,
  guests: { type: Number, min: 1, max: 50 },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    minlength: [10, 'Message should be at least 10 characters'],
    maxlength: [2000, 'Message cannot exceed 2000 characters'],
  },
  status: { type: String, enum: STATUSES, default: 'new' },
  staffNote: { type: String, trim: true, maxlength: 1000 },
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

enquirySchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Enquiry', enquirySchema);
module.exports.TOPICS = TOPICS;
module.exports.STATUSES = STATUSES;
