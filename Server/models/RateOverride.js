const mongoose = require('mongoose');

/**
 * Per-night rules for a room type, set from the rate calendar.
 * price replaces the base price for that night; closed stops new bookings that include
 * that night; minStay is the minimum nights for stays that arrive on that date.
 */
const rateOverrideSchema = new mongoose.Schema({
  roomType: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType', required: true },
  date: { type: Date, required: true }, // UTC midnight
  price: { type: Number, min: 0 },
  closed: { type: Boolean, default: false },
  minStay: { type: Number, min: 1, max: 30 },
}, { timestamps: true });

rateOverrideSchema.index({ roomType: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('RateOverride', rateOverrideSchema);
