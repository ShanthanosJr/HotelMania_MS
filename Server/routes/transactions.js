const express = require('express');
const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { protect, admin } = require('../middleware/auth');
const { pick } = require('../middleware/sanitize');
const router = express.Router();
router.param('id', require('../middleware/sanitize').validateId);

const CARD_TYPES = ['credit_card', 'debit_card'];
const TYPES = ['credit_card', 'cash', 'debit_card', 'bank_transfer'];

const populateTxn = (query) =>
  query.populate({
    path: 'booking',
    select: 'user room checkInDate checkOutDate totalPrice status paymentStatus',
    populate: [
      { path: 'user', select: 'name email' },
      { path: 'room', select: 'roomNumber type', populate: { path: 'type', select: 'name' } },
    ],
  });

const newTxnId = () => `TXN-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

/**
 * Reduce whatever the client sent to non-sensitive display data.
 * Full card numbers and CVVs are never persisted.
 * NOTE: this is still a simulated payment — integrate a real gateway
 * (Stripe / PayHere) so card data never reaches this server at all.
 */
const safeCardDetails = (details) => {
  if (!details || typeof details !== 'object') return undefined;
  const digits = String(details.last4 || details.cardNumber || '').replace(/\D/g, '');
  if (digits.length < 4) return undefined;
  return {
    last4: digits.slice(-4),
    cardHolder: typeof details.cardHolder === 'string' ? details.cardHolder.slice(0, 100) : undefined,
    expiryDate: typeof details.expiryDate === 'string' ? details.expiryDate.slice(0, 7) : undefined,
  };
};

// All transactions (admin)
router.get('/', protect, admin, async (req, res) => {
  const transactions = await populateTxn(Transaction.find({}).sort({ createdAt: -1 }));
  res.status(200).json({ success: true, data: transactions });
});

// Transaction by ID (booking owner or staff)
router.get('/:id', protect, async (req, res) => {
  const transaction = await populateTxn(Transaction.findById(req.params.id));
  if (!transaction) {
    return res.status(404).json({ message: 'Transaction not found' });
  }

  const ownerId = transaction.booking && transaction.booking.user && transaction.booking.user._id;
  const isOwner = ownerId && ownerId.equals(req.user._id);
  if (!isOwner && !['admin', 'receptionist'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.status(200).json({ success: true, data: transaction });
});

// Pay for a booking
router.post('/', protect, async (req, res) => {
  const staffUser = ['admin', 'receptionist'].includes(req.user.role);
  const { booking: bookingId, type } = req.body;

  if (!bookingId || !TYPES.includes(type)) {
    return res.status(400).json({ message: 'A booking and a valid payment type are required' });
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' });
  }
  if (!booking.user.equals(req.user._id) && !staffUser) {
    return res.status(403).json({ message: 'Access denied' });
  }
  if (booking.status === 'cancelled') {
    return res.status(400).json({ message: 'This booking has been cancelled' });
  }

  // Guests always pay the server-computed price; front desk may record a different amount
  let amount = booking.totalPrice;
  if (staffUser && req.body.amount !== undefined && req.body.amount !== '') {
    amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
  }

  const paymentDetails = CARD_TYPES.includes(type) ? safeCardDetails(req.body.paymentDetails) : undefined;
  if (CARD_TYPES.includes(type) && !paymentDetails && !staffUser) {
    return res.status(400).json({ message: 'Card details are required' });
  }

  // Atomically claim the booking so it can't be paid twice
  const claimed = await Booking.findOneAndUpdate(
    { _id: booking._id, paymentStatus: { $ne: 'paid' } },
    { paymentStatus: 'paid', ...(booking.status === 'pending' ? { status: 'confirmed' } : {}) },
    { new: true }
  );
  if (!claimed) {
    return res.status(409).json({ message: 'This booking has already been paid' });
  }

  let transaction;
  try {
    transaction = await Transaction.create({
      booking: booking._id,
      amount,
      type,
      transactionId: staffUser && typeof req.body.transactionId === 'string' && req.body.transactionId.trim()
        ? req.body.transactionId.trim()
        : newTxnId(),
      paymentDetails,
    });
  } catch (error) {
    // Roll the booking back so the guest can retry
    await Booking.findByIdAndUpdate(booking._id, { paymentStatus: booking.paymentStatus, status: booking.status });
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Transaction ID already exists' });
    }
    console.error('Error creating transaction:', error);
    return res.status(500).json({ message: 'Server error during payment' });
  }

  // Remember the (masked) card for the guest's next booking
  if (paymentDetails && req.body.saveCard !== false) {
    try {
      const user = await User.findById(booking.user);
      if (user && !user.savedCards.some(c => c.last4 === paymentDetails.last4)) {
        user.savedCards.push({
          cardNumber: '*'.repeat(12) + paymentDetails.last4,
          cardType: type,
          expiryDate: paymentDetails.expiryDate,
          last4: paymentDetails.last4,
          cardHolder: paymentDetails.cardHolder || user.name,
        });
        await user.save();
      }
    } catch (err) {
      console.error('Error saving card to user:', err);
    }
  }

  const populated = await populateTxn(Transaction.findById(transaction._id));
  res.status(201).json({ success: true, data: populated });
});

// Update transaction (admin)
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const update = pick(req.body, ['amount', 'type', 'transactionId', 'status']);
    const transaction = await populateTxn(
      Transaction.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
    );
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (update.status === 'refunded' && transaction.booking) {
      await Booking.findByIdAndUpdate(transaction.booking._id, { paymentStatus: 'refunded' });
    }

    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Transaction ID already exists' });
    }
    console.error('Error updating transaction:', error);
    res.status(500).json({ message: 'Server error during transaction update' });
  }
});

// Delete transaction (admin)
router.delete('/:id', protect, admin, async (req, res) => {
  const transaction = await Transaction.findByIdAndDelete(req.params.id);
  if (!transaction) {
    return res.status(404).json({ message: 'Transaction not found' });
  }
  res.status(200).json({ success: true, message: 'Transaction deleted successfully' });
});

module.exports = router;
