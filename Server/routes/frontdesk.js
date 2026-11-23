const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const { protect, authorize } = require('../middleware/auth');
const {
  HttpError, blockingFilter, findOverlap, withRoomLock, syncRoomStatus, populateBooking,
} = require('../utils/bookingService');
const { audit } = require('../utils/audit');
const { hotelToday, parseDay, addDays } = require('../utils/dates');
const router = express.Router();
router.param('id', require('../middleware/sanitize').validateId);

router.use(protect, authorize('admin', 'receptionist'));

const sendError = (res, error, fallback) => {
  if (error instanceof HttpError) return res.status(error.status).json({ message: error.message });
  if (error.name === 'ValidationError') return res.status(400).json({ message: Object.values(error.errors).map(e => e.message).join(', ') });
  console.error(fallback, error);
  return res.status(500).json({ message: fallback });
};

const roomFilterFor = async (hotel) => {
  if (!hotel) return {};
  if (!mongoose.isValidObjectId(hotel)) throw new HttpError(400, 'Invalid hotel');
  const ids = await Room.find({ hotel }).distinct('_id');
  return { room: { $in: ids } };
};

/**
 * GET /api/frontdesk/today?date=YYYY-MM-DD&hotel=
 * Arrivals (due in today), departures (due out today or overdue) and guests in house.
 */
router.get('/today', async (req, res) => {
  try {
    const today = parseDay(req.query.date, hotelToday());
    const scope = await roomFilterFor(req.query.hotel);
    const [arrivals, inHouse] = await Promise.all([
      populateBooking(Booking.find({
        ...scope,
        ...blockingFilter(),
        status: { $in: ['pending', 'confirmed'] },
        checkInDate: { $lte: today }, // includes late arrivals from yesterday who haven't checked in
        checkOutDate: { $gt: today },
      }).sort({ checkInDate: 1 })),
      populateBooking(Booking.find({ ...scope, status: 'checked_in' }).sort({ checkOutDate: 1 })),
    ]);
    const departures = inHouse.filter(b => b.checkOutDate <= today);
    res.json({
      success: true,
      data: {
        date: today,
        arrivals,
        departures,
        inHouse,
        counts: { arrivals: arrivals.length, departures: departures.length, inHouse: inHouse.length },
      },
    });
  } catch (error) {
    sendError(res, error, 'Could not load today');
  }
});

/** GET /api/frontdesk/:id/rooms: rooms this booking could be moved into for its dates. */
router.get('/:id/rooms', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate({ path: 'room', select: 'hotel type' });
    if (!booking) throw new HttpError(404, 'Booking not found');
    const rooms = await Room.find({ hotel: booking.room.hotel }).populate('type', 'name maxOccupancy').lean();
    const busy = new Set((await Booking.find({
      ...blockingFilter(),
      _id: { $ne: booking._id },
      room: { $in: rooms.map(r => r._id) },
      checkInDate: { $lt: booking.checkOutDate },
      checkOutDate: { $gt: booking.checkInDate },
    }).distinct('room')).map(String));
    const data = rooms
      .filter(r => !busy.has(String(r._id)) && r.status !== 'maintenance')
      .map(r => ({
        _id: r._id,
        roomNumber: r.roomNumber,
        status: r.status,
        type: r.type,
        sameType: String(r.type && r.type._id) === String(booking.room.type),
        current: String(r._id) === String(booking.room._id),
      }))
      .sort((a, b) => Number(b.sameType) - Number(a.sameType) || String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true }));
    res.json({ success: true, data });
  } catch (error) {
    sendError(res, error, 'Could not load rooms');
  }
});

/**
 * POST /api/frontdesk/:id/check-in  { room?, allowUnpaid?, allowDirty? }
 * Optionally assigns a different room. Refuses unpaid bookings and rooms not yet cleaned
 * unless the receptionist confirmed that specific warning.
 */
router.post('/:id/check-in', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw new HttpError(404, 'Booking not found');
    if (!['pending', 'confirmed'].includes(booking.status)) {
      throw new HttpError(400, `This booking is ${booking.status.replace('_', ' ')} and cannot be checked in`);
    }
    const today = hotelToday();
    if (booking.checkInDate > today) throw new HttpError(400, `This guest arrives on ${booking.checkInDate.toISOString().slice(0, 10)}`);
    if (booking.checkOutDate <= today) throw new HttpError(400, 'This stay has already ended');
    const allowUnpaid = req.body.allowUnpaid === true;
    const allowDirty = req.body.allowDirty === true;
    if (booking.paymentStatus !== 'paid' && !allowUnpaid) {
      throw Object.assign(new HttpError(409, `Payment of ${booking.totalPrice} is outstanding`), { code: 'UNPAID' });
    }

    const targetId = req.body.room || booking.room;
    if (req.body.room && !mongoose.isValidObjectId(req.body.room)) throw new HttpError(400, 'Invalid room');
    const previousRoom = booking.room;

    const updated = await withRoomLock(targetId, async (session, room) => {
      if (room.status === 'maintenance') throw new HttpError(409, `Room ${room.roomNumber} is under maintenance`);
      if (room.status === 'dirty' && !allowDirty) {
        throw Object.assign(new HttpError(409, `Room ${room.roomNumber} has not been cleaned yet`), { code: 'DIRTY' });
      }
      if (room.currentBooking && !room.currentBooking.equals(booking._id)) {
        throw new HttpError(409, `Room ${room.roomNumber} is still occupied`);
      }
      const overlap = await findOverlap(room._id, booking.checkInDate, booking.checkOutDate, booking._id, session);
      if (overlap) throw new HttpError(409, `Room ${room.roomNumber} is booked by someone else for these dates`);
      const doc = await Booking.findById(booking._id).session(session);
      doc.room = room._id;
      doc.status = 'checked_in';
      doc.holdExpiresAt = undefined;
      await doc.save({ session });
      return doc;
    });

    if (!previousRoom.equals(updated.room)) await syncRoomStatus({ _id: updated._id, room: previousRoom, status: 'moved' });
    await syncRoomStatus(updated);
    const populated = await populateBooking(Booking.findById(updated._id));
    audit(req.user, 'booking.check_in', {
      entity: 'booking', entityId: updated._id,
      summary: `${updated.confirmationCode} · ${(populated.guestDetails && populated.guestDetails.name) || (populated.user && populated.user.name) || 'Guest'} → room ${populated.room.roomNumber}${updated.paymentStatus !== 'paid' ? ' · unpaid' : ''}`,
    });
    res.json({ success: true, data: populated, message: `Checked in to room ${populated.room.roomNumber}` });
  } catch (error) {
    if (error.code && error instanceof HttpError) return res.status(error.status).json({ message: error.message, code: error.code });
    sendError(res, error, 'Could not check in');
  }
});

/** POST /api/frontdesk/:id/check-out { force? }: refuses an unpaid balance unless forced. Room becomes dirty. */
router.post('/:id/check-out', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw new HttpError(404, 'Booking not found');
    if (booking.status !== 'checked_in') throw new HttpError(400, 'Only guests who are checked in can be checked out');
    if (booking.paymentStatus !== 'paid' && req.body.force !== true) {
      return res.status(409).json({ message: `Balance of ${booking.totalPrice} is unpaid`, code: 'UNPAID' });
    }
    booking.status = 'checked_out';
    await booking.save();
    await syncRoomStatus(booking);
    await Room.updateOne({ _id: booking.room }, { status: 'dirty' });
    const populated = await populateBooking(Booking.findById(booking._id));
    audit(req.user, 'booking.check_out', {
      entity: 'booking', entityId: booking._id,
      summary: `${booking.confirmationCode} · room ${populated.room.roomNumber} now dirty${booking.paymentStatus !== 'paid' ? ' · left unpaid' : ''}`,
    });
    res.json({ success: true, data: populated, message: `Checked out. Room ${populated.room.roomNumber} is marked for cleaning.` });
  } catch (error) {
    sendError(res, error, 'Could not check out');
  }
});

/**
 * GET /api/frontdesk/calendar?from=YYYY-MM-DD&days=14&hotel=
 * Tape chart: every room, and the bookings that touch the window.
 */
router.get('/calendar', async (req, res) => {
  try {
    const from = parseDay(req.query.from, addDays(hotelToday(), -1));
    const days = Math.min(62, Math.max(1, parseInt(req.query.days, 10) || 14));
    const to = addDays(from, days);
    const roomFilter = {};
    if (req.query.hotel) {
      if (!mongoose.isValidObjectId(req.query.hotel)) throw new HttpError(400, 'Invalid hotel');
      roomFilter.hotel = req.query.hotel;
    }
    const rooms = await Room.find(roomFilter).populate('type', 'name').populate('hotel', 'name').lean();
    rooms.sort((a, b) => String(a.hotel && a.hotel.name).localeCompare(String(b.hotel && b.hotel.name))
      || String(a.type && a.type.name).localeCompare(String(b.type && b.type.name))
      || String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true }));

    const now = new Date();
    const bookings = await Booking.find({
      room: { $in: rooms.map(r => r._id) },
      status: { $in: ['pending', 'confirmed', 'checked_in', 'checked_out'] },
      checkInDate: { $lt: to },
      checkOutDate: { $gt: from },
    }).select('confirmationCode room checkInDate checkOutDate status paymentStatus holdExpiresAt guests guestDetails.name user totalPrice')
      .populate('user', 'name').lean();

    const visible = bookings.filter(b => !(b.status === 'pending' && b.paymentStatus !== 'paid' && b.holdExpiresAt && b.holdExpiresAt <= now));
    res.json({
      success: true,
      data: {
        from, days,
        rooms: rooms.map(r => ({ _id: r._id, roomNumber: r.roomNumber, status: r.status, type: r.type, hotel: r.hotel })),
        bookings: visible.map(b => ({
          _id: b._id,
          code: b.confirmationCode,
          room: b.room,
          checkInDate: b.checkInDate,
          checkOutDate: b.checkOutDate,
          status: b.status,
          paymentStatus: b.paymentStatus,
          guests: b.guests,
          totalPrice: b.totalPrice,
          guest: (b.guestDetails && b.guestDetails.name) || (b.user && b.user.name) || 'Guest',
        })),
      },
    });
  } catch (error) {
    sendError(res, error, 'Could not load the calendar');
  }
});

module.exports = router;
