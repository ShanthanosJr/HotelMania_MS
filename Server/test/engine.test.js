const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const h = require('./helpers');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Transaction = require('../models/Transaction');

let app;
let mail;
before(async () => {
  app = await h.start();
  mail = require('../utils/mailer');
});
after(h.stop);
beforeEach(async () => {
  await h.reset();
  mail.sentEmails.length = 0;
});
afterEach(() => {
  delete process.env.SERVICE_CHARGE_PERCENT;
  delete process.env.TAX_PERCENT;
});

const book = (auth, body) => request(app).post('/api/bookings').set('Authorization', auth).send(body);
const avail = (qs) => request(app).get(`/api/availability?${new URLSearchParams(qs)}`);

describe('availability', () => {
  it('lists room types with free-room counts and a full price', async () => {
    process.env.SERVICE_CHARGE_PERCENT = '10';
    process.env.TAX_PERCENT = '18';
    const { type, hotel } = await h.createInventory({ rooms: 3, basePrice: 100 });
    const res = await avail({ checkIn: h.day(10), checkOut: h.day(12), guests: 2, hotel: String(hotel._id) }).expect(200);
    assert.equal(res.body.data.nights, 2);
    const row = res.body.data.results.find(r => r.roomType._id === String(type._id));
    assert.equal(row.available, 3);
    assert.equal(row.totalRooms, 3);
    assert.equal(row.fitsGuests, true);
    assert.deepEqual(
      { subtotal: row.quote.subtotal, serviceCharge: row.quote.serviceCharge, tax: row.quote.tax, total: row.quote.total },
      { subtotal: 200, serviceCharge: 20, tax: 39.6, total: 259.6 },
    );
  });

  it('counts down as rooms are booked and ignores rooms under maintenance', async () => {
    const { type, rooms } = await h.createInventory({ rooms: 3 });
    await Room.updateOne({ _id: rooms[2]._id }, { status: 'maintenance' });
    const guest = await h.createUser('guest');
    await book(guest.auth, { roomType: type._id, checkInDate: h.day(10), checkOutDate: h.day(12) }).expect(201);
    const res = await avail({ checkIn: h.day(11), checkOut: h.day(13), roomType: String(type._id) }).expect(200);
    assert.equal(res.body.data.results[0].available, 1);
    assert.equal(res.body.data.results[0].totalRooms, 2);
  });

  it('flags room types too small for the party', async () => {
    await h.createInventory({ maxOccupancy: 2 });
    const res = await avail({ checkIn: h.day(3), checkOut: h.day(4), guests: 3 }).expect(200);
    assert.equal(res.body.data.results[0].fitsGuests, false);
  });

  it('validates the dates', async () => {
    await avail({ checkIn: h.day(5), checkOut: h.day(5) }).expect(400);
    await avail({ checkIn: 'soon', checkOut: h.day(5) }).expect(400);
    await avail({ checkIn: h.day(1), checkOut: h.day(2), hotel: 'x' }).expect(400);
  });
});

describe('booking a room type', () => {
  it('assigns a free room, a confirmation code, a price breakdown and guest details', async () => {
    process.env.SERVICE_CHARGE_PERCENT = '10';
    const { type, rooms } = await h.createInventory({ rooms: 2, basePrice: 150 });
    const guest = await h.createUser('guest', { name: 'Nimal Perera', phone: '+94 77 123 4567' });
    const res = await book(guest.auth, {
      roomType: type._id, checkInDate: h.day(7), checkOutDate: h.day(9), guests: 2,
      guestDetails: { arrivalTime: '15:00', specialRequests: 'Late check-in, high floor please' },
    });
    assert.equal(res.status, 201);
    const b = res.body.data;
    assert.match(b.confirmationCode, /^HM-[A-HJ-NP-Z2-9]{6}$/);
    assert.ok(rooms.some(r => String(r._id) === b.room._id), 'a real room of that type was assigned');
    assert.equal(b.pricing.subtotal, 300);
    assert.equal(b.pricing.serviceCharge, 30);
    assert.equal(b.totalPrice, 330);
    assert.equal(b.guestDetails.name, 'Nimal Perera', 'defaults to the account name');
    assert.equal(b.guestDetails.phone, '+94 77 123 4567');
    assert.equal(b.guestDetails.specialRequests, 'Late check-in, high floor please');
  });

  it('puts simultaneous guests in different rooms and then reports sold out', async () => {
    const { type } = await h.createInventory({ rooms: 2 });
    const users = await Promise.all([h.createUser('guest'), h.createUser('guest'), h.createUser('guest')]);
    const body = { roomType: type._id, checkInDate: h.day(20), checkOutDate: h.day(23) };
    const results = await Promise.all(users.map(u => book(u.auth, body)));
    const ok = results.filter(r => r.status === 201);
    assert.equal(ok.length, 2);
    assert.equal(results.filter(r => r.status === 409).length, 1);
    assert.notEqual(ok[0].body.data.room._id, ok[1].body.data.room._id);
    assert.match(results.find(r => r.status === 409).body.message, /sold out/i);
  });

  it('rejects parties larger than the room type allows and bad guest emails', async () => {
    const { type } = await h.createInventory({ maxOccupancy: 2 });
    const guest = await h.createUser('guest');
    await book(guest.auth, { roomType: type._id, checkInDate: h.day(3), checkOutDate: h.day(4), guests: 3 }).expect(400);
    await book(guest.auth, {
      roomType: type._id, checkInDate: h.day(3), checkOutDate: h.day(4), guestDetails: { email: 'not-an-email' },
    }).expect(400);
    await book(guest.auth, { checkInDate: h.day(3), checkOutDate: h.day(4) }).expect(400);
  });

  it('gives every booking a unique code, including old ones (migration)', async () => {
    const { rooms } = await h.createInventory();
    const guest = await h.createUser('guest');
    await Booking.collection.insertOne({
      user: guest.user._id, room: rooms[0]._id, guests: 1, totalPrice: 100, status: 'confirmed', paymentStatus: 'paid',
      checkInDate: new Date(h.day(40)), checkOutDate: new Date(h.day(41)),
    });
    await require('../utils/migrations').runMigrations();
    const legacy = await Booking.collection.findOne({ user: guest.user._id });
    assert.match(legacy.confirmationCode, /^HM-/);
  });
});

describe('cancellations and refunds', () => {
  async function paidBooking() {
    const { type } = await h.createInventory({ basePrice: 100 });
    const guest = await h.createUser('guest');
    const res = await book(guest.auth, { roomType: type._id, checkInDate: h.day(10), checkOutDate: h.day(12) }).expect(201);
    const id = res.body.data._id;
    await Booking.updateOne({ _id: id }, { paymentStatus: 'paid', status: 'confirmed', $unset: { holdExpiresAt: 1 } });
    await Transaction.create({ booking: id, amount: 200, type: 'payhere', transactionId: `T${id}` });
    return { id, guest };
  }

  it('cancelling a paid booking marks a refund as due and emails the guest', async () => {
    const { id, guest } = await paidBooking();
    const res = await request(app).patch(`/api/bookings/${id}/cancel`).set('Authorization', guest.auth).expect(200);
    assert.equal(res.body.data.refund.status, 'due');
    assert.equal(res.body.data.refund.amount, 200);
    assert.match(res.body.message, /refund/i);
    assert.ok(mail.sentEmails.some(m => m.kind === 'cancelled' && m.to === guest.user.email));
  });

  it('admins record the refund; it updates the booking, the transaction and emails the guest', async () => {
    const { id, guest } = await paidBooking();
    await request(app).patch(`/api/bookings/${id}/cancel`).set('Authorization', guest.auth).expect(200);

    const receptionist = await h.createUser('receptionist');
    await request(app).post(`/api/bookings/${id}/refund`).set('Authorization', receptionist.auth).send({}).expect(403);

    const adminUser = await h.createUser('admin');
    await request(app).post(`/api/bookings/${id}/refund`).set('Authorization', adminUser.auth).send({ amount: 500 }).expect(400);
    const res = await request(app).post(`/api/bookings/${id}/refund`).set('Authorization', adminUser.auth)
      .send({ reference: 'PH-REF-991' }).expect(200);
    assert.equal(res.body.data.paymentStatus, 'refunded');
    assert.equal(res.body.data.refund.status, 'completed');
    assert.equal(res.body.data.refund.reference, 'PH-REF-991');
    assert.equal((await Transaction.findOne({ booking: id })).status, 'refunded');
    assert.ok(mail.sentEmails.some(m => m.kind === 'refunded'));
  });

  it('will not refund an unpaid or still-active booking', async () => {
    const { id } = await paidBooking();
    const adminUser = await h.createUser('admin');
    await request(app).post(`/api/bookings/${id}/refund`).set('Authorization', adminUser.auth).send({}).expect(400);
  });
});

describe('emails', () => {
  it('a confirmed PayHere payment emails the guest their confirmation', async () => {
    const payhere = require('../utils/payhere');
    const { type } = await h.createInventory({ basePrice: 100 });
    const guest = await h.createUser('guest');
    const created = await book(guest.auth, { roomType: type._id, checkInDate: h.day(10), checkOutDate: h.day(11) }).expect(201);
    const body = {
      merchant_id: h.TEST_ENV.PAYHERE_MERCHANT_ID, order_id: payhere.makeOrderId(created.body.data._id),
      payment_id: 'P1', payhere_amount: '100.00', payhere_currency: 'LKR', status_code: '2',
    };
    body.md5sig = payhere.notifySignature(body);
    await request(app).post('/api/payments/payhere/notify').type('form').send(body).expect(200);
    for (let i = 0; i < 20 && !mail.sentEmails.length; i++) await new Promise(r => setTimeout(r, 25));
    const email = mail.sentEmails.find(m => m.kind === 'confirmed');
    assert.ok(email, 'confirmation email sent');
    assert.ok(email.subject.includes(created.body.data.confirmationCode));
  });
});

describe('room numbers', () => {
  it('are unique per hotel, not across hotels', async () => {
    const adminUser = await h.createUser('admin');
    const a = await h.createInventory({ rooms: 0 });
    const b = await h.createInventory({ rooms: 0 });
    const post = (inv) => request(app).post('/api/rooms').set('Authorization', adminUser.auth)
      .send({ roomNumber: '101', hotel: String(inv.hotel._id), type: String(inv.type._id) });
    await post(a).expect(201);
    await post(b).expect(201);
    const dup = await post(a).expect(400);
    assert.match(dup.body.message, /already exists in this hotel/);
  });
});
