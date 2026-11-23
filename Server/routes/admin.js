const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const RoomType = require('../models/RoomType');
const RateOverride = require('../models/RateOverride');
const Setting = require('../models/Setting');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const Enquiry = require('../models/Enquiry');
const ServiceRequest = require('../models/ServiceRequest');
const { protect, authorize } = require('../middleware/auth');
const { getSettings } = require('../utils/settings');
const { audit } = require('../utils/audit');
const { round2 } = require('../utils/pricing');
const { DAY_MS, hotelToday, parseDay, addDays, ymd } = require('../utils/dates');
const router = express.Router();

const adminOnly = authorize('admin');
router.use(protect);

/* ------------------------------ Settings ------------------------------ */

router.get('/settings', adminOnly, async (req, res) => {
  res.json({ success: true, data: await getSettings() });
});

router.put('/settings', adminOnly, async (req, res) => {
  const update = { updatedBy: req.user._id };
  const unset = {};
  const fields = { serviceChargePercent: [0, 50], taxPercent: [0, 50], holdMinutes: [5, 240] };
  for (const [field, [min, max]] of Object.entries(fields)) {
    if (req.body[field] === undefined) continue;
    if (req.body[field] === null || req.body[field] === '') { unset[field] = 1; continue; }
    const v = Number(req.body[field]);
    if (!Number.isFinite(v) || v < min || v > max) {
      return res.status(400).json({ message: `${field} must be between ${min} and ${max}` });
    }
    update[field] = v;
  }
  const before = await getSettings();
  await Setting.findOneAndUpdate({ key: 'global' }, { $set: update, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { upsert: true, new: true });
  const after = await getSettings();
  const changed = Object.keys(fields).filter(f => before[f] !== after[f]).map(f => `${f} ${before[f]} → ${after[f]}`);
  if (changed.length) audit(req.user, 'settings.update', { entity: 'settings', summary: changed.join(', ') });
  res.json({ success: true, data: after });
});

/* ---------------------------- Rate calendar --------------------------- */

/** GET /api/admin/rates?roomType=&from=YYYY-MM-DD&days=42 */
router.get('/rates', adminOnly, async (req, res) => {
  if (!mongoose.isValidObjectId(req.query.roomType)) return res.status(400).json({ message: 'Choose a room type' });
  const type = await RoomType.findById(req.query.roomType).populate('hotel', 'name').lean();
  if (!type) return res.status(404).json({ message: 'Room type not found' });
  const from = parseDay(req.query.from, hotelToday());
  const days = Math.min(92, Math.max(1, parseInt(req.query.days, 10) || 42));
  const overrides = await RateOverride.find({ roomType: type._id, date: { $gte: from, $lt: addDays(from, days) } }).lean();
  const byDay = new Map(overrides.map(o => [ymd(o.date), o]));
  const data = Array.from({ length: days }, (_, i) => {
    const date = ymd(addDays(from, i));
    const o = byDay.get(date);
    return {
      date,
      price: o && typeof o.price === 'number' ? o.price : type.basePrice,
      custom: !!(o && typeof o.price === 'number'),
      closed: !!(o && o.closed),
      minStay: (o && o.minStay) || null,
    };
  });
  res.json({ success: true, data: { roomType: { _id: type._id, name: type.name, basePrice: type.basePrice, hotel: type.hotel }, days: data } });
});

/**
 * PUT /api/admin/rates
 * { roomTypes: [id], from, to (inclusive), weekdays?: [0..6], price?: number|null, closed?: bool, minStay?: number|null }
 * price/minStay null removes that rule; fields left out are not changed.
 */
router.put('/rates', adminOnly, async (req, res) => {
  const typeIds = (Array.isArray(req.body.roomTypes) ? req.body.roomTypes : [req.body.roomType]).filter(id => mongoose.isValidObjectId(id));
  if (!typeIds.length) return res.status(400).json({ message: 'Choose at least one room type' });
  const types = await RoomType.find({ _id: { $in: typeIds } }).select('name').lean();
  if (types.length !== typeIds.length) return res.status(404).json({ message: 'Room type not found' });

  const from = parseDay(req.body.from);
  const to = parseDay(req.body.to);
  if (!from || !to || to < from) return res.status(400).json({ message: 'Choose a valid date range' });
  const span = Math.round((to - from) / DAY_MS) + 1;
  if (span > 366) return res.status(400).json({ message: 'Update at most one year at a time' });
  const weekdays = Array.isArray(req.body.weekdays) && req.body.weekdays.length ? new Set(req.body.weekdays.map(Number)) : null;

  const set = {};
  const unset = {};
  if (req.body.price !== undefined) {
    if (req.body.price === null || req.body.price === '') unset.price = 1;
    else {
      const p = Number(req.body.price);
      if (!Number.isFinite(p) || p < 0) return res.status(400).json({ message: 'Price must be 0 or more' });
      set.price = p;
    }
  }
  if (req.body.closed !== undefined) set.closed = req.body.closed === true;
  if (req.body.minStay !== undefined) {
    if (req.body.minStay === null || req.body.minStay === '') unset.minStay = 1;
    else {
      const m = parseInt(req.body.minStay, 10);
      if (!(m >= 1 && m <= 30)) return res.status(400).json({ message: 'Minimum stay must be 1–30 nights' });
      set.minStay = m;
    }
  }
  if (!Object.keys(set).length && !Object.keys(unset).length) return res.status(400).json({ message: 'Nothing to change' });

  const dates = Array.from({ length: span }, (_, i) => addDays(from, i)).filter(d => !weekdays || weekdays.has(d.getUTCDay()));
  const ops = [];
  for (const roomType of typeIds) {
    for (const date of dates) {
      ops.push({
        updateOne: {
          filter: { roomType, date },
          update: { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) },
          upsert: Object.keys(set).length > 0,
        },
      });
    }
  }
  if (ops.length) await RateOverride.bulkWrite(ops, { ordered: false });
  // Rows with no rule left are noise
  await RateOverride.deleteMany({ roomType: { $in: typeIds }, price: { $exists: false }, minStay: { $exists: false }, closed: { $ne: true } });

  const what = [
    set.price !== undefined ? `price ${set.price}` : unset.price ? 'price reset' : null,
    set.closed !== undefined ? (set.closed ? 'closed' : 'opened') : null,
    set.minStay ? `min stay ${set.minStay}` : unset.minStay ? 'min stay removed' : null,
  ].filter(Boolean).join(', ');
  audit(req.user, 'rates.update', { entity: 'rates', summary: `${types.map(t => t.name).join(', ')} · ${ymd(from)} → ${ymd(to)} (${dates.length} nights) · ${what}` });
  res.json({ success: true, data: { nights: dates.length, roomTypes: typeIds.length } });
});

/* ------------------------------ Reports ------------------------------- */

const SOLD = ['confirmed', 'checked_in', 'checked_out'];
const roomRevenue = (b) => (b.pricing && typeof b.pricing.subtotal === 'number' ? b.pricing.subtotal : b.totalPrice);

/**
 * GET /api/admin/overview?hotel=
 * Today's operations, this month's performance (ADR, RevPAR, occupancy), money owed either way,
 * a 30-day trend and the latest activity.
 */
router.get('/overview', adminOnly, async (req, res) => {
  const roomFilter = {};
  if (req.query.hotel) {
    if (!mongoose.isValidObjectId(req.query.hotel)) return res.status(400).json({ message: 'Invalid hotel' });
    roomFilter.hotel = req.query.hotel;
  }
  const today = hotelToday();
  const tomorrow = addDays(today, 1);
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
  const daysInMonth = Math.round((monthEnd - monthStart) / DAY_MS);
  const trendFrom = addDays(today, -29);

  const rooms = await Room.find(roomFilter).select('_id status').lean();
  const roomIds = rooms.map(r => r._id);
  const sellable = rooms.filter(r => r.status !== 'maintenance').length;
  const windowStart = trendFrom < monthStart ? trendFrom : monthStart;
  const windowEnd = monthEnd > tomorrow ? monthEnd : tomorrow;
  const now = new Date();

  const [stays, active, cancelled, refundsDue, collected, activity, newEnquiries, openRequests, settings] = await Promise.all([
    Booking.find({ room: { $in: roomIds }, status: { $in: SOLD }, checkInDate: { $lt: windowEnd }, checkOutDate: { $gt: windowStart } })
      .select('room checkInDate checkOutDate totalPrice pricing status').lean(),
    Booking.find({ room: { $in: roomIds }, status: { $in: ['pending', 'confirmed', 'checked_in'] } })
      .select('status paymentStatus checkInDate checkOutDate holdExpiresAt totalPrice').lean(),
    Booking.countDocuments({ room: { $in: roomIds }, status: 'cancelled', cancelledAt: { $gte: monthStart, $lt: monthEnd } }),
    Booking.find({ room: { $in: roomIds }, 'refund.status': 'due' }).select('refund.amount').lean(),
    Transaction.aggregate([
      { $match: { status: 'succeeded', date: { $gte: monthStart, $lt: monthEnd } } },
      { $lookup: { from: 'bookings', localField: 'booking', foreignField: '_id', as: 'b' } },
      { $match: { 'b.room': { $in: roomIds } } },
      { $group: { _id: null, total: { $sum: '$amount' }, n: { $sum: 1 } } },
    ]),
    AuditLog.find().sort({ createdAt: -1 }).limit(12).lean(),
    Enquiry.countDocuments({ status: 'new' }),
    ServiceRequest.countDocuments({ room: { $in: roomIds }, status: { $ne: 'completed' } }),
    getSettings(),
  ]);

  // Spread each stay's room revenue evenly over its nights
  const nightly = new Map(); // YYYY-MM-DD -> { rooms, revenue }
  for (const b of stays) {
    const nights = Math.max(1, Math.round((b.checkOutDate - b.checkInDate) / DAY_MS));
    const perNight = roomRevenue(b) / nights;
    for (let d = new Date(b.checkInDate); d < b.checkOutDate; d = addDays(d, 1)) {
      const k = ymd(d);
      const cur = nightly.get(k) || { rooms: 0, revenue: 0 };
      cur.rooms += 1;
      cur.revenue += perNight;
      nightly.set(k, cur);
    }
  }

  let monthRevenue = 0;
  let monthNights = 0;
  for (let d = monthStart; d < monthEnd; d = addDays(d, 1)) {
    const n = nightly.get(ymd(d));
    if (n) { monthRevenue += n.revenue; monthNights += n.rooms; }
  }
  const tonight = nightly.get(ymd(today)) || { rooms: 0, revenue: 0 };
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

  const liveHold = (b) => b.paymentStatus === 'paid' || !b.holdExpiresAt || b.holdExpiresAt > now;
  const unpaid = active.filter(b => b.paymentStatus !== 'paid' && liveHold(b));

  res.json({
    success: true,
    data: {
      date: today,
      currency: settings.currency,
      rooms: { total: rooms.length, sellable, outOfOrder: rooms.length - sellable, dirty: rooms.filter(r => r.status === 'dirty').length },
      today: {
        occupancy: pct(tonight.rooms, sellable),
        occupiedRooms: tonight.rooms,
        arrivals: active.filter(b => ['pending', 'confirmed'].includes(b.status) && liveHold(b) && b.checkInDate >= today && b.checkInDate < tomorrow).length,
        departures: active.filter(b => b.status === 'checked_in' && b.checkOutDate <= today).length,
        inHouse: active.filter(b => b.status === 'checked_in').length,
      },
      month: {
        label: monthStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
        roomRevenue: round2(monthRevenue),
        roomNights: monthNights,
        occupancy: pct(monthNights, sellable * daysInMonth),
        adr: monthNights ? round2(monthRevenue / monthNights) : 0,
        revpar: sellable ? round2(monthRevenue / (sellable * daysInMonth)) : 0,
        collected: round2((collected[0] && collected[0].total) || 0),
        cancellations: cancelled,
      },
      money: {
        unpaidBookings: unpaid.length,
        unpaidAmount: round2(unpaid.reduce((s, b) => s + b.totalPrice, 0)),
        refundsDue: refundsDue.length,
        refundsDueAmount: round2(refundsDue.reduce((s, b) => s + ((b.refund && b.refund.amount) || 0), 0)),
      },
      todo: { newEnquiries, openRequests },
      trend: Array.from({ length: 30 }, (_, i) => {
        const d = addDays(trendFrom, i);
        const n = nightly.get(ymd(d)) || { rooms: 0, revenue: 0 };
        return { date: ymd(d), occupancy: pct(n.rooms, sellable), revenue: round2(n.revenue) };
      }),
      activity,
    },
  });
});

/** GET /api/admin/audit?entity=&entityId=&limit= */
router.get('/audit', authorize('admin', 'receptionist'), async (req, res) => {
  const filter = {};
  if (typeof req.query.entity === 'string') filter.entity = req.query.entity;
  if (mongoose.isValidObjectId(req.query.entityId)) filter.entityId = req.query.entityId;
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100));
  res.json({ success: true, data: await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean() });
});

module.exports = router;
