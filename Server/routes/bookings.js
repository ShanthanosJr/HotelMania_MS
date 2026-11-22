const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');
const RoomType = require('../models/RoomType');
const { protect, admin, authorize } = require('../middleware/auth');
const {
  HttpError,
  parseStay,
  findOverlap,
  withRoomLock,
  quoteFor,
  bookAnyRoomOfType,
  applyCancellation,
  syncRoomStatus,
  HOLD_MINUTES,
  populateBooking,
} = require('../utils/bookingService');
const { sendBookingEmail } = require('../utils/mailer');
const router = express.Router();
router.param('id', require('../middleware/sanitize').validateId);

const frontDesk = authorize('admin', 'receptionist');
const isFrontDesk = (user) => ['admin', 'receptionist'].includes(user.role);

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

const str = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : undefined);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Contact details for the stay. Falls back to the account's own details. */
const readGuestDetails = (body, accountUser) => {
  const input = body && typeof body.guestDetails === 'object' && body.guestDetails ? body.guestDetails : {};
  const details = {
    name: str(input.name, 100) || (accountUser && accountUser.name),
    email: (str(input.email, 200) || (accountUser && accountUser.email) || '').toLowerCase(),
    phone: str(input.phone, 30) || (accountUser && accountUser.phone) || undefined,
    arrivalTime: str(input.arrivalTime, 20) || undefined,
    specialRequests: str(input.specialRequests, 1000) || undefined,
  };
  if (!details.name) throw new HttpError(400, 'Guest name is required');
  if (!details.email || !EMAIL_RE.test(details.email)) throw new HttpError(400, 'A valid email address is required');
  return details;
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

// Booking by ID (owner or front desk)
router.get('/:id', protect, async (req, res) => {
  const booking = await populateBooking(Booking.findById(req.params.id));
  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' });
  }
  const ownerId = booking.user && booking.user._id;
  const isOwner = ownerId && ownerId.equals(req.user._id);
  if (!isOwner && !isFrontDesk(req.user)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  res.status(200).json({ success: true, data: booking });
});

/**
 * Create a booking. Price is always computed on the server.
 * Guests send { roomType, checkInDate, checkOutDate, guests, guestDetails } and the system
 * assigns a free room of that type. Front desk may instead send a specific { room },
 * book for another { user }, and set the initial status / payment status.
 */
router.post('/', protect, async (req, res) => {
  try {
    const staffUser = isFrontDesk(req.user);
    const { room: roomId, roomType: roomTypeId, checkInDate, checkOutDate } = req.body;
    if (!roomId && !roomTypeId) throw new HttpError(400, 'Please choose a room type');
    if (roomId && !mongoose.isValidObjectId(roomId)) throw new HttpError(400, 'Invalid room');
    if (roomTypeId && !mongoose.isValidObjectId(roomTypeId)) throw new HttpError(400, 'Invalid room type');

    const stay = parseStay(checkInDate, checkOutDate, { allowPast: staffUser });
    const guests = Math.max(1, parseInt(req.body.guests, 10) || 1);

    // Front desk may book on behalf of a guest and set the initial state
    let bookingUser = req.user;
    if (staffUser && req.body.user) {
      if (!mongoose.isValidObjectId(req.body.user)) throw new HttpError(400, 'Invalid guest');
      bookingUser = await require('../models/User').findById(req.body.user).select('name email phone');
      if (!bookingUser) throw new HttpError(404, 'Guest not found');
    }
    const guestDetails = readGuestDetails(req.body, bookingUser);
    const status = staffUser && req.body.status ? req.body.status : 'pending';
    const paymentStatus = staffUser && req.body.paymentStatus ? req.body.paymentStatus : 'pending';

    const create = async (session, room) => {
      if (room.status === 'maintenance') throw new HttpError(400, 'This room is under maintenance');
      if (room.type && room.type.maxOccupancy && guests > room.type.maxOccupancy) {
        throw new HttpError(400, `This room allows up to ${room.type.maxOccupancy} guests`);
      }
      const pricing = quoteFor(room, stay.nights);
      const [created] = await Booking.create([{
        user: bookingUser._id,
        room: room._id,
        checkInDate: stay.checkInDate,
        checkOutDate: stay.checkOutDate,
        guests,
        totalPrice: pricing.total,
        pricing,
        guestDetails,
        status,
        paymentStatus,
        // Guests' online bookings hold the room until paid; front-desk bookings don't expire
        ...(staffUser ? {} : { holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60 * 1000) }),
      }], { session });
      return created;
    };

    let booking;
    if (roomTypeId && !(staffUser && roomId)) {
      const type = await RoomType.findById(roomTypeId).select('maxOccupancy');
      if (!type) throw new HttpError(404, 'Room type not found');
      if (guests > type.maxOccupancy) throw new HttpError(400, `This room allows up to ${type.maxOccupancy} guests`);
      booking = await bookAnyRoomOfType(roomTypeId, stay, create);
    } else {
      booking = await withRoomLock(roomId, async (session, room) => {
        const overlap = await findOverlap(room._id, stay.checkInDate, stay.checkOutDate, null, session);
        if (overlap) throw new HttpError(409, 'Room is already booked for the selected dates');
        return create(session, room);
      });
    }

    if (booking.status === 'checked_in') await syncRoomStatus(booking);

    const populated = await populateBooking(Booking.findById(booking._id));
    if (staffUser && populated.status === 'confirmed') sendBookingEmail('confirmed', populated);
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

    const staffUser = isFrontDesk(req.user);
    if (!booking.user.equals(req.user._id) && !staffUser) throw new HttpError(403, 'Access denied');

    if (!['pending', 'confirmed'].includes(booking.status)) {
      throw new HttpError(400, `A ${booking.status.replace('_', ' ')} booking cannot be cancelled`);
    }
    if (!staffUser && booking.checkInDate.getTime() <= Date.now()) {
      throw new HttpError(400, 'Bookings can only be cancelled before the check-in date. Please contact the front desk.');
    }

    applyCancellation(booking);
    await booking.save();
    await syncRoomStatus(booking);

    const populated = await populateBooking(Booking.findById(booking._id));
    sendBookingEmail('cancelled', populated);
    res.status(200).json({
      success: true,
      data: populated,
      message: booking.refund && booking.refund.status === 'due'
        ? 'Booking cancelled. Your refund is being processed and we will email you when it is sent.'
        : 'Booking cancelled.',
    });
  } catch (error) {
    sendError(res, error, 'Server error during booking cancellation');
  }
});

/**
 * Record that a refund has been paid back to the guest (admin).
 * Body: { reference?, amount?, note? }. Amount defaults to the refund due.
 */
router.post('/:id/refund', protect, admin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw new HttpError(404, 'Booking not found');
    if (booking.paymentStatus !== 'paid') throw new HttpError(400, 'Only paid bookings can be refunded');
    if (booking.status !== 'cancelled') throw new HttpError(400, 'Cancel the booking before refunding it');

    const due = booking.refund && booking.refund.amount !== undefined ? booking.refund.amount : booking.totalPrice;
    let amount = due;
    if (req.body.amount !== undefined && req.body.amount !== '') {
      amount = Number(req.body.amount);
      if (!Number.isFinite(amount) || amount < 0 || amount > booking.totalPrice) {
        throw new HttpError(400, 'Refund amount must be between 0 and the amount paid');
      }
    }

    booking.refund = {
      ...(booking.refund ? booking.refund.toObject() : {}),
      status: 'completed',
      amount,
      reference: str(req.body.reference, 100),
      note: str(req.body.note, 500),
      requestedAt: (booking.refund && booking.refund.requestedAt) || new Date(),
      completedAt: new Date(),
      processedBy: req.user._id,
    };
    booking.paymentStatus = 'refunded';
    await booking.save();
    await Transaction.updateMany({ booking: booking._id, status: 'succeeded' }, { status: 'refunded' });

    const populated = await populateBooking(Booking.findById(booking._id));
    sendBookingEmail('refunded', populated);
    res.status(200).json({ success: true, data: populated, message: 'Refund recorded' });
  } catch (error) {
    sendError(res, error, 'Server error while recording the refund');
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
    const wasCancelled = existing.status === 'cancelled';

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
      if (body.paymentStatus) doc.paymentStatus = body.paymentStatus;
      if (body.status === 'cancelled' && !wasCancelled) {
        applyCancellation(doc);
      } else if (body.status) {
        doc.status = body.status;
        if (reactivated) doc.cancelledAt = undefined;
      }

      if (body.totalPrice !== undefined) {
        const price = Number(body.totalPrice);
        if (!Number.isFinite(price) || price < 0) throw new HttpError(400, 'Invalid total price');
        if (price !== doc.totalPrice) {
          doc.totalPrice = price;  // manual override (e.g. discount): the old breakdown no longer applies
          doc.pricing = undefined;
        }
      } else if (stayChanged) {
        const pricing = quoteFor(room, stay.nights);
        doc.pricing = pricing;
        doc.totalPrice = pricing.total;
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
    if (updated.status === 'cancelled' && !wasCancelled) sendBookingEmail('cancelled', populated);
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
