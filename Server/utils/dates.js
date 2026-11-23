/**
 * Booking dates are stored as UTC midnight of the calendar date. "Today" must be the
 * hotel's calendar date, not the server's (HOTEL_TIMEZONE, default Asia/Colombo).
 */
const DAY_MS = 24 * 60 * 60 * 1000;

const hotelToday = (now = new Date()) => {
  const tz = process.env.HOTEL_TIMEZONE || 'Asia/Colombo';
  let ymd;
  try {
    ymd = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  } catch {
    ymd = now.toISOString().slice(0, 10);
  }
  return new Date(`${ymd}T00:00:00.000Z`);
};

/** Parses YYYY-MM-DD to UTC midnight, or returns the fallback. */
const parseDay = (value, fallback) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? fallback : d;
};

const addDays = (d, n) => new Date(d.getTime() + n * DAY_MS);
const ymd = (d) => d.toISOString().slice(0, 10);

module.exports = { DAY_MS, hotelToday, parseDay, addDays, ymd };
