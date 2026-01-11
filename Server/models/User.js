const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');


const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
  },
  phone: {
    type: String,
    trim: true,
  },
  role: {
    type: String,
    enum: {
      values: ['guest', 'admin', 'receptionist', 'housekeeping'],
      message: 'Role must be either guest, admin, receptionist, or housekeeping'
    },
    default: 'guest',
  },
  bookingsHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
  }],
  userId: {
    type: String,
    unique: true,
  },
  profilePhoto: {
    type: String, // Base64 string
    default: '',
  },
  savedCards: [{
    cardNumber: String, // Masked
    cardType: String,
    expiryDate: String,
    last4: String,
    cardHolder: String,
  }],
}, {
  timestamps: true,
});

// Generate userId before saving
userSchema.pre('save', async function () {
  // Only generate userId if it doesn't exist
  if (!this.userId) {
    // Generate a random 6-digit number
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    this.userId = `USR-${randomNum}`;
  }

  if (!this.isModified('password')) {
    return;
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

module.exports = mongoose.model('User', userSchema);