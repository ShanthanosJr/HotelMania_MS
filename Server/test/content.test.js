const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const h = require('./helpers');
const Hotel = require('../models/Hotel');
const Review = require('../models/Review');

let app;
before(async () => { app = await h.start(); });
after(h.stop);
beforeEach(h.reset);

describe('photos on hotels and room types', () => {
  it('adds links, keeps or removes existing photos, and ignores unsafe links', async () => {
    const admin = await h.createUser('admin');
    const created = await request(app).post('/api/hotels').set('Authorization', admin.auth)
      .send({ name: 'Sea Hotel', address: '1 Beach Rd', description: 'By the sea', photoUrls: JSON.stringify(['https://img.example/a.jpg', 'javascript:alert(1)', 'http://insecure.example/b.jpg']) })
      .expect(201);
    assert.deepEqual(created.body.data.photos, ['https://img.example/a.jpg']);

    const id = created.body.data._id;
    const added = await request(app).put(`/api/hotels/${id}`).set('Authorization', admin.auth)
      .send({ photoUrls: ['https://img.example/b.jpg'] }).expect(200);
    assert.deepEqual(added.body.data.photos, ['https://img.example/a.jpg', 'https://img.example/b.jpg']);

    const removed = await request(app).put(`/api/hotels/${id}`).set('Authorization', admin.auth)
      .send({ keepPhotos: ['https://img.example/b.jpg'] }).expect(200);
    assert.deepEqual(removed.body.data.photos, ['https://img.example/b.jpg']);

    // Editing text alone leaves photos untouched
    await request(app).put(`/api/hotels/${id}`).set('Authorization', admin.auth).send({ description: 'Updated' }).expect(200);
    assert.deepEqual((await Hotel.findById(id)).photos, ['https://img.example/b.jpg']);

    const type = await request(app).post('/api/room-types').set('Authorization', admin.auth)
      .send({ name: 'Suite', hotel: id, basePrice: 200, maxOccupancy: 2, description: 'Big', photoUrls: ['https://img.example/s.jpg'] }).expect(201);
    const typeUpd = await request(app).put(`/api/room-types/${type.body.data._id}`).set('Authorization', admin.auth)
      .send({ keepPhotos: [] }).expect(200);
    assert.deepEqual(typeUpd.body.data.photos, []);
  });
});

describe('review moderation', () => {
  it('hidden reviews disappear from the website; only admins can hide them', async () => {
    const admin = await h.createUser('admin');
    const guest = await h.createUser('guest');
    const { rooms } = await h.createInventory({ rooms: 1 });
    const review = await Review.create({ user: guest.user._id, room: rooms[0]._id, rating: 5, comment: 'Wonderful stay, lovely staff and a great breakfast.' });

    assert.equal((await request(app).get('/api/reviews/public')).body.data.length, 1);
    await request(app).put(`/api/reviews/${review._id}`).set('Authorization', guest.auth).send({ hidden: true }).expect(200);
    assert.equal((await Review.findById(review._id)).hidden, false, 'guests cannot hide reviews');

    await request(app).put(`/api/reviews/${review._id}`).set('Authorization', admin.auth).send({ hidden: true }).expect(200);
    assert.equal((await request(app).get('/api/reviews/public')).body.data.length, 0);
  });
});
