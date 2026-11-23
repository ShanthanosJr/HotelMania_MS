const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const RoomType = require('../models/RoomType');
const { quote } = require('./pricing');
const { getPricingConfig } = require('./settings');
const { loadOverrides, nightlyRates, restrictionFor } = require('./rates');

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_NIGHTS = 30;
const BLOCKING_STATUSES = ['pending', 'confirmed', 'checked_in'];
const HOLD_MINUTES = Number(process.env.BOOKING_HOLD_MINUTES || 30);

/**
 * Filter for bookings that currently occupy a room's calendar:
 * active statuses, excluding unpaid online holds that have expired.
 */
const blockingFilter = () => ({
  status: { $in: BLOCKING_STATUSES },
  $or: [
    { holdExpiresAt: { $exists: false } },
    { holdExpiresAt: null },
    { holdExpiresAt: { $gt: new Date() } },
    { paymentStatus: 'paid' },
  ],
});

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
    ...blockingFilter(),
    room: roomId,
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

/**
 * Server-side price breakdown for a stay in this room's type, using saved charges and the
 * rate calendar. With enforce (guest bookings), closed nights and minimum stays are refused;
 * front desk can still book them.
 */
const quoteFor = async (room, stay, { enforce = false } = {}) => {
  const type = room.type;
  const [config, overrides] = await Promise.all([
    getPricingConfig(),
    loadOverrides([type._id], stay.checkInDate, stay.checkOutDate),
  ]);
  if (enforce) {
    const reason = restrictionFor(type, stay, overrides);
    if (reason) throw new HttpError(409, reason);
  }
  try {
    return quote(type, stay.nights, config, nightlyRates(type, stay, overrides));
  } catch (err) {
    throw new HttpError(err.status || 400, err.message);
  }
};

/** Rooms of a type that are bookable for the whole stay (not under maintenance, no overlapping booking). */
const findFreeRooms = async (roomTypeId, checkInDate, checkOutDate) => {
  const rooms = await Room.find({ type: roomTypeId, status: { $ne: 'maintenance' } }).select('_id roomNumber').lean();
  if (rooms.length === 0) return [];
  const busy = await Booking.find({
    ...blockingFilter(),
    room: { $in: rooms.map(r => r._id) },
    checkInDate: { $lt: checkOutDate },
    checkOutDate: { $gt: checkInDate },
  }).distinct('room');
  const busyIds = new Set(busy.map(String));
  return rooms
    .filter(r => !busyIds.has(String(r._id)))
    .sort((a, b) => String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true }));
};

/**
 * Books any free room of a room type. Tries each candidate under its own room lock, so two
 * guests racing for the same type end up in different rooms, or the loser gets a clean 409.
 * `create(session, room)` must create and return the booking.
 */
const bookAnyRoomOfType = async (roomTypeId, stay, create) => {
  const candidates = await findFreeRooms(roomTypeId, stay.checkInDate, stay.checkOutDate);
  for (const candidate of candidates) {
    try {
      return await withRoomLock(candidate._id, async (session, room) => {
        if (room.status === 'maintenance') throw new HttpError(409, 'Room unavailable');
        const overlap = await findOverlap(room._id, stay.checkInDate, stay.checkOutDate, null, session);
        if (overlap) throw new HttpError(409, 'Room unavailable');
        return create(session, room);
      });
    } catch (err) {
      // Someone took this room a moment ago: try the next one
      if (err instanceof HttpError && err.status === 409) continue;
      throw err;
    }
  }
  throw new HttpError(409, 'Sorry, this room type is sold out for the selected dates');
};

/**
 * Availability and price for every room type (optionally one hotel / one type) for a stay.
 */
const availability = async ({ checkInDate, checkOutDate, nights, guests = 1, hotel, roomType }) => {
  const filter = {};
  if (hotel) filter.hotel = hotel;
  if (roomType) filter._id = roomType;
  const types = await RoomType.find(filter).populate('hotel', 'name address photos rating').lean();
  if (types.length === 0) return [];

  const rooms = await Room.find({ type: { $in: types.map(t => t._id) }, status: { $ne: 'maintenance' } }).select('_id type').lean();
  const busy = new Set((await Booking.find({
    ...blockingFilter(),
    room: { $in: rooms.map(r => r._id) },
    checkInDate: { $lt: checkOutDate },
    checkOutDate: { $gt: checkInDate },
  }).distinct('room')).map(String));

  const freeByType = {};
  const totalByType = {};
  for (const r of rooms) {
    const key = String(r.type);
    totalByType[key] = (totalByType[key] || 0) + 1;
    if (!busy.has(String(r._id))) freeByType[key] = (freeByType[key] || 0) + 1;
  }

  const [config, overrides] = await Promise.all([
    getPricingConfig(),
    loadOverrides(types.map(t => t._id), checkInDate, checkOutDate),
  ]);
  const stay = { checkInDate, checkOutDate, nights };

  return types.map(t => {
    let price = null;
    try { price = quote(t, nights, config, nightlyRates(t, stay, overrides)); } catch { /* type without a price is shown as unavailable */ }
    const restriction = restrictionFor(t, stay, overrides);
    const available = price && !restriction ? (freeByType[String(t._id)] || 0) : 0;
    return {
      roomType: t,
      totalRooms: totalByType[String(t._id)] || 0,
      available,
      fitsGuests: guests <= (t.maxOccupancy || 1),
      quote: price,
      restriction: restriction || undefined,
    };
  });
};

/**
 * Applies a cancellation to a booking document (not saved). A paid booking gets a refund
 * marked as due so it shows up for staff until someone pays it back.
 */
const applyCancellation = (booking) => {
  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  booking.holdExpiresAt = undefined;
  if (booking.paymentStatus === 'paid' && !(booking.refund && booking.refund.status)) {
    booking.refund = { status: 'due', amount: booking.totalPrice, requestedAt: new Date() };
  }
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
        { path: 'type', select: 'name basePrice maxOccupancy photos hotel bedType size view', populate: { path: 'hotel', select: 'name address' } },
        { path: 'hotel', select: 'name address contactInfo' },
      ],
    });

module.exports = {
  HttpError,
  BLOCKING_STATUSES,
  HOLD_MINUTES,
  blockingFilter,
  parseStay,
  findOverlap,
  withRoomLock,
  quoteFor,
  findFreeRooms,
  bookAnyRoomOfType,
  availability,
  applyCancellation,
  syncRoomStatus,
  populateBooking,
};
