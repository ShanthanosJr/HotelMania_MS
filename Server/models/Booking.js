const crypto = require('crypto');
const mongoose = require('mongoose');

// No 0/O or 1/I so codes are easy to read out over the phone
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newConfirmationCode = () =>
  'HM-' + Array.from({ length: 6 }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join('');

const pricingSchema = new mongoose.Schema({
  nightlyRate: Number,
  nights: Number,
  subtotal: Number,
  serviceChargePercent: Number,
  serviceCharge: Number,
  taxPercent: Number,
  tax: Number,
  total: Number,
  currency: String,
}, { _id: false });

const guestDetailsSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 100 },
  email: { type: String, trim: true, lowercase: true, maxlength: 200 },
  phone: { type: String, trim: true, maxlength: 30 },
  arrivalTime: { type: String, trim: true, maxlength: 20 },
  specialRequests: { type: String, trim: true, maxlength: 1000 },
}, { _id: false });

const refundSchema = new mongoose.Schema({
  // due = owed to the guest after a paid booking was cancelled; completed = paid back
  status: { type: String, enum: ['due', 'completed'] },
  amount: { type: Number, min: 0 },
  reference: { type: String, trim: true, maxlength: 100 },
  note: { type: String, trim: true, maxlength: 500 },
  requestedAt: Date,
  completedAt: Date,
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  // Short reference shown to guests, on receipts and in emails (e.g. HM-7Q4K2X)
  confirmationCode: {
    type: String,
    default: newConfirmationCode,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
  },
  // The physical room. Online bookings are assigned one automatically; staff can move guests.
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Room is required'],
  },
  guests: {
    type: Number,
    min: 1,
    default: 1,
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
  // Breakdown of totalPrice (absent for legacy bookings or manual price overrides)
  pricing: pricingSchema,
  guestDetails: guestDetailsSchema,
  status: {
    type: String,
    enum: {
      values: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'],
      message: 'Status must be either pending, confirmed, checked_in, checked_out, or cancelled'
    },
    default: 'pending',
  },
  cancelledAt: Date,
  // Online bookings hold the room only until this time unless paid
  holdExpiresAt: {
    type: Date,
  },
  paymentStatus: {
    type: String,
    enum: {
      values: ['pending', 'paid', 'refunded'],
      message: 'Payment status must be either pending, paid, or refunded'
    },
    default: 'pending',
  },
  refund: refundSchema,
}, {
  timestamps: true,
});

bookingSchema.index({ room: 1, checkInDate: 1, checkOutDate: 1 });
bookingSchema.index({ user: 1 });
bookingSchema.index({ confirmationCode: 1 }, { unique: true, sparse: true });

bookingSchema.statics.newConfirmationCode = newConfirmationCode;

module.exports = mongoose.model('Booking', bookingSchema);
