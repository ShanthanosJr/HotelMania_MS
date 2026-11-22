const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const h = require('./helpers');

let app;
before(async () => { app = await h.start(); });
after(h.stop);
beforeEach(h.reset);

describe('auth', () => {
  it('registers a guest, logs in and reads the profile', async () => {
    const reg = await request(app).post('/api/auth/register')
      .send({ name: 'Ann Guest', email: 'Ann@Example.test', password: 'secret123' });
    assert.equal(reg.status, 201);
    assert.equal(reg.body.user.role, 'guest');
    assert.equal(reg.body.user.email, 'ann@example.test', 'email is normalised');
    assert.equal(reg.body.user.password, undefined, 'password hash is never returned');

    const login = await request(app).post('/api/auth/login')
      .send({ email: 'ann@example.test', password: 'secret123' });
    assert.equal(login.status, 200);

    const me = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${login.body.token}`);
    assert.equal(me.status, 200);
    assert.equal(me.body.user.name, 'Ann Guest');
  });

  it('ignores a role sent at registration (no self-promotion to admin)', async () => {
    const reg = await request(app).post('/api/auth/register')
      .send({ name: 'Mallory', email: 'm@example.test', password: 'secret123', role: 'admin' });
    assert.equal(reg.status, 201);
    assert.equal(reg.body.user.role, 'guest');
  });

  it('rejects duplicate emails', async () => {
    const body = { name: 'A', email: 'dup@example.test', password: 'secret123' };
    await request(app).post('/api/auth/register').send(body).expect(201);
    await request(app).post('/api/auth/register').send(body).expect(400);
  });

  it('rejects a wrong password and a NoSQL-injection login', async () => {
    await h.createUser('guest', { email: 'victim@example.test' });
    await request(app).post('/api/auth/login')
      .send({ email: 'victim@example.test', password: 'nope' }).expect(401);
    await request(app).post('/api/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } }).expect(400);
  });

  it('logout revokes the token', async () => {
    const { auth } = await h.createUser('guest');
    await request(app).get('/api/auth/profile').set('Authorization', auth).expect(200);
    await request(app).post('/api/auth/logout').set('Authorization', auth).expect(200);
    await request(app).get('/api/auth/profile').set('Authorization', auth).expect(401);
  });

  it('requires a valid token', async () => {
    await request(app).get('/api/auth/profile').expect(401);
    await request(app).get('/api/auth/profile').set('Authorization', 'Bearer not-a-token').expect(401);
  });
});
