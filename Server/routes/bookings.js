const express = require('express');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Transaction = require('../models/Transaction');
const { protect, admin } = require('../middleware/auth');
const router = express.Router();

// Get all bookings
router.get('/', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate('user', 'name email phone')
      .populate('room', 'roomNumber type pricePerNight hotel')
      .populate('room.hotel', 'name address');
    
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Get user's bookings
router.get('/my-bookings', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate('user', 'name email phone')
      .populate({
        path: 'room',
        populate: [
          { path: 'type', populate: { path: 'hotel', select: 'name address' } },
          { path: 'hotel', select: 'name address' }
        ]
      });
    
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Get booking by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('room', 'roomNumber type pricePerNight hotel')
      .populate('room.hotel', 'name address');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Allow user to view their own booking, or admin to view any booking
    if (req.user.id !== booking.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Create booking
router.post('/', protect, async (req, res) => {
  try {
    const { room, checkInDate, checkOutDate, totalPrice } = req.body;
    
    // Validate required fields
    if (!room || !checkInDate || !checkOutDate || !totalPrice) {
      return res.status(400).json({ message: 'Room, check-in date, check-out date, and total price are required' });
    }
    
    // Check if room exists
    const roomExists = await Room.findById(room);
    if (!roomExists) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    // Check for overlapping bookings (availability check)
    const overlappingBooking = await Booking.findOne({
      room: room,
      status: { $ne: 'cancelled' },
      $or: [
        {
          checkInDate: { $lt: new Date(checkOutDate) },
          checkOutDate: { $gt: new Date(checkInDate) }
        }
      ]
    });
    
    if (overlappingBooking) {
      return res.status(400).json({ message: 'Room is already booked for the selected dates' });
    }
    
    // Create new booking
    const booking = await Booking.create({
      user: req.user.id,
      room,
      checkInDate,
      checkOutDate,
      totalPrice,
      status: 'pending',
      paymentStatus: 'pending'
    });
    
    // Update room status to 'occupied' if check-in date is today or in the past
    if (new Date(checkInDate) <= new Date()) {
      await Room.findByIdAndUpdate(room, { status: 'occupied' });
    }
    
    // Populate the booking for the response
    const populatedBooking = await Booking.findById(booking._id)
      .populate('user', 'name email phone')
      .populate('room', 'roomNumber type pricePerNight hotel')
      .populate('room.hotel', 'name address');
    
    res.status(201).json({
      success: true,
      data: populatedBooking
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    res.status(500).json({ message: error.message || 'Server error during booking creation' });
  }
});

// Update booking
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Check for date conflicts if dates are being updated
    if (req.body.checkInDate || req.body.checkOutDate) {
      const newCheckInDate = req.body.checkInDate || booking.checkInDate;
      const newCheckOutDate = req.body.checkOutDate || booking.checkOutDate;
      
      const overlappingBooking = await Booking.findOne({
        _id: { $ne: req.params.id },
        room: booking.room,
        status: { $ne: 'cancelled' },
        $or: [
          {
            checkInDate: { $lt: new Date(newCheckOutDate) },
            checkOutDate: { $gt: new Date(newCheckInDate) }
          }
        ]
      });
      
      if (overlappingBooking) {
        return res.status(400).json({ message: 'Room is already booked for the selected dates' });
      }
    }
    
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('user', 'name email phone')
      .populate('room', 'roomNumber type pricePerNight hotel')
      .populate('room.hotel', 'name address');
    
    res.status(200).json({
      success: true,
      data: updatedBooking
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    res.status(500).json({ message: error.message || 'Server error during booking update' });
  }
});

// Delete booking
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Update room status back to 'available' if needed
    if (booking.status !== 'cancelled') {
      await Room.findByIdAndUpdate(booking.room, { status: 'available' });
    }
    
    await Booking.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ message: error.message || 'Server error during booking deletion' });
  }
});

module.exports = router;