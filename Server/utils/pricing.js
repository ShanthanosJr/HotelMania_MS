/**
 * Server-side pricing. Every price a guest sees or pays comes from here.
 *
 * Service charge and tax come from Admin → Rates & Settings, falling back to .env:
 *   SERVICE_CHARGE_PERCENT  e.g. 10  (Sri Lankan hotels usually add 10%)
 *   TAX_PERCENT             e.g. 18  (applied to room charge + service charge)
 * Nightly prices are the room type's base price unless the rate calendar sets a price
 * for that night (see utils/rates.js).
 */

const percent = (name) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 && value < 100 ? value : 0;
};

const round2 = (n) => Math.round(n * 100) / 100;

/** .env-only config (used when no saved settings are passed in). */
const pricingConfig = () => ({
  serviceChargePercent: percent('SERVICE_CHARGE_PERCENT'),
  taxPercent: percent('TAX_PERCENT'),
  currency: process.env.PAYHERE_CURRENCY || 'LKR',
});

/**
 * Price breakdown for a stay in a room type.
 * @param roomType   needs basePrice
 * @param nights     number of nights
 * @param config     { serviceChargePercent, taxPercent, currency } (defaults to .env)
 * @param nightly    optional price for each night (rate calendar); defaults to basePrice
 * @returns {{ nightlyRate, nights, subtotal, serviceChargePercent, serviceCharge, taxPercent, tax, total, currency }}
 */
const quote = (roomType, nights, config = pricingConfig(), nightly) => {
  const base = roomType && roomType.basePrice;
  if (typeof base !== 'number' || base < 0) {
    const err = new Error('Room has no price configured');
    err.status = 400;
    throw err;
  }
  const rates = Array.isArray(nightly) && nightly.length === nights ? nightly : Array(nights).fill(base);
  const { serviceChargePercent, taxPercent, currency } = config;
  const subtotal = round2(rates.reduce((s, r) => s + r, 0));
  const serviceCharge = round2(subtotal * serviceChargePercent / 100);
  const tax = round2((subtotal + serviceCharge) * taxPercent / 100);
  return {
    // Average per night when the rate calendar varies prices across the stay
    nightlyRate: round2(subtotal / nights),
    nights,
    subtotal,
    serviceChargePercent,
    serviceCharge,
    taxPercent,
    tax,
    total: round2(subtotal + serviceCharge + tax),
    currency,
  };
};

module.exports = { quote, pricingConfig, round2 };
