const express = require('express');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const { protect, isStaff } = require('../middleware/auth');
const { pick } = require('../middleware/sanitize');
const router = express.Router();
router.param('id', require('../middleware/sanitize').validateId);

const populateReview = (query) =>
  query
    .populate('user', 'name email')
    .populate({
      path: 'room',
      select: 'roomNumber type hotel',
      populate: [{ path: 'type', select: 'name' }, { path: 'hotel', select: 'name address' }],
    });

// Public, anonymised reviews for the website (no auth). Must be declared before '/:id'.
router.get('/public', async (req, res) => {
  const reviews = await Review.find({ rating: { $gte: 4 } })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('user', 'name')
    .populate({
      path: 'room',
      select: 'type hotel',
      populate: [{ path: 'type', select: 'name' }, { path: 'hotel', select: 'name' }],
    });

  // Only feature substantive reviews from guests who still have an account
  const featured = reviews.filter(r => r.user && String(r.comment || '').trim().length >= 20);
  const data = featured.map(r => {
    const parts = String((r.user && r.user.name) || 'Guest').trim().split(/\s+/);
    return {
      id: r._id,
      rating: r.rating,
      comment: r.comment,
      // First name + last initial only
      name: parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0],
      roomType: r.room && r.room.type ? r.room.type.name : undefined,
      hotel: r.room && r.room.hotel ? r.room.hotel.name : undefined,
      date: r.createdAt,
    };
  });
  res.status(200).json({ success: true, data });
});

// Get all reviews
router.get('/', protect, async (req, res) => {
  try {
    // Staff see every review; guests only see their own
    const filter = isStaff(req.user) ? {} : { user: req.user._id };
    const reviews = await populateReview(Review.find(filter).sort({ createdAt: -1 }));
    
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get review by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const review = await populateReview(Review.findById(req.params.id));
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (!isStaff(req.user) && !(review.user && review.user._id.equals(req.user._id))) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.status(200).json({ success: true, data: review });
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({ message: 'Server error' });
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
    if (req.user.role === 'admin' && user && typeof user === 'string') {
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
    const populatedReview = await populateReview(Review.findById(review._id));
    
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
    
    res.status(500).json({ message: 'Server error during review creation' });
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
    
    // Only the content of a review can change, never its author or room
    const updatedReview = await populateReview(Review.findByIdAndUpdate(
      req.params.id,
      pick(req.body, ['rating', 'comment']),
      { new: true, runValidators: true }
    ));
    
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
    
    res.status(500).json({ message: 'Server error during review update' });
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
    res.status(500).json({ message: 'Server error during review deletion' });
  }
});

module.exports = router;