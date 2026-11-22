const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const h = require('./helpers');
const Booking = require('../models/Booking');

let app;
before(async () => { app = await h.start(); });
after(h.stop);
beforeEach(h.reset);

const book = (auth, body) => request(app).post('/api/bookings').set('Authorization', auth).send(body);

describe('booking creation', () => {
  it('prices the stay on the server and ignores a client-sent total', async () => {
    const { rooms } = await h.createInventory({ basePrice: 120 });
    const guest = await h.createUser('guest');
    const res = await book(guest.auth, {
      room: rooms[0]._id, checkInDate: h.day(10), checkOutDate: h.day(13), guests: 2, totalPrice: 1,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.totalPrice, 360, '3 nights x 120');
    assert.equal(res.body.data.status, 'pending');
    assert.equal(res.body.data.paymentStatus, 'pending');
    assert.ok(new Date(res.body.data.holdExpiresAt) > new Date(), 'online bookings get a payment hold');
  });

  it('ignores status / payment fields sent by a guest', async () => {
    const { rooms } = await h.createInventory();
    const guest = await h.createUser('guest');
    const res = await book(guest.auth, {
      room: rooms[0]._id, checkInDate: h.day(5), checkOutDate: h.day(6), status: 'confirmed', paymentStatus: 'paid',
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'pending');
    assert.equal(res.body.data.paymentStatus, 'pending');
  });

  it('rejects invalid stays', async () => {
    const { rooms } = await h.createInventory({ maxOccupancy: 2 });
    const guest = await h.createUser('guest');
    const room = rooms[0]._id;
    await book(guest.auth, { room, checkInDate: h.day(-5), checkOutDate: h.day(-3) }).expect(400);   // past
    await book(guest.auth, { room, checkInDate: h.day(5), checkOutDate: h.day(5) }).expect(400);     // 0 nights
    await book(guest.auth, { room, checkInDate: h.day(8), checkOutDate: h.day(5) }).expect(400);     // reversed
    await book(guest.auth, { room, checkInDate: h.day(5), checkOutDate: h.day(40) }).expect(400);    // > 30 nights
    await book(guest.auth, { room, checkInDate: h.day(5), checkOutDate: h.day(6), guests: 3 }).expect(400); // over capacity
    await book(guest.auth, { room: 'nope', checkInDate: h.day(5), checkOutDate: h.day(6) }).expect(400);
  });

  it('refuses rooms under maintenance', async () => {
    const { rooms } = await h.createInventory();
    rooms[0].status = 'maintenance';
    await rooms[0].save();
    const guest = await h.createUser('guest');
    await book(guest.auth, { room: rooms[0]._id, checkInDate: h.day(5), checkOutDate: h.day(6) }).expect(400);
  });
});

describe('availability', () => {
  it('blocks overlapping stays but allows same-day turnover', async () => {
    const { rooms } = await h.createInventory();
    const a = await h.createUser('guest');
    const b = await h.createUser('guest');
    const room = rooms[0]._id;
    await book(a.auth, { room, checkInDate: h.day(10), checkOutDate: h.day(12) }).expect(201);
    await book(b.auth, { room, checkInDate: h.day(11), checkOutDate: h.day(13) }).expect(409);  // overlaps
    await book(b.auth, { room, checkInDate: h.day(9), checkOutDate: h.day(11) }).expect(409);   // overlaps
    await book(b.auth, { room, checkInDate: h.day(12), checkOutDate: h.day(14) }).expect(201);  // check-in on check-out day
    await book(b.auth, { room, checkInDate: h.day(8), checkOutDate: h.day(10) }).expect(201);   // check-out on check-in day
  });

  it('lets only one of two simultaneous requests take the last room', async () => {
    const { rooms } = await h.createInventory();
    const a = await h.createUser('guest');
    const b = await h.createUser('guest');
    const body = { room: rooms[0]._id, checkInDate: h.day(20), checkOutDate: h.day(22) };
    const results = await Promise.all([book(a.auth, body), book(b.auth, body)]);
    const codes = results.map(r => r.status).sort();
    assert.deepEqual(codes, [201, 409]);
    assert.equal(await Booking.countDocuments({ room: rooms[0]._id }), 1);
  });

  it('frees the room when an unpaid hold expires, but never for a paid booking', async () => {
    const { rooms } = await h.createInventory();
    const a = await h.createUser('guest');
    const b = await h.createUser('guest');
    const room = rooms[0]._id;
    const first = await book(a.auth, { room, checkInDate: h.day(10), checkOutDate: h.day(12) }).expect(201);

    await Booking.updateOne({ _id: first.body.data._id }, { holdExpiresAt: new Date(Date.now() - 60_000), paymentStatus: 'paid' });
    await book(b.auth, { room, checkInDate: h.day(10), checkOutDate: h.day(12) }).expect(409);

    await Booking.updateOne({ _id: first.body.data._id }, { paymentStatus: 'pending' });
    await book(b.auth, { room, checkInDate: h.day(10), checkOutDate: h.day(12) }).expect(201);
  });

  it('hides booked rooms from the dated room search', async () => {
    const { rooms, hotel } = await h.createInventory({ rooms: 2 });
    const guest = await h.createUser('guest');
    await book(guest.auth, { room: rooms[0]._id, checkInDate: h.day(10), checkOutDate: h.day(12) }).expect(201);
    const res = await request(app).get(`/api/rooms?hotel=${hotel._id}&checkIn=${h.day(11)}&checkOut=${h.day(13)}`).expect(200);
    assert.deepEqual(res.body.data.map(r => r._id), [String(rooms[1]._id)]);
  });
});

describe('booking ownership and lifecycle', () => {
  it('guests see only their own bookings', async () => {
    const { rooms } = await h.createInventory();
    const owner = await h.createUser('guest');
    const other = await h.createUser('guest');
    const created = await book(owner.auth, { room: rooms[0]._id, checkInDate: h.day(5), checkOutDate: h.day(6) }).expect(201);
    const id = created.body.data._id;
    await request(app).get(`/api/bookings/${id}`).set('Authorization', owner.auth).expect(200);
    await request(app).get(`/api/bookings/${id}`).set('Authorization', other.auth).expect(403);
    await request(app).patch(`/api/bookings/${id}/cancel`).set('Authorization', other.auth).expect(403);
    const mine = await request(app).get('/api/bookings/my-bookings').set('Authorization', other.auth).expect(200);
    assert.equal(mine.body.data.length, 0);
  });

  it('cancelling releases the dates', async () => {
    const { rooms } = await h.createInventory();
    const a = await h.createUser('guest');
    const b = await h.createUser('guest');
    const body = { room: rooms[0]._id, checkInDate: h.day(5), checkOutDate: h.day(7) };
    const created = await book(a.auth, body).expect(201);
    const cancel = await request(app).patch(`/api/bookings/${created.body.data._id}/cancel`).set('Authorization', a.auth);
    assert.equal(cancel.status, 200);
    assert.equal(cancel.body.data.status, 'cancelled');
    await request(app).patch(`/api/bookings/${created.body.data._id}/cancel`).set('Authorization', a.auth).expect(400);
    await book(b.auth, body).expect(201);
  });

  it('check-in marks the room occupied and check-out frees it', async () => {
    const { rooms } = await h.createInventory();
    const desk = await h.createUser('receptionist');
    const guest = await h.createUser('guest');
    const created = await book(desk.auth, {
      room: rooms[0]._id, checkInDate: h.day(0), checkOutDate: h.day(2), user: String(guest.user._id), status: 'confirmed',
    }).expect(201);
    assert.equal(created.body.data.holdExpiresAt, undefined, 'front-desk bookings do not expire');
    const id = created.body.data._id;

    await request(app).put(`/api/bookings/${id}`).set('Authorization', desk.auth).send({ status: 'checked_in' }).expect(200);
    let room = await request(app).get(`/api/rooms/${rooms[0]._id}`).expect(200);
    assert.equal(room.body.data.status, 'occupied');

    await request(app).put(`/api/bookings/${id}`).set('Authorization', desk.auth).send({ status: 'checked_out' }).expect(200);
    room = await request(app).get(`/api/rooms/${rooms[0]._id}`).expect(200);
    assert.equal(room.body.data.status, 'available');
  });
});
