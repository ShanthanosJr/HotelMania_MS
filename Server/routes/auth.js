const express = require('express');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { protect, signToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

// Brute-force protection for credential endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again in 15 minutes' },
});

const publicUser = (user) => ({
  id: user._id,
  userId: user.userId,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  profilePhoto: user.profilePhoto,
  savedCards: user.savedCards,
});

const validationMessage = (error) =>
  Object.values(error.errors).map(err => err.message).join(', ');

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Register — always creates a guest. Staff accounts are created by admins via /api/users.
router.post('/register', authLimiter, async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name : undefined;
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : undefined;
    const password = typeof req.body.password === 'string' ? req.body.password : undefined;
    const phone = typeof req.body.phone === 'string' ? req.body.phone : undefined;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const user = await User.create({ name, email, password, phone, role: 'guest' });

    res.status(201).json({ success: true, token: signToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: validationMessage(error) });
    }
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.status(200).json({ success: true, token: signToken(user), user: publicUser(user) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Logout revokes every token issued so far for this user
router.post('/logout', protect, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $inc: { tokenVersion: 1 } });
  res.status(200).json({ message: 'Logged out successfully' });
});

router.get('/profile', protect, async (req, res) => {
  res.status(200).json({ success: true, user: publicUser(req.user) });
});

// Update own details
router.put('/update-details', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { name, phone, profilePhoto } = req.body;
    if (typeof name === 'string' && name.trim()) user.name = name;
    if (typeof phone === 'string') user.phone = phone;
    // Only allow clearing the photo here; uploads go through /profile-photo
    if (profilePhoto === '') user.profilePhoto = '';

    await user.save();
    res.status(200).json({ success: true, user: publicUser(user) });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: validationMessage(error) });
    }
    console.error('Update details error:', error);
    res.status(500).json({ message: 'Server error during update' });
  }
});

// Upload own profile photo (multipart field "photo")
router.put('/profile-photo', protect, upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Please choose an image to upload' });
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { profilePhoto: `/uploads/${req.file.filename}` },
    { new: true }
  );
  res.status(200).json({ success: true, user: publicUser(user) });
});

module.exports = router;
