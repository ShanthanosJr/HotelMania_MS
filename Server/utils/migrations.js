/**
 * Small, idempotent data fixes that run once the database connects.
 * Each step is safe to run on every start.
 */
const Booking = require('../models/Booking');
const Room = require('../models/Room');

async function backfillConfirmationCodes() {
  // Raw collection access: Mongoose would invent a fresh default on every read otherwise
  const cursor = Booking.collection.find({ confirmationCode: { $exists: false } }, { projection: { _id: 1 } });
  let count = 0;
  for await (const doc of cursor) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await Booking.collection.updateOne(
          { _id: doc._id, confirmationCode: { $exists: false } },
          { $set: { confirmationCode: Booking.newConfirmationCode() } }
        );
        count++;
        break;
      } catch (err) {
        if (err.code !== 11000) throw err; // retry only on a (very unlikely) duplicate code
      }
    }
  }
  if (count) console.log(`Migration: gave ${count} booking(s) a confirmation code`);
}

async function roomNumbersPerHotel() {
  // Replace the old global unique index on roomNumber with the per-hotel one
  const indexes = await Room.collection.indexes().catch(() => []);
  if (indexes.some(i => i.name === 'roomNumber_1')) {
    await Room.collection.dropIndex('roomNumber_1');
    console.log('Migration: room numbers are now unique per hotel');
  }
  await Room.syncIndexes();
  await Booking.syncIndexes();
}

async function runMigrations() {
  try {
    await roomNumbersPerHotel();
    await backfillConfirmationCodes();
  } catch (err) {
    // Never block the API from starting; log loudly instead
    console.error('Migration error:', err.message);
  }
}

module.exports = { runMigrations };
