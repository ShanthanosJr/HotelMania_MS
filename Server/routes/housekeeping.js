const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const ServiceRequest = require('../models/ServiceRequest');
const { protect, authorize } = require('../middleware/auth');
const { blockingFilter } = require('../utils/bookingService');
const { audit } = require('../utils/audit');
const { hotelToday, addDays } = require('../utils/dates');
const router = express.Router();
router.param('id', require('../middleware/sanitize').validateId);

router.use(protect, authorize('admin', 'receptionist', 'housekeeping'));

/**
 * GET /api/housekeeping/board?hotel=
 * Every room with its cleaning status, who is in it, and whether someone arrives or leaves today.
 */
router.get('/board', async (req, res) => {
  const filter = {};
  if (req.query.hotel) {
    if (!mongoose.isValidObjectId(req.query.hotel)) return res.status(400).json({ message: 'Invalid hotel' });
    filter.hotel = req.query.hotel;
  }
  const today = hotelToday();
  const tomorrow = addDays(today, 1);
  const rooms = await Room.find(filter).populate('type', 'name').populate('hotel', 'name').lean();
  const ids = rooms.map(r => r._id);
  const [inHouse, arriving, requests] = await Promise.all([
    Booking.find({ room: { $in: ids }, status: 'checked_in' }).select('room checkOutDate guestDetails.name user guests').populate('user', 'name').lean(),
    Booking.find({ ...blockingFilter(), room: { $in: ids }, status: { $in: ['pending', 'confirmed'] }, checkInDate: { $gte: today, $lt: tomorrow } })
      .select('room guestDetails.name guestDetails.arrivalTime user').populate('user', 'name').lean(),
    ServiceRequest.find({ room: { $in: ids }, status: { $ne: 'completed' } }).select('room type status notes createdAt').sort({ createdAt: 1 }).lean(),
  ]);
  const by = (list) => list.reduce((m, x) => m.set(String(x.room), [...(m.get(String(x.room)) || []), x]), new Map());
  const inHouseBy = by(inHouse);
  const arrivingBy = by(arriving);
  const requestsBy = by(requests);
  const name = (b) => (b.guestDetails && b.guestDetails.name) || (b.user && b.user.name) || 'Guest';

  const data = rooms
    .sort((a, b) => String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true }))
    .map(r => {
      const stay = (inHouseBy.get(String(r._id)) || [])[0];
      const arrival = (arrivingBy.get(String(r._id)) || [])[0];
      return {
        _id: r._id,
        roomNumber: r.roomNumber,
        status: r.status,
        type: r.type,
        hotel: r.hotel,
        guest: stay ? { name: name(stay), guests: stay.guests, checkOutDate: stay.checkOutDate, departsToday: stay.checkOutDate <= today } : null,
        arrival: arrival ? { name: name(arrival), arrivalTime: arrival.guestDetails && arrival.guestDetails.arrivalTime } : null,
        requests: (requestsBy.get(String(r._id)) || []).map(q => ({ _id: q._id, type: q.type, status: q.status, notes: q.notes, createdAt: q.createdAt })),
      };
    });
  const counts = data.reduce((c, r) => ({ ...c, [r.status]: (c[r.status] || 0) + 1 }), {});
  res.json({ success: true, data: { date: today, rooms: data, counts, openRequests: requests.length } });
});

/**
 * PATCH /api/housekeeping/rooms/:id { status: available | dirty | maintenance }
 * "occupied" follows check-in/check-out and can't be set by hand.
 */
router.patch('/rooms/:id', async (req, res) => {
  const { status } = req.body;
  if (!['available', 'dirty', 'maintenance'].includes(status)) {
    return res.status(400).json({ message: 'Status must be clean (available), dirty or maintenance' });
  }
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ message: 'Room not found' });
  if (room.currentBooking) {
    return res.status(409).json({ message: `A guest is checked in to room ${room.roomNumber}. Use a service request for in-stay cleaning.` });
  }
  const from = room.status;
  room.status = status;
  await room.save();
  audit(req.user, 'room.status', { entity: 'room', entityId: room._id, summary: `Room ${room.roomNumber}: ${from} → ${status}` });
  res.json({ success: true, data: room });
});

module.exports = router;
