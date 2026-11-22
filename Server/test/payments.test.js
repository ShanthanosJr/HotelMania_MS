const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const h = require('./helpers');
const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');

let app;
let payhere;
before(async () => {
  app = await h.start();
  payhere = require('../utils/payhere');
});
after(h.stop);
beforeEach(h.reset);

/** A pending guest booking (2 nights x 100) and a signed PayHere notification for it. */
async function setup(overrides = {}) {
  const { rooms } = await h.createInventory({ basePrice: 100 });
  const guest = await h.createUser('guest');
  const res = await request(app).post('/api/bookings').set('Authorization', guest.auth)
    .send({ room: rooms[0]._id, checkInDate: h.day(10), checkOutDate: h.day(12) }).expect(201);
  const booking = res.body.data;
  const body = {
    merchant_id: h.TEST_ENV.PAYHERE_MERCHANT_ID,
    order_id: payhere.makeOrderId(booking._id),
    payment_id: `PAY${Date.now()}`,
    payhere_amount: '200.00',
    payhere_currency: 'LKR',
    status_code: '2',
    card_no: '************4242',
    method: 'VISA',
    ...overrides,
  };
  body.md5sig = overrides.md5sig || payhere.notifySignature(body);
  return { booking, guest, body };
}

const notify = (body) => request(app).post('/api/payments/payhere/notify').type('form').send(body);

describe('PayHere notifications', () => {
  it('a valid success notification marks the booking paid and confirmed', async () => {
    const { booking, body } = await setup();
    await notify(body).expect(200);
    const updated = await Booking.findById(booking._id);
    assert.equal(updated.paymentStatus, 'paid');
    assert.equal(updated.status, 'confirmed');
    assert.equal(updated.holdExpiresAt, undefined);
    const txn = await Transaction.findOne({ booking: booking._id });
    assert.equal(txn.amount, 200);
    assert.equal(txn.paymentDetails.last4, '4242');
  });

  it('is idempotent when PayHere repeats the notification', async () => {
    const { booking, body } = await setup();
    await notify(body).expect(200);
    await notify(body).expect(200);
    assert.equal(await Transaction.countDocuments({ booking: booking._id }), 1);
  });

  it('ignores a forged signature', async () => {
    const { booking, body } = await setup({ md5sig: 'A'.repeat(32) });
    await notify(body).expect(200);
    assert.equal((await Booking.findById(booking._id)).paymentStatus, 'pending');
  });

  it('ignores a wrong amount or currency', async () => {
    const { booking, body } = await setup({ payhere_amount: '1.00' });
    await notify(body).expect(200);
    assert.equal((await Booking.findById(booking._id)).paymentStatus, 'pending');

    const second = await setup({ payhere_currency: 'USD' });
    await notify(second.body).expect(200);
    assert.equal((await Booking.findById(second.booking._id)).paymentStatus, 'pending');
  });

  it('leaves the booking unpaid for failed or cancelled payments', async () => {
    const { booking, body } = await setup({ status_code: '-2' });
    await notify(body).expect(200);
    assert.equal((await Booking.findById(booking._id)).paymentStatus, 'pending');
    assert.equal(await Transaction.countDocuments({}), 0);
  });
});

describe('PayHere checkout', () => {
  it('returns a signed payment for the owner only', async () => {
    const { booking, guest } = await setup();
    const res = await request(app).post('/api/payments/payhere/checkout').set('Authorization', guest.auth)
      .send({ booking: booking._id }).expect(200);
    assert.equal(res.body.payment.amount, '200.00');
    assert.equal(res.body.payment.hash, payhere.checkoutHash({ orderId: res.body.payment.order_id, amount: '200.00', currency: 'LKR' }));
    assert.equal(JSON.stringify(res.body).includes(h.TEST_ENV.PAYHERE_MERCHANT_SECRET), false, 'secret never leaves the server');

    const other = await h.createUser('guest');
    await request(app).post('/api/payments/payhere/checkout').set('Authorization', other.auth)
      .send({ booking: booking._id }).expect(403);
  });
});
