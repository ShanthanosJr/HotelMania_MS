/**
 * Server-side pricing. Every price a guest sees or pays comes from here.
 *
 * Charges are configurable in .env (percentages):
 *   SERVICE_CHARGE_PERCENT  e.g. 10  (Sri Lankan hotels usually add 10%)
 *   TAX_PERCENT             e.g. 18  (applied to room charge + service charge)
 * Both default to 0 so prices stay exactly the room rate until the business sets them.
 */

const percent = (name) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 && value < 100 ? value : 0;
};

const round2 = (n) => Math.round(n * 100) / 100;

const pricingConfig = () => ({
  serviceChargePercent: percent('SERVICE_CHARGE_PERCENT'),
  taxPercent: percent('TAX_PERCENT'),
  currency: process.env.PAYHERE_CURRENCY || 'LKR',
});

/**
 * Price breakdown for a stay in a room type.
 * @returns {{ nightlyRate, nights, subtotal, serviceChargePercent, serviceCharge, taxPercent, tax, total, currency }}
 */
const quote = (roomType, nights) => {
  const nightlyRate = roomType && roomType.basePrice;
  if (typeof nightlyRate !== 'number' || nightlyRate < 0) {
    const err = new Error('Room has no price configured');
    err.status = 400;
    throw err;
  }
  const { serviceChargePercent, taxPercent, currency } = pricingConfig();
  const subtotal = round2(nightlyRate * nights);
  const serviceCharge = round2(subtotal * serviceChargePercent / 100);
  const tax = round2((subtotal + serviceCharge) * taxPercent / 100);
  return {
    nightlyRate,
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
