const Setting = require('../models/Setting');

const envPercent = (name) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 && value < 100 ? value : 0;
};

/** Settings saved by staff win; anything not set falls back to .env. */
const getSettings = async () => {
  const doc = await Setting.findOne({ key: 'global' }).lean();
  const pick = (field, fallback) => (doc && typeof doc[field] === 'number' ? doc[field] : fallback);
  return {
    serviceChargePercent: pick('serviceChargePercent', envPercent('SERVICE_CHARGE_PERCENT')),
    taxPercent: pick('taxPercent', envPercent('TAX_PERCENT')),
    holdMinutes: pick('holdMinutes', Number(process.env.BOOKING_HOLD_MINUTES) || 30),
    currency: process.env.PAYHERE_CURRENCY || 'LKR',
    updatedAt: doc ? doc.updatedAt : undefined,
  };
};

/** What prices are built from: charges and currency. */
const getPricingConfig = async () => {
  const { serviceChargePercent, taxPercent, currency } = await getSettings();
  return { serviceChargePercent, taxPercent, currency };
};

module.exports = { getSettings, getPricingConfig };
