const RateOverride = require('../models/RateOverride');

const DAY_MS = 24 * 60 * 60 * 1000;
const ymd = (d) => new Date(d).toISOString().slice(0, 10);

/** Overrides for these room types covering [checkIn, checkOut), as Map<typeId, Map<YYYY-MM-DD, override>>. */
const loadOverrides = async (typeIds, checkInDate, checkOutDate) => {
  const list = await RateOverride.find({
    roomType: { $in: typeIds },
    date: { $gte: checkInDate, $lt: checkOutDate },
  }).lean();
  const byType = new Map();
  for (const o of list) {
    const key = String(o.roomType);
    if (!byType.has(key)) byType.set(key, new Map());
    byType.get(key).set(ymd(o.date), o);
  }
  return byType;
};

const nightsOf = ({ checkInDate, nights }) =>
  Array.from({ length: nights }, (_, i) => ymd(new Date(checkInDate.getTime() + i * DAY_MS)));

/** Price for each night of the stay (override price, else base price). */
const nightlyRates = (roomType, stay, overrides) => {
  const map = overrides && overrides.get(String(roomType._id));
  return nightsOf(stay).map(day => {
    const o = map && map.get(day);
    return o && typeof o.price === 'number' ? o.price : roomType.basePrice;
  });
};

/** Why this stay can't be booked online (closed night, minimum stay), or null. */
const restrictionFor = (roomType, stay, overrides) => {
  const map = overrides && overrides.get(String(roomType._id));
  if (!map) return null;
  const closed = nightsOf(stay).find(day => map.get(day) && map.get(day).closed);
  if (closed) {
    return `Not available on ${new Date(`${closed}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`;
  }
  const arrival = map.get(ymd(stay.checkInDate));
  if (arrival && arrival.minStay && stay.nights < arrival.minStay) {
    return `Minimum stay of ${arrival.minStay} nights for this arrival date`;
  }
  return null;
};

module.exports = { loadOverrides, nightlyRates, restrictionFor, ymd, DAY_MS };
