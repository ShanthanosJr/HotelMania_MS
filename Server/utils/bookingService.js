const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Room = require('../models/Room');

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_NIGHTS = 30;
const BLOCKING_STATUSES = ['pending', 'confirmed', 'checked_in'];

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Accepts "YYYY-MM-DD" or ISO strings; normalises to UTC midnight
const toDay = (value, label) => {
  if (!value) throw new HttpError(400, `${label} is required`);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, `${label} is not a valid date`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

/**
 * Validates a stay and returns normalised dates + number of nights.
 * allowPast lets staff edit historical bookings.
 */
const parseStay = (checkIn, checkOut, { allowPast = false } = {}) => {
  const checkInDate = toDay(checkIn, 'Check-in date');
  const checkOutDate = toDay(checkOut, 'Check-out date');

  const nights = Math.round((checkOutDate - checkInDate) / DAY_MS);
  if (nights < 1) throw new HttpError(400, 'Check-out must be at least one day after check-in');
  if (nights > MAX_NIGHTS) throw new HttpError(400, `Bookings are limited to ${MAX_NIGHTS} nights`);

  if (!allowPast) {
    // One day of grace so guests in time zones ahead of UTC can book "today"
    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    if (checkInDate.getTime() < todayUtc - DAY_MS) {
      throw new HttpError(400, 'Check-in date cannot be in the past');
    }
  }

  return { checkInDate, checkOutDate, nights };
};

const findOverlap = (roomId, checkInDate, checkOutDate, excludeId, session) =>
  Booking.findOne({
    room: roomId,
    status: { $in: BLOCKING_STATUSES },
    checkInDate: { $lt: checkOutDate },
    checkOutDate: { $gt: checkInDate },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).session(session || null);

const isTransactionUnsupported = (err) =>
  err && (err.code === 20 || err.codeName === 'IllegalOperation' ||
    /Transaction numbers are only allowed/i.test(err.message || ''));

/**
 * Runs fn(session, room) while holding a write "lock" on the room document.
 * Two concurrent transactions touching the same room hit a write conflict; the
 * driver retries the loser, which then sees the winner's booking and fails cleanly.
 */
const withRoomLock = async (roomId, fn) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const room = await Room.findByIdAndUpdate(
        roomId,
        { $inc: { bookingVersion: 1 } },
        { new: true, session }
      ).populate({ path: 'type', options: { session } });
      if (!room) throw new HttpError(404, 'Room not found');
      result = await fn(session, room);
    });
    return result;
  } catch (err) {
    if (!isTransactionUnsupported(err)) throw err;
    // Standalone MongoDB (no replica set) — fall back without atomicity
    console.warn('MongoDB transactions unavailable; booking without a room lock. Use a replica set in production.');
    const room = await Room.findById(roomId).populate('type');
    if (!room) throw new HttpError(404, 'Room not found');
    return fn(null, room);
  } finally {
    await session.endSession();
  }
};

const priceFor = (room, nights) => {
  const basePrice = room.type && room.type.basePrice;
  if (typeof basePrice !== 'number') throw new HttpError(400, 'Room has no price configured');
  return Math.round(basePrice * nights * 100) / 100;
};

/** Keeps Room.status / currentBooking in line with a booking's lifecycle. */
const syncRoomStatus = async (booking) => {
  const room = await Room.findById(booking.room);
  if (!room) return;

  if (booking.status === 'checked_in') {
    room.status = 'occupied';
    room.currentBooking = booking._id;
    await room.save();
  } else if (room.currentBooking && room.currentBooking.equals(booking._id)) {
    // Booking left the "in house" state (checked out, cancelled, moved, deleted)
    room.currentBooking = undefined;
    if (room.status === 'occupied') room.status = 'available';
    await room.save();
  }
};

const populateBooking = (query) =>
  query
    .populate('user', 'name email phone userId')
    .populate({
      path: 'room',
      select: 'roomNumber type hotel status',
      populate: [
        { path: 'type', select: 'name basePrice maxOccupancy photos hotel', populate: { path: 'hotel', select: 'name address' } },
        { path: 'hotel', select: 'name address' },
      ],
    });

module.exports = {
  HttpError,
  BLOCKING_STATUSES,
  parseStay,
  findOverlap,
  withRoomLock,
  priceFor,
  syncRoomStatus,
  populateBooking,
};
