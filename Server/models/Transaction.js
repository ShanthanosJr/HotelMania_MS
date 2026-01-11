const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking is required'],
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: 0,
  },
  type: {
    type: String,
    enum: {
      values: ['credit_card', 'cash', 'debit_card', 'bank_transfer'],
      message: 'Transaction type must be credit_card, cash, debit_card, or bank_transfer'
    },
    required: [true, 'Transaction type is required'],
  },
  date: {
    type: Date,
    default: Date.now,
  },
  transactionId: {
    type: String,
    required: [true, 'Transaction ID is required'],
    unique: true,
    trim: true,
  },
  paymentDetails: {
    cardNumber: {
      type: String,
      required: false,
    },
    expiryDate: {
      type: String,
      required: false,
    },
    cvv: {
      type: String,
      required: false,
    }
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Transaction', transactionSchema);