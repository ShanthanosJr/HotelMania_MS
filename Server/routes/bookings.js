const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const { protect, admin, authorize } = require('../middleware/auth');
const {
  HttpError,
  parseStay,
  findOverlap,
  withRoomLock,
  priceFor,
  syncRoomStatus,
  HOLD_MINUTES,
  populateBooking,
} = require('../utils/bookingService');
const router = express.Router();
router.param('id', require('../middleware/sanitize').validateId);

const frontDesk = authorize('admin', 'receptionist');

const sendError = (res, error, fallback) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ message: error.message });
  }
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({ message: messages.join(', ') });
  }
  if (error instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: `Invalid ${error.path}` });
  }
  console.error(fallback, error);
  res.status(500).json({ message: fallback });
};

// All bookings — front desk only (contains guest contact details)
router.get('/', protect, frontDesk, async (req, res) => {
  const bookings = await populateBooking(Booking.find({}).sort({ createdAt: -1 }));
  res.status(200).json({ success: true, data: bookings });
});

// Current user's bookings
router.get('/my-bookings', protect, async (req, res) => {
  const bookings = await populateBooking(Booking.find({ user: req.user._id }).sort({ checkInDate: -1 }));
  res.status(200).json({ success: true, data: bookings });
});

// Booking by ID (owner or staff)
router.get('/:id', protect, async (req, res) => {
  const booking = await populateBooking(Booking.findById(req.params.id));
  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' });
  }
  const ownerId = booking.user && booking.user._id;
  const isOwner = ownerId && ownerId.equals(req.user._id);
  if (!isOwner && !['admin', 'receptionist'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  res.status(200).json({ success: true, data: booking });
});

// Create booking. Price is always computed on the server.
router.post('/', protect, async (req, res) => {
  try {
    const staffUser = ['admin', 'receptionist'].includes(req.user.role);
    const { room: roomId, checkInDate, checkOutDate } = req.body;
    if (!roomId) throw new HttpError(400, 'Room is required');
    if (!mongoose.isValidObjectId(roomId)) throw new HttpError(400, 'Invalid room');

    const stay = parseStay(checkInDate, checkOutDate, { allowPast: staffUser });
    const guests = Math.max(1, parseInt(req.body.guests, 10) || 1);

    // Front desk may book on behalf of a guest and set the initial state
    const bookingUser = staffUser && req.body.user ? req.body.user : req.user._id;
    const status = staffUser && req.body.status ? req.body.status : 'pending';
    const paymentStatus = staffUser && req.body.paymentStatus ? req.body.paymentStatus : 'pending';

    const booking = await withRoomLock(roomId, async (session, room) => {
      if (room.status === 'maintenance') throw new HttpError(400, 'This room is under maintenance');
      if (room.type && room.type.maxOccupancy && guests > room.type.maxOccupancy) {
        throw new HttpError(400, `This room allows up to ${room.type.maxOccupancy} guests`);
      }

      const overlap = await findOverlap(room._id, stay.checkInDate, stay.checkOutDate, null, session);
      if (overlap) throw new HttpError(409, 'Room is already booked for the selected dates');

      const [created] = await Booking.create([{
        user: bookingUser,
        room: room._id,
        checkInDate: stay.checkInDate,
        checkOutDate: stay.checkOutDate,
        guests,
        totalPrice: priceFor(room, stay.nights),
        status,
        paymentStatus,
        // Guests' online bookings hold the room until paid; front-desk bookings don't expire
        ...(staffUser ? {} : { holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60 * 1000) }),
      }], { session });
      return created;
    });

    if (booking.status === 'checked_in') await syncRoomStatus(booking);

    const populated = await populateBooking(Booking.findById(booking._id));
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    sendError(res, error, 'Server error during booking creation');
  }
});

// Guest (or front desk) cancels a booking
router.patch('/:id/cancel', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw new HttpError(404, 'Booking not found');

    const staffUser = ['admin', 'receptionist'].includes(req.user.role);
    if (!booking.user.equals(req.user._id) && !staffUser) throw new HttpError(403, 'Access denied');

    if (!['pending', 'confirmed'].includes(booking.status)) {
      throw new HttpError(400, `A ${booking.status.replace('_', ' ')} booking cannot be cancelled`);
    }
    if (!staffUser && booking.checkInDate.getTime() <= Date.now()) {
      throw new HttpError(400, 'Bookings can only be cancelled before the check-in date. Please contact the front desk.');
    }

    booking.status = 'cancelled';
    await booking.save();
    await syncRoomStatus(booking);

    const populated = await populateBooking(Booking.findById(booking._id));
    res.status(200).json({
      success: true,
      data: populated,
      message: booking.paymentStatus === 'paid'
        ? 'Booking cancelled. Our team will process your refund.'
        : 'Booking cancelled.',
    });
  } catch (error) {
    sendError(res, error, 'Server error during booking cancellation');
  }
});

const UPDATABLE = ['room', 'checkInDate', 'checkOutDate', 'guests', 'status', 'paymentStatus', 'totalPrice'];

// Update booking (front desk)
router.put('/:id', protect, frontDesk, async (req, res) => {
  try {
    const existing = await Booking.findById(req.params.id);
    if (!existing) throw new HttpError(404, 'Booking not found');

    const body = {};
    for (const key of UPDATABLE) {
      if (req.body[key] !== undefined && req.body[key] !== '') body[key] = req.body[key];
    }

    const roomId = body.room || existing.room;
    const stayChanged = body.room || body.checkInDate || body.checkOutDate;
    const reactivated = body.status && body.status !== 'cancelled' && existing.status === 'cancelled';
    const previousRoom = existing.room;

    const updated = await withRoomLock(roomId, async (session, room) => {
      const doc = await Booking.findById(existing._id).session(session);
      const stay = parseStay(body.checkInDate || doc.checkInDate, body.checkOutDate || doc.checkOutDate, { allowPast: true });

      const finalStatus = body.status || doc.status;
      if ((stayChanged || reactivated) && finalStatus !== 'cancelled') {
        const overlap = await findOverlap(room._id, stay.checkInDate, stay.checkOutDate, doc._id, session);
        if (overlap) throw new HttpError(409, 'Room is already booked for the selected dates');
      }

      doc.room = room._id;
      doc.checkInDate = stay.checkInDate;
      doc.checkOutDate = stay.checkOutDate;
      if (body.guests) doc.guests = body.guests;
      if (body.status) doc.status = body.status;
      if (body.paymentStatus) doc.paymentStatus = body.paymentStatus;

      if (body.totalPrice !== undefined) {
        const price = Number(body.totalPrice);
        if (!Number.isFinite(price) || price < 0) throw new HttpError(400, 'Invalid total price');
        doc.totalPrice = price;  // manual override (e.g. discount)
      } else if (stayChanged) {
        doc.totalPrice = priceFor(room, stay.nights);
      }

      await doc.save({ session });
      return doc;
    });

    // Release the old room if the guest was moved
    if (!previousRoom.equals(updated.room)) {
      await syncRoomStatus({ _id: updated._id, room: previousRoom, status: 'moved' });
    }
    await syncRoomStatus(updated);

    const populated = await populateBooking(Booking.findById(updated._id));
    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    sendError(res, error, 'Server error during booking update');
  }
});

// Delete booking (admin)
router.delete('/:id', protect, admin, async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' });
  }

  await Booking.findByIdAndDelete(req.params.id);
  // Only frees the room if this booking was the one occupying it
  await syncRoomStatus({ _id: booking._id, room: booking.room, status: 'deleted' });

  res.status(200).json({ success: true, message: 'Booking deleted successfully' });
});

module.exports = router;
