const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const h = require('./helpers');
const Enquiry = require('../models/Enquiry');
const Subscriber = require('../models/Subscriber');

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

const valid = {
  name: 'Nimal Perera',
  email: 'Nimal@Example.test',
  phone: '+94 77 000 0000',
  topic: 'events',
  checkIn: h.day(40),
  checkOut: h.day(42),
  guests: '60',
  message: 'We would like to host a small wedding dinner for about sixty people.',
};

describe('contact enquiries', () => {
  it('saves a public enquiry and emails an acknowledgement', async () => {
    const res = await request(app).post('/api/enquiries').send(valid);
    assert.equal(res.status, 201);
    const saved = await Enquiry.findById(res.body.data.id);
    assert.equal(saved.email, 'nimal@example.test');
    assert.equal(saved.topic, 'events');
    assert.equal(saved.status, 'new');
    assert.equal(saved.guests, undefined, 'guests over the limit are dropped, not stored');
    assert.equal(saved.checkIn.toISOString().slice(0, 10), h.day(40));
    assert.ok(mail.sentEmails.some(m => m.kind === 'enquiry-ack' && m.to === 'nimal@example.test'));
  });

  it('rejects missing fields, bad email, bad dates and unknown topics', async () => {
    const cases = [
      { ...valid, name: '' },
      { ...valid, email: 'not-an-email' },
      { ...valid, message: 'short' },
      { ...valid, topic: 'casino' },
      { ...valid, checkIn: h.day(5), checkOut: h.day(3) },
    ];
    for (const body of cases) {
      const res = await request(app).post('/api/enquiries').send(body);
      assert.equal(res.status, 400, JSON.stringify(body));
    }
    assert.equal(await Enquiry.countDocuments(), 0);
  });

  it('silently drops spam that fills the honeypot field', async () => {
    const res = await request(app).post('/api/enquiries').send({ ...valid, website: 'http://spam.example' });
    assert.equal(res.status, 201);
    assert.equal(await Enquiry.countDocuments(), 0);
    assert.equal(mail.sentEmails.length, 0);
  });

  it('only front-desk staff can read and update the inbox', async () => {
    await request(app).post('/api/enquiries').send(valid).expect(201);
    const guest = await h.createUser('guest');
    const housekeeping = await h.createUser('housekeeping');
    const reception = await h.createUser('receptionist');

    await request(app).get('/api/enquiries').expect(401);
    await request(app).get('/api/enquiries').set('Authorization', guest.auth).expect(403);
    await request(app).get('/api/enquiries').set('Authorization', housekeeping.auth).expect(403);

    const list = await request(app).get('/api/enquiries').set('Authorization', reception.auth).expect(200);
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.counts.new, 1);

    const id = list.body.data[0]._id;
    await request(app).patch(`/api/enquiries/${id}`).set('Authorization', reception.auth).send({ status: 'nope' }).expect(400);
    const upd = await request(app).patch(`/api/enquiries/${id}`).set('Authorization', reception.auth)
      .send({ status: 'closed', staffNote: 'Sent the events pack' }).expect(200);
    assert.equal(upd.body.data.status, 'closed');
    assert.equal(upd.body.data.handledBy.name, reception.user.name);

    const closed = await request(app).get('/api/enquiries?status=closed').set('Authorization', reception.auth).expect(200);
    assert.equal(closed.body.data.length, 1);
  });
});

describe('newsletter', () => {
  it('subscribes once, accepts repeats, rejects bad emails', async () => {
    await request(app).post('/api/enquiries/newsletter').send({ email: 'Reader@Example.test' }).expect(201);
    await request(app).post('/api/enquiries/newsletter').send({ email: 'reader@example.test' }).expect(201);
    await request(app).post('/api/enquiries/newsletter').send({ email: 'nope' }).expect(400);
    assert.equal(await Subscriber.countDocuments(), 1);

    const admin = await h.createUser('admin');
    const reception = await h.createUser('receptionist');
    await request(app).get('/api/enquiries/subscribers').set('Authorization', reception.auth).expect(403);
    const res = await request(app).get('/api/enquiries/subscribers').set('Authorization', admin.auth).expect(200);
    assert.equal(res.body.data[0].email, 'reader@example.test');
  });
});
