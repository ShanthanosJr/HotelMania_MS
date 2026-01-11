const express = require('express');
const User = require('../models/User');
const { protect, admin } = require('../middleware/auth');
const router = express.Router();

// Get all users
router.get('/', protect, admin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password'); // exclude password from results
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Get user by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Allow user to view their own profile, or admin to view any user
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Create user
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, email, password, phone, role, profilePhoto } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: role || 'guest',
      profilePhoto: profilePhoto || ''
    });

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profilePhoto: user.profilePhoto,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }

    res.status(500).json({ message: error.message || 'Server error during user creation' });
  }
});

// Update user
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { name, email, password, phone, role, profilePhoto } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user fields
    // Exclude userId to prevent it from being changed
    const updateData = { name, email, phone, role };

    // Only update profilePhoto if provided
    if (profilePhoto !== undefined) {
      updateData.profilePhoto = profilePhoto;
    }

    // Only update password if provided
    if (password) {
      updateData.password = password;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }

    res.status(500).json({ message: error.message || 'Server error during user update' });
  }
});

// Delete user
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deleting their own account
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: error.message || 'Server error during user deletion' });
  }
});

module.exports = router;