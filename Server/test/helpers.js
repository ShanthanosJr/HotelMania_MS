/**
 * Shared test setup: an in-memory MongoDB replica set (so booking transactions run
 * exactly as in production), the Express app, and small data factories.
 * Nothing here touches the real database in .env.
 */
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let replSet;
let app;

const TEST_ENV = {
  NODE_ENV: 'test',
  JWT_SECRET: 'test-secret-that-is-long-enough-1234',
  PAYHERE_MERCHANT_ID: '1211149',
  PAYHERE_MERCHANT_SECRET: 'test-merchant-secret',
  PAYHERE_CURRENCY: 'LKR',
  PAYHERE_SANDBOX: 'true',
  BOOKING_HOLD_MINUTES: '30',
};

async function start() {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  // Set before the app loads so dotenv never fills these from Server/.env
  Object.assign(process.env, TEST_ENV, { MONGO_URI: replSet.getUri('hotelmania_test') });
  app = require('../index');
  await mongoose.connection.asPromise();
  // Indexes (unique email, room number...) must exist before tests rely on them
  await Promise.all(Object.values(mongoose.models).map(m => m.syncIndexes()));
  return app;
}

async function stop() {
  await mongoose.disconnect();
  if (replSet) await replSet.stop();
}

async function reset() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map(c => c.deleteMany({})));
}

let seq = 0;
const unique = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Creates a user with the given role and returns { user, token, auth } where auth is the header value. */
async function createUser(role = 'guest', overrides = {}) {
  const User = require('../models/User');
  const { signToken } = require('../middleware/auth');
  const user = await User.create({
    name: `Test ${role}`,
    email: `${role}-${unique()}@example.test`,
    password: 'password123',
    role,
    ...overrides,
  });
  const token = signToken(user);
  return { user, token, auth: `Bearer ${token}` };
}

/** A hotel with one room type (price 100, up to 2 guests) and the given number of rooms. */
async function createInventory({ rooms = 1, basePrice = 100, maxOccupancy = 2 } = {}) {
  const Hotel = require('../models/Hotel');
  const RoomType = require('../models/RoomType');
  const Room = require('../models/Room');
  const hotel = await Hotel.create({ name: 'Test Hotel', address: '1 Test Road', description: 'For tests' });
  const type = await RoomType.create({ name: 'Deluxe', hotel: hotel._id, basePrice, maxOccupancy, description: 'A room' });
  const created = [];
  for (let i = 0; i < rooms; i++) {
    created.push(await Room.create({ roomNumber: `T${unique()}`, hotel: hotel._id, type: type._id }));
  }
  return { hotel, type, rooms: created };
}

/** YYYY-MM-DD for today + n days (UTC). */
const day = (n) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

module.exports = { start, stop, reset, createUser, createInventory, day, TEST_ENV };
