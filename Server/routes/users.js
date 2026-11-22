const express = require('express');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { protect, admin, authorize } = require('../middleware/auth');
const { pick } = require('../middleware/sanitize');
const router = express.Router();
router.param('id', require('../middleware/sanitize').validateId);

const USER_FIELDS = ['name', 'email', 'phone', 'role'];

const validationMessage = (error) =>
  Object.values(error.errors).map(err => err.message).join(', ');

const safeUser = (user) => {
  const obj = user.toObject();
  delete obj.password;
  return obj;
};

// Get all users (admin, and reception so it can book on behalf of guests)
router.get('/', protect, authorize('admin', 'receptionist'), async (req, res) => {
  const users = await User.find({}).select('-password');
  res.status(200).json({ success: true, data: users });
});

// Get user by ID (self or admin)
router.get('/:id', protect, async (req, res) => {
  if (req.user.id !== req.params.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  const user = await User.findById(req.params.id).select('-password');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.status(200).json({ success: true, data: user });
});

// Create user (admin) — this is the only way to create staff accounts
router.post('/', protect, admin, async (req, res) => {
  try {
    const data = pick(req.body, USER_FIELDS);
    if (typeof data.email === 'string') data.email = data.email.trim().toLowerCase();
    data.password = req.body.password;

    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const user = await User.create(data);
    res.status(201).json({ success: true, data: safeUser(user) });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: validationMessage(error) });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error during user creation' });
  }
});

// Update user (admin). Uses save() so password hashing and validation run.
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const data = pick(req.body, USER_FIELDS);
    if (typeof data.email === 'string') data.email = data.email.trim().toLowerCase();

    if (user._id.equals(req.user._id) && data.role && data.role !== 'admin') {
      return res.status(400).json({ message: 'You cannot remove your own admin role' });
    }

    if (data.email && data.email !== user.email) {
      const taken = await User.findOne({ email: data.email, _id: { $ne: user._id } });
      if (taken) return res.status(400).json({ message: 'Email is already in use' });
    }

    Object.assign(user, data);
    if (req.body.profilePhoto === '') user.profilePhoto = '';
    if (typeof req.body.password === 'string' && req.body.password) {
      user.password = req.body.password;
    }

    await user.save();
    res.status(200).json({ success: true, data: safeUser(user) });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: validationMessage(error) });
    }
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error during user update' });
  }
});

// Delete user (admin)
router.delete('/:id', protect, admin, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (user._id.equals(req.user._id)) {
    return res.status(400).json({ message: 'You cannot delete your own account' });
  }

  const activeBookings = await Booking.countDocuments({
    user: user._id,
    status: { $in: ['pending', 'confirmed', 'checked_in'] },
  });
  if (activeBookings > 0) {
    return res.status(400).json({ message: 'This user has active bookings. Cancel or complete them first.' });
  }

  await User.findByIdAndDelete(req.params.id);
  res.status(200).json({ success: true, message: 'User deleted successfully' });
});

module.exports = router;
