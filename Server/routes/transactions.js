const express = require('express');
const Transaction = require('../models/Transaction');
const Booking = require('../models/Booking');
const { protect, admin } = require('../middleware/auth');
const router = express.Router();

// Get all transactions
router.get('/', protect, admin, async (req, res) => {
  try {
    const transactions = await Transaction.find({})
      .populate('booking', 'user room checkInDate checkOutDate totalPrice status')
      .populate('booking.user', 'name email')
      .populate('booking.room', 'roomNumber type');

    res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Get transaction by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('booking', 'user room checkInDate checkOutDate totalPrice status')
      .populate('booking.user', 'name email')
      .populate('booking.room', 'roomNumber type');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Allow user to view transactions related to their bookings, or admin to view any transaction
    const booking = await Booking.findById(transaction.booking);
    if (req.user.id !== booking.user.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Create transaction
router.post('/', protect, async (req, res) => {
  try {
    const { booking, amount, type, transactionId, paymentDetails } = req.body;

    // Validate required fields
    if (!booking || !amount || !type || !transactionId) {
      return res.status(400).json({ message: 'Booking, amount, type, and transactionId are required' });
    }

    // Check if booking exists
    const bookingExists = await Booking.findById(booking);
    if (!bookingExists) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Create new transaction
    const transaction = await Transaction.create({
      booking,
      amount,
      type,
      amount,
      type,
      transactionId,
      paymentDetails
    });

    // Save card to user if not exists and is a card payment
    if (paymentDetails && (type === 'credit_card' || type === 'debit_card')) {
      try {
        const user = await ((await Booking.findById(booking).select('user')).populate('user')).user;
        if (user) {
          // Ensure savedCards exists
          if (!user.savedCards) user.savedCards = [];

          // Check if card already exists (by last 4 digits)
          const last4 = paymentDetails.cardNumber.slice(-4);
          const cardExists = user.savedCards.some(c => c.last4 === last4);

          if (!cardExists) {
            // Create masked number ************1234
            const masked = '*'.repeat(12) + last4;

            user.savedCards.push({
              cardNumber: masked,
              cardType: type,
              expiryDate: paymentDetails.expiryDate,
              last4: last4,
              cardHolder: paymentDetails.cardHolder || user.name
            });
            await user.save();
          }
        }
      } catch (err) {
        console.error('Error saving card to user:', err);
        // Don't fail the transaction if saving card fails
      }
    }

    // Update booking payment status to 'paid'
    await Booking.findByIdAndUpdate(booking, { paymentStatus: 'paid' });

    // Populate the transaction for the response
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('booking', 'user room checkInDate checkOutDate totalPrice status')
      .populate('booking.user', 'name email')
      .populate('booking.room', 'roomNumber type');

    res.status(201).json({
      success: true,
      data: populatedTransaction
    });
  } catch (error) {
    console.error('Error creating transaction:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }

    res.status(500).json({ message: error.message || 'Server error during transaction creation' });
  }
});

// Update transaction
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('booking', 'user room checkInDate checkOutDate totalPrice status')
      .populate('booking.user', 'name email')
      .populate('booking.room', 'roomNumber type');

    res.status(200).json({
      success: true,
      data: updatedTransaction
    });
  } catch (error) {
    console.error('Error updating transaction:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }

    res.status(500).json({ message: error.message || 'Server error during transaction update' });
  }
});

// Delete transaction
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    await Transaction.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ message: error.message || 'Server error during transaction deletion' });
  }
});

module.exports = router;