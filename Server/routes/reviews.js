const express = require('express');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const { protect, admin } = require('../middleware/auth');
const router = express.Router();

// Get all reviews
router.get('/', protect, async (req, res) => {
  try {
    const reviews = await Review.find({})
      .populate('user', 'name email')
      .populate('room', 'roomNumber type hotel')
      .populate('room.hotel', 'name address');
    
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Get review by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('user', 'name email')
      .populate('room', 'roomNumber type hotel')
      .populate('room.hotel', 'name address');
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    res.status(200).json({ success: true, data: review });
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Create review
router.post('/', protect, async (req, res) => {
  try {
    const { user, room, rating, comment } = req.body;
    
    // Validate required fields
    if (!room || !rating || !comment) {
      return res.status(400).json({ message: 'Room, rating, and comment are required' });
    }
    
    // Check if room exists
    const roomExists = await Room.findById(room);
    if (!roomExists) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    // Determine the user for the review
    let reviewUser = req.user._id;
    if (req.user.role === 'admin' && user) {
      // Admin can specify the user
      reviewUser = user;
    }
    
    // For non-admin users, check if they have a completed booking
    if (req.user.role !== 'admin') {
      const completedBooking = await Booking.findOne({
        user: req.user._id,
        room: room,
        status: 'checked_out',
        checkOutDate: { $lt: new Date() } // Ensure check-out date has passed
      });
      
      if (!completedBooking) {
        return res.status(403).json({ message: 'You can only review rooms from completed bookings' });
      }
    }
    
    // Check if user has already reviewed this room
    const existingReview = await Review.findOne({
      user: reviewUser,
      room: room
    });
    
    if (existingReview) {
      return res.status(400).json({ message: 'This user has already reviewed this room' });
    }
    
    // Create new review
    const review = await Review.create({
      user: reviewUser,
      room,
      rating,
      comment
    });
    
    // Populate the review for the response
    const populatedReview = await Review.findById(review._id)
      .populate('user', 'name email')
      .populate('room', 'roomNumber type hotel')
      .populate('room.hotel', 'name address');
    
    res.status(201).json({
      success: true,
      data: populatedReview
    });
  } catch (error) {
    console.error('Error creating review:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    res.status(500).json({ message: error.message || 'Server error during review creation' });
  }
});

// Update review
router.put('/:id', protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    // Only allow the user who created the review to update it
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const updatedReview = await Review.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('user', 'name email')
      .populate('room', 'roomNumber type hotel')
      .populate('room.hotel', 'name address');
    
    res.status(200).json({
      success: true,
      data: updatedReview
    });
  } catch (error) {
    console.error('Error updating review:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    res.status(500).json({ message: error.message || 'Server error during review update' });
  }
});

// Delete review
router.delete('/:id', protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    // Only allow the user who created the review or an admin to delete it
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    await Review.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: error.message || 'Server error during review deletion' });
  }
});

module.exports = router;