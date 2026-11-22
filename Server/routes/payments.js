const express = require('express');
const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');
const payhere = require('../utils/payhere');
const {
  HttpError,
  HOLD_MINUTES,
  findOverlap,
  withRoomLock,
  populateBooking,
} = require('../utils/bookingService');
const { sendBookingEmail } = require('../utils/mailer');
const router = express.Router();

const splitName = (name = '') => {
  const parts = String(name).trim().split(/\s+/);
  return { first: parts[0] || 'Guest', last: parts.slice(1).join(' ') || '-' };
};

/**
 * POST /api/payments/payhere/checkout { booking }
 * Returns the signed payment object for the PayHere JS SDK (payhere.startPayment).
 * The merchant secret never leaves the server.
 */
router.post('/payhere/checkout', protect, async (req, res) => {
  try {
    if (!payhere.isConfigured()) throw new HttpError(503, 'Online payments are not configured');
    const cfg = payhere.config();

    const booking = await Booking.findById(req.body.booking).populate({
      path: 'room',
      select: 'roomNumber type hotel',
      populate: [{ path: 'type', select: 'name' }, { path: 'hotel', select: 'name' }],
    });
    if (!booking) throw new HttpError(404, 'Booking not found');
    if (!booking.user.equals(req.user._id)) throw new HttpError(403, 'Access denied');
    if (booking.paymentStatus === 'paid') throw new HttpError(409, 'This booking is already paid');
    if (booking.status === 'cancelled') throw new HttpError(400, 'This booking has been cancelled');

    // If the hold expired, re-check the room is still free and renew the hold
    if (booking.holdExpiresAt && booking.holdExpiresAt.getTime() <= Date.now()) {
      await withRoomLock(booking.room._id, async (session) => {
        const overlap = await findOverlap(booking.room._id, booking.checkInDate, booking.checkOutDate, booking._id, session);
        if (overlap) throw new HttpError(409, 'Sorry, this room is no longer available for these dates. Please make a new booking.');
        await Booking.updateOne(
          { _id: booking._id },
          { holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60 * 1000) },
          { session }
        );
      });
    }

    const orderId = payhere.makeOrderId(booking._id);
    const amount = payhere.formatAmount(booking.totalPrice);
    const nights = Math.round((booking.checkOutDate - booking.checkInDate) / 86400000);
    const roomName = (booking.room.type && booking.room.type.name) || 'Room';
    const hotelName = (booking.room.hotel && booking.room.hotel.name) || 'HotelMania';
    const { first, last } = splitName((booking.guestDetails && booking.guestDetails.name) || req.user.name);

    const notifyBase = cfg.publicApiUrl || `${req.protocol}://${req.get('host')}`;

    res.status(200).json({
      success: true,
      payment: {
        sandbox: cfg.sandbox,
        merchant_id: cfg.merchantId,
        return_url: `${cfg.clientUrl}/bookings?payment=return`,
        cancel_url: `${cfg.clientUrl}/bookings?payment=cancelled`,
        notify_url: `${notifyBase}/api/payments/payhere/notify`,
        order_id: orderId,
        items: `${hotelName} - ${roomName} (${nights} night${nights === 1 ? '' : 's'}) ${booking.confirmationCode || ''}`.trim().slice(0, 250),
        amount,
        currency: cfg.currency,
        hash: payhere.checkoutHash({ orderId, amount, currency: cfg.currency }),
        first_name: first,
        last_name: last,
        email: (booking.guestDetails && booking.guestDetails.email) || req.user.email,
        phone: (booking.guestDetails && booking.guestDetails.phone) || req.user.phone || '0000000000',
        address: 'N/A',
        city: 'Colombo',
        country: 'Sri Lanka',
        custom_1: String(booking._id),
      },
    });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.status).json({ message: error.message });
    console.error('PayHere checkout error:', error);
    res.status(500).json({ message: 'Could not start payment' });
  }
});

/**
 * POST /api/payments/payhere/notify  (server-to-server from PayHere, form-encoded)
 * The only place a booking is marked paid for online payments.
 * Always answers 200 so PayHere doesn't retry forever; problems are logged.
 */
router.post('/payhere/notify', async (req, res) => {
  const body = req.body || {};
  try {
    const cfg = payhere.config();
    if (!payhere.isConfigured() || String(body.merchant_id) !== String(cfg.merchantId)) {
      console.warn('PayHere notify: merchant mismatch or not configured');
      return res.status(200).send('ignored');
    }
    if (!payhere.verifyNotification(body)) {
      console.warn('PayHere notify: invalid signature for order', body.order_id);
      return res.status(200).send('invalid signature');
    }

    const bookingId = payhere.bookingIdFromOrderId(body.order_id);
    const booking = bookingId && await Booking.findById(bookingId);
    if (!booking) {
      console.warn('PayHere notify: unknown order', body.order_id);
      return res.status(200).send('unknown order');
    }

    const status = String(body.status_code);

    if (status === payhere.STATUS.CHARGEDBACK) {
      await Booking.updateOne({ _id: booking._id }, { paymentStatus: 'refunded' });
      await Transaction.updateOne({ transactionId: body.payment_id }, { status: 'refunded' });
      console.warn('PayHere chargeback for booking', String(booking._id));
      return res.status(200).send('ok');
    }

    if (status !== payhere.STATUS.SUCCESS) {
      // pending / cancelled / failed: leave the booking unpaid (the hold will expire)
      return res.status(200).send('ok');
    }

    // Amount and currency must match what we charged for this booking
    if (body.payhere_amount !== payhere.formatAmount(booking.totalPrice) || body.payhere_currency !== cfg.currency) {
      console.error('PayHere notify: amount/currency mismatch', body.order_id, body.payhere_amount, body.payhere_currency);
      return res.status(200).send('amount mismatch');
    }

    // Idempotent: PayHere may send the same notification more than once
    const existing = await Transaction.findOne({ transactionId: String(body.payment_id) });
    if (existing) return res.status(200).send('ok');

    // If the hold expired and someone else took the room meanwhile, keep it pending for staff to resolve
    const conflict = await findOverlap(booking.room, booking.checkInDate, booking.checkOutDate, booking._id);
    if (conflict) {
      console.error('PayHere: paid booking', String(booking._id), 'now overlaps', String(conflict._id), '- needs staff attention');
    }

    const cardNo = String(body.card_no || '').replace(/\D/g, '');
    await Transaction.create({
      booking: booking._id,
      amount: Number(body.payhere_amount),
      type: 'payhere',
      transactionId: String(body.payment_id),
      paymentDetails: {
        last4: cardNo.slice(-4) || undefined,
        cardHolder: body.card_holder_name ? String(body.card_holder_name).slice(0, 100) : undefined,
        expiryDate: body.card_expiry ? String(body.card_expiry).slice(0, 7) : undefined,
        method: body.method ? String(body.method).slice(0, 30) : undefined,
      },
    });

    await Booking.updateOne(
      { _id: booking._id },
      {
        paymentStatus: 'paid',
        ...(booking.status === 'pending' && !conflict ? { status: 'confirmed' } : {}),
        $unset: { holdExpiresAt: 1 },
      }
    );

    if (!conflict) {
      populateBooking(Booking.findById(booking._id))
        .then(b => b && sendBookingEmail('confirmed', b))
        .catch(() => undefined);
    }

    return res.status(200).send('ok');
  } catch (error) {
    if (error.code === 11000) return res.status(200).send('ok'); // duplicate notification race
    console.error('PayHere notify error:', error);
    return res.status(500).send('error'); // let PayHere retry
  }
});

module.exports = router;
