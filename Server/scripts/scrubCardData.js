// One-off: remove full card numbers / CVVs stored by older versions of the app.
// Keeps only the last 4 digits. Run once: node scripts/scrubCardData.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const col = mongoose.connection.collection('transactions');
  const cursor = col.find({ $or: [{ 'paymentDetails.cardNumber': { $exists: true } }, { 'paymentDetails.cvv': { $exists: true } }] });
  let n = 0;
  for await (const t of cursor) {
    const digits = String(t.paymentDetails.cardNumber || '').replace(/\D/g, '');
    await col.updateOne(
      { _id: t._id },
      {
        $set: { 'paymentDetails.last4': digits.slice(-4) || undefined },
        $unset: { 'paymentDetails.cardNumber': '', 'paymentDetails.cvv': '' },
      }
    );
    n += 1;
  }
  console.log(`Scrubbed ${n} transaction(s).`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
