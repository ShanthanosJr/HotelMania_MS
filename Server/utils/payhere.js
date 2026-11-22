const crypto = require('crypto');

const md5Upper = (value) => crypto.createHash('md5').update(String(value)).digest('hex').toUpperCase();

const config = () => ({
  merchantId: process.env.PAYHERE_MERCHANT_ID,
  merchantSecret: process.env.PAYHERE_MERCHANT_SECRET,
  sandbox: process.env.PAYHERE_SANDBOX !== 'false',
  currency: process.env.PAYHERE_CURRENCY || 'LKR',
  publicApiUrl: (process.env.PUBLIC_API_URL || '').replace(/\/$/, ''),
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, ''),
});

const isConfigured = () => {
  const c = config();
  return Boolean(c.merchantId && c.merchantSecret);
};

const formatAmount = (amount) => Number(amount).toFixed(2);

// hash = UPPER(md5(merchant_id + order_id + amount + currency + UPPER(md5(secret))))
const checkoutHash = ({ orderId, amount, currency }) => {
  const c = config();
  return md5Upper(c.merchantId + orderId + formatAmount(amount) + currency + md5Upper(c.merchantSecret));
};

// md5sig = UPPER(md5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + UPPER(md5(secret))))
const notifySignature = ({ merchant_id, order_id, payhere_amount, payhere_currency, status_code }) => {
  const c = config();
  return md5Upper(merchant_id + order_id + payhere_amount + payhere_currency + status_code + md5Upper(c.merchantSecret));
};

const verifyNotification = (body) => {
  const expected = notifySignature(body);
  const given = String(body.md5sig || '');
  return given.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
};

// order_id embeds the booking id so the notification can be matched; a suffix keeps
// each payment attempt unique.
const makeOrderId = (bookingId) => `HM${bookingId}T${Date.now().toString(36).toUpperCase()}`;
const bookingIdFromOrderId = (orderId) => {
  const m = /^HM([a-f0-9]{24})T[A-Z0-9]+$/i.exec(String(orderId || ''));
  return m ? m[1] : null;
};

const STATUS = { SUCCESS: '2', PENDING: '0', CANCELED: '-1', FAILED: '-2', CHARGEDBACK: '-3' };

module.exports = {
  config,
  isConfigured,
  formatAmount,
  checkoutHash,
  notifySignature,
  verifyNotification,
  makeOrderId,
  bookingIdFromOrderId,
  STATUS,
};
