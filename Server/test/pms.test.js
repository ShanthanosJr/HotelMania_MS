const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const h = require('./helpers');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const AuditLog = require('../models/AuditLog');

let app;
before(async () => {
  process.env.HOTEL_TIMEZONE = 'UTC'; // "today" matches h.day(0) whatever time the tests run
  app = await h.start();
});
after(h.stop);
beforeEach(h.reset);
afterEach(() => {
  delete process.env.SERVICE_CHARGE_PERCENT;
  delete process.env.TAX_PERCENT;
});

const avail = (qs) => request(app).get(`/api/availability?${new URLSearchParams(qs)}`);
const staffBook = (auth, body) => request(app).post('/api/bookings').set('Authorization', auth).send(body);
const guestDetails = { guestDetails: { name: 'Ama Silva', email: 'ama@example.test' } };

describe('settings', () => {
  it('admin settings override .env charges and drive prices', async () => {
    const admin = await h.createUser('admin');
    const reception = await h.createUser('receptionist');
    const { type } = await h.createInventory({ rooms: 1, basePrice: 100 });
    process.env.SERVICE_CHARGE_PERCENT = '5';

    await request(app).put('/api/admin/settings').set('Authorization', reception.auth).send({ taxPercent: 10 }).expect(403);
    await request(app).put('/api/admin/settings').set('Authorization', admin.auth).send({ taxPercent: 80 }).expect(400);
    const saved = await request(app).put('/api/admin/settings').set('Authorization', admin.auth)
      .send({ serviceChargePercent: 10, taxPercent: 18, holdMinutes: 45 }).expect(200);
    assert.equal(saved.body.data.holdMinutes, 45);

    const q = (await avail({ checkIn: h.day(10), checkOut: h.day(11), roomType: String(type._id) })).body.data.results[0].quote;
    assert.equal(q.serviceCharge, 10);
    assert.equal(q.tax, 19.8); // 18% of 110
    assert.equal(q.total, 129.8);

    // Clearing a field falls back to .env again
    await request(app).put('/api/admin/settings').set('Authorization', admin.auth).send({ serviceChargePercent: null }).expect(200);
    const cfg = await request(app).get('/api/availability/config').expect(200);
    assert.equal(cfg.body.data.serviceChargePercent, 5);

    // Guest holds use the saved hold time
    const guest = await h.createUser('guest');
    const b = await request(app).post('/api/bookings').set('Authorization', guest.auth)
      .send({ roomType: type._id, checkInDate: h.day(10), checkOutDate: h.day(11), ...guestDetails }).expect(201);
    const minutes = (Date.parse(b.body.data.holdExpiresAt) - Date.now()) / 60000;
    assert.ok(minutes > 44 && minutes <= 45, `hold was ${minutes} minutes`);
    assert.ok(await AuditLog.exists({ action: 'settings.update' }));
  });
});

describe('rate calendar', () => {
  it('prices each night, closes dates and enforces minimum stay for guests only', async () => {
    const admin = await h.createUser('admin');
    const guest = await h.createUser('guest');
    const { type, rooms } = await h.createInventory({ rooms: 2, basePrice: 100 });

    // Weekend-style rate on night 21, closed on night 30, 3-night minimum when arriving on day 40
    await request(app).put('/api/admin/rates').set('Authorization', admin.auth)
      .send({ roomTypes: [type._id], from: h.day(21), to: h.day(21), price: 150 }).expect(200);
    await request(app).put('/api/admin/rates').set('Authorization', admin.auth)
      .send({ roomTypes: [type._id], from: h.day(30), to: h.day(30), closed: true }).expect(200);
    await request(app).put('/api/admin/rates').set('Authorization', admin.auth)
      .send({ roomTypes: [type._id], from: h.day(40), to: h.day(40), minStay: 3 }).expect(200);

    const q = (await avail({ checkIn: h.day(20), checkOut: h.day(23) })).body.data.results[0];
    assert.equal(q.quote.subtotal, 350);
    assert.equal(q.quote.nightlyRate, 116.67);

    const closed = (await avail({ checkIn: h.day(29), checkOut: h.day(31) })).body.data.results[0];
    assert.equal(closed.available, 0);
    assert.match(closed.restriction, /Not available/);
    await request(app).post('/api/bookings').set('Authorization', guest.auth)
      .send({ roomType: type._id, checkInDate: h.day(29), checkOutDate: h.day(31), ...guestDetails }).expect(409);
    // Front desk can still sell a closed date (e.g. a VIP)
    await staffBook(admin.auth, { room: rooms[0]._id, checkInDate: h.day(29), checkOutDate: h.day(31), ...guestDetails }).expect(201);

    const short = (await avail({ checkIn: h.day(40), checkOut: h.day(42) })).body.data.results[0];
    assert.match(short.restriction, /Minimum stay of 3/);
    const ok = (await avail({ checkIn: h.day(40), checkOut: h.day(43) })).body.data.results[0];
    assert.equal(ok.available, 2);

    // Calendar view shows the rules; null price resets to base
    const cal = await request(app).get(`/api/admin/rates?roomType=${type._id}&from=${h.day(21)}&days=10`).set('Authorization', admin.auth).expect(200);
    assert.deepEqual(cal.body.data.days[0], { date: h.day(21), price: 150, custom: true, closed: false, minStay: null });
    assert.equal(cal.body.data.days[9].closed, true);
    await request(app).put('/api/admin/rates').set('Authorization', admin.auth)
      .send({ roomTypes: [type._id], from: h.day(21), to: h.day(21), price: null }).expect(200);
    const reset = await request(app).get(`/api/admin/rates?roomType=${type._id}&from=${h.day(21)}&days=1`).set('Authorization', admin.auth);
    assert.equal(reset.body.data.days[0].price, 100);
  });

  it('applies to chosen weekdays only', async () => {
    const admin = await h.createUser('admin');
    const { type } = await h.createInventory({ rooms: 1, basePrice: 100 });
    const res = await request(app).put('/api/admin/rates').set('Authorization', admin.auth)
      .send({ roomTypes: [type._id], from: h.day(1), to: h.day(14), weekdays: [5, 6], price: 130 }).expect(200);
    assert.equal(res.body.data.nights, 4);
  });
});

describe('front desk', () => {
  const setup = async () => {
    const reception = await h.createUser('receptionist');
    const { rooms } = await h.createInventory({ rooms: 2 });
    const created = await staffBook(reception.auth, {
      room: rooms[0]._id, checkInDate: h.day(0), checkOutDate: h.day(2), status: 'confirmed', ...guestDetails,
    }).expect(201);
    return { reception, rooms, booking: created.body.data };
  };

  it('lists today\'s arrivals and checks a guest in and out', async () => {
    const { reception, rooms, booking } = await setup();
    const today = await request(app).get('/api/frontdesk/today').set('Authorization', reception.auth).expect(200);
    assert.equal(today.body.data.counts.arrivals, 1);

    // Unpaid: needs confirmation first
    const unpaid = await request(app).post(`/api/frontdesk/${booking._id}/check-in`).set('Authorization', reception.auth).send({}).expect(409);
    assert.equal(unpaid.body.code, 'UNPAID');

    // Room 2 is still dirty: warn, then allow with force; the guest moves rooms
    await Room.updateOne({ _id: rooms[1]._id }, { status: 'dirty' });
    const dirty = await request(app).post(`/api/frontdesk/${booking._id}/check-in`).set('Authorization', reception.auth)
      .send({ room: rooms[1]._id }).expect(409);
    assert.equal(dirty.body.code, 'UNPAID');
    // Accepting "unpaid" does not skip the separate dirty-room warning
    const stillDirty = await request(app).post(`/api/frontdesk/${booking._id}/check-in`).set('Authorization', reception.auth)
      .send({ room: rooms[1]._id, allowUnpaid: true }).expect(409);
    assert.equal(stillDirty.body.code, 'DIRTY');
    await Booking.updateOne({ _id: booking._id }, { paymentStatus: 'paid' });
    const dirty2 = await request(app).post(`/api/frontdesk/${booking._id}/check-in`).set('Authorization', reception.auth)
      .send({ room: rooms[1]._id }).expect(409);
    assert.equal(dirty2.body.code, 'DIRTY');
    await Room.updateOne({ _id: rooms[1]._id }, { status: 'available' });
    const inRes = await request(app).post(`/api/frontdesk/${booking._id}/check-in`).set('Authorization', reception.auth)
      .send({ room: rooms[1]._id }).expect(200);
    assert.equal(inRes.body.data.status, 'checked_in');
    assert.equal(String(inRes.body.data.room._id), String(rooms[1]._id));
    assert.equal((await Room.findById(rooms[1]._id)).status, 'occupied');

    const outRes = await request(app).post(`/api/frontdesk/${booking._id}/check-out`).set('Authorization', reception.auth).send({}).expect(200);
    assert.equal(outRes.body.data.status, 'checked_out');
    const room = await Room.findById(rooms[1]._id);
    assert.equal(room.status, 'dirty');
    assert.equal(room.currentBooking, undefined);

    await new Promise(r => setTimeout(r, 50)); // audit writes are fire-and-forget
    const actions = (await AuditLog.find()).map(a => a.action).sort();
    assert.deepEqual(actions, ['booking.check_in', 'booking.check_out', 'booking.create']);
  });

  it('refuses to check out an unpaid guest unless forced', async () => {
    const { reception, booking } = await setup();
    await request(app).post(`/api/frontdesk/${booking._id}/check-in`).set('Authorization', reception.auth).send({ allowUnpaid: true }).expect(200);
    const res = await request(app).post(`/api/frontdesk/${booking._id}/check-out`).set('Authorization', reception.auth).send({}).expect(409);
    assert.equal(res.body.code, 'UNPAID');
    await request(app).post(`/api/frontdesk/${booking._id}/check-out`).set('Authorization', reception.auth).send({ force: true }).expect(200);
  });

  it('suggests free rooms for a move and shows the tape chart', async () => {
    const { reception, rooms, booking } = await setup();
    const options = await request(app).get(`/api/frontdesk/${booking._id}/rooms`).set('Authorization', reception.auth).expect(200);
    assert.equal(options.body.data.length, 2);
    assert.ok(options.body.data.find(r => r.current));

    const cal = await request(app).get(`/api/frontdesk/calendar?from=${h.day(-1)}&days=7`).set('Authorization', reception.auth).expect(200);
    assert.equal(cal.body.data.rooms.length, 2);
    assert.equal(cal.body.data.bookings.length, 1);
    assert.equal(cal.body.data.bookings[0].guest, 'Ama Silva');
    assert.equal(String(cal.body.data.bookings[0].room), String(rooms[0]._id));
  });

  it('is closed to guests and housekeeping', async () => {
    const guest = await h.createUser('guest');
    const hk = await h.createUser('housekeeping');
    await request(app).get('/api/frontdesk/today').set('Authorization', guest.auth).expect(403);
    await request(app).get('/api/frontdesk/today').set('Authorization', hk.auth).expect(403);
    await request(app).get('/api/admin/overview').set('Authorization', hk.auth).expect(403);
  });
});

describe('housekeeping', () => {
  it('shows the board and lets housekeeping mark rooms clean', async () => {
    const hk = await h.createUser('housekeeping');
    const reception = await h.createUser('receptionist');
    const { rooms } = await h.createInventory({ rooms: 2 });
    await Room.updateOne({ _id: rooms[0]._id }, { status: 'dirty' });
    const b = await staffBook(reception.auth, { room: rooms[1]._id, checkInDate: h.day(-1), checkOutDate: h.day(0), status: 'checked_in', paymentStatus: 'paid', ...guestDetails }).expect(201);

    const board = await request(app).get('/api/housekeeping/board').set('Authorization', hk.auth).expect(200);
    assert.equal(board.body.data.counts.dirty, 1);
    const occupied = board.body.data.rooms.find(r => String(r._id) === String(rooms[1]._id));
    assert.equal(occupied.guest.name, 'Ama Silva');
    assert.equal(occupied.guest.departsToday, true);

    await request(app).patch(`/api/housekeeping/rooms/${rooms[0]._id}`).set('Authorization', hk.auth).send({ status: 'available' }).expect(200);
    await request(app).patch(`/api/housekeeping/rooms/${rooms[0]._id}`).set('Authorization', hk.auth).send({ status: 'occupied' }).expect(400);
    await request(app).patch(`/api/housekeeping/rooms/${rooms[1]._id}`).set('Authorization', hk.auth).send({ status: 'available' }).expect(409);
    assert.equal((await Room.findById(rooms[0]._id)).status, 'available');
    assert.ok(b.body.data);
  });
});

describe('overview', () => {
  it('reports occupancy, ADR, RevPAR and money owed', async () => {
    const admin = await h.createUser('admin');
    const { rooms } = await h.createInventory({ rooms: 2, basePrice: 100 });
    process.env.SERVICE_CHARGE_PERCENT = '10';
    // One room sold tonight (paid), one unpaid future booking
    await staffBook(admin.auth, { room: rooms[0]._id, checkInDate: h.day(0), checkOutDate: h.day(1), status: 'confirmed', paymentStatus: 'paid', ...guestDetails }).expect(201);
    await staffBook(admin.auth, { room: rooms[1]._id, checkInDate: h.day(3), checkOutDate: h.day(4), status: 'confirmed', ...guestDetails }).expect(201);

    const res = await request(app).get('/api/admin/overview').set('Authorization', admin.auth).expect(200);
    const d = res.body.data;
    assert.equal(d.today.occupancy, 50);
    assert.equal(d.today.arrivals, 1);
    assert.equal(d.money.unpaidBookings, 1);
    assert.equal(d.money.unpaidAmount, 110);
    // Room revenue excludes service charge; ADR is per sold night
    assert.equal(d.month.adr, 100);
    assert.equal(d.trend.length, 30);
    assert.equal(d.trend[29].occupancy, 50);
    assert.ok(d.activity.length >= 2);
  });
});
