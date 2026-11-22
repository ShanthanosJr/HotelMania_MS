const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const h = require('./helpers');

let app;
before(async () => { app = await h.start(); });
after(h.stop);
beforeEach(h.reset);

describe('role-based access', () => {
  it('only front desk can list every booking', async () => {
    const guest = await h.createUser('guest');
    const housekeeping = await h.createUser('housekeeping');
    const receptionist = await h.createUser('receptionist');
    await request(app).get('/api/bookings').set('Authorization', guest.auth).expect(403);
    await request(app).get('/api/bookings').set('Authorization', housekeeping.auth).expect(403);
    await request(app).get('/api/bookings').set('Authorization', receptionist.auth).expect(200);
  });

  it('only admins manage hotels, users and transactions', async () => {
    const receptionist = await h.createUser('receptionist');
    const admin = await h.createUser('admin');
    await request(app).post('/api/hotels').set('Authorization', receptionist.auth)
      .send({ name: 'X', address: 'Y', description: 'Z' }).expect(403);
    await request(app).delete(`/api/users/${admin.user._id}`).set('Authorization', receptionist.auth).expect(403);
    await request(app).get('/api/transactions').set('Authorization', receptionist.auth).expect(403);
    await request(app).get('/api/transactions').set('Authorization', admin.auth).expect(200);
  });

  it('housekeeping can change room status but nothing else on a room', async () => {
    const { rooms, hotel } = await h.createInventory();
    const hk = await h.createUser('housekeeping');
    const res = await request(app).put(`/api/rooms/${rooms[0]._id}`).set('Authorization', hk.auth)
      .send({ status: 'dirty', roomNumber: 'HACKED', hotel: String(hotel._id) });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'dirty');
    assert.notEqual(res.body.data.roomNumber, 'HACKED');
  });

  it('public catalogue endpoints need no login', async () => {
    await h.createInventory();
    await request(app).get('/api/hotels').expect(200);
    await request(app).get('/api/room-types').expect(200);
    await request(app).get('/api/rooms').expect(200);
    await request(app).get('/api/reviews/public').expect(200);
  });

  it('answers 400 for malformed ids and 404 JSON for unknown API routes', async () => {
    await request(app).get('/api/hotels/not-an-id').expect(400);
    const res = await request(app).get('/api/nope').expect(404);
    assert.equal(res.body.message, 'Not found');
  });
});
