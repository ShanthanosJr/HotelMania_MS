const mongoose = require('mongoose');

/**
 * Hotel-wide settings edited from Admin → Rates & Settings. A single document (key "global").
 * Empty fields fall back to the .env defaults (SERVICE_CHARGE_PERCENT, TAX_PERCENT, BOOKING_HOLD_MINUTES).
 */
const settingSchema = new mongoose.Schema({
  key: { type: String, default: 'global', unique: true },
  serviceChargePercent: { type: Number, min: 0, max: 50 },
  taxPercent: { type: Number, min: 0, max: 50 },
  holdMinutes: { type: Number, min: 5, max: 240 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
