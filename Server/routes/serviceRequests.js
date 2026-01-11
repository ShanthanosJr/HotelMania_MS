const express = require('express');
const ServiceRequest = require('../models/ServiceRequest');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const { protect, admin } = require('../middleware/auth');
const router = express.Router();

// Get all service requests
router.get('/', protect, async (req, res) => {
  try {
    let serviceRequests;
    
    if (req.user.role === 'admin') {
      // Admin can see all service requests
      serviceRequests = await ServiceRequest.find({})
        .populate('room', 'roomNumber type hotel')
        .populate('room.hotel', 'name address');
    } else {
      // Regular user can only see service requests for rooms they're currently booked in or have booked
      const userBookings = await Booking.find({ user: req.user.id });
      const userRoomIds = userBookings.map(booking => booking.room);
      
      serviceRequests = await ServiceRequest.find({ room: { $in: userRoomIds } })
        .populate('room', 'roomNumber type hotel')
        .populate('room.hotel', 'name address');
    }
    
    res.status(200).json({ success: true, data: serviceRequests });
  } catch (error) {
    console.error('Error fetching service requests:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Get service request by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const serviceRequest = await ServiceRequest.findById(req.params.id)
      .populate('room', 'roomNumber type hotel')
      .populate('room.hotel', 'name address');
    
    if (!serviceRequest) {
      return res.status(404).json({ message: 'Service request not found' });
    }
    
    // Check if user is authorized to view this service request
    if (req.user.role !== 'admin') {
      // Check if user has a booking for this room
      const userBookings = await Booking.find({ user: req.user.id });
      const userRoomIds = userBookings.map(booking => booking.room);
      
      if (!userRoomIds.includes(serviceRequest.room._id.toString())) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    res.status(200).json({ success: true, data: serviceRequest });
  } catch (error) {
    console.error('Error fetching service request:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Create service request
router.post('/', protect, async (req, res) => {
  try {
    const { room, type } = req.body;
    
    // Validate required fields
    if (!room || !type) {
      return res.status(400).json({ message: 'Room and type are required' });
    }
    
    // Check if room exists
    const roomExists = await Room.findById(room);
    if (!roomExists) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    // Check if user has a current booking for this room
    const currentBooking = await Booking.findOne({
      user: req.user.id,
      room: room,
      status: { $in: ['confirmed', 'checked_in'] },
      checkInDate: { $lte: new Date() },
      checkOutDate: { $gte: new Date() }
    });
    
    if (!currentBooking && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only create service requests for rooms you are currently staying in' });
    }
    
    // Create new service request
    const serviceRequest = await ServiceRequest.create({
      room,
      type,
      status: 'pending'
    });
    
    // Populate the service request for the response
    const populatedServiceRequest = await ServiceRequest.findById(serviceRequest._id)
      .populate('room', 'roomNumber type hotel')
      .populate('room.hotel', 'name address');
    
    res.status(201).json({
      success: true,
      data: populatedServiceRequest
    });
  } catch (error) {
    console.error('Error creating service request:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    res.status(500).json({ message: error.message || 'Server error during service request creation' });
  }
});

// Update service request
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const serviceRequest = await ServiceRequest.findById(req.params.id);
    
    if (!serviceRequest) {
      return res.status(404).json({ message: 'Service request not found' });
    }
    
    const updatedServiceRequest = await ServiceRequest.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('room', 'roomNumber type hotel')
      .populate('room.hotel', 'name address');
    
    res.status(200).json({
      success: true,
      data: updatedServiceRequest
    });
  } catch (error) {
    console.error('Error updating service request:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    res.status(500).json({ message: error.message || 'Server error during service request update' });
  }
});

// Delete service request
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const serviceRequest = await ServiceRequest.findById(req.params.id);
    
    if (!serviceRequest) {
      return res.status(404).json({ message: 'Service request not found' });
    }
    
    await ServiceRequest.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Service request deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting service request:', error);
    res.status(500).json({ message: error.message || 'Server error during service request deletion' });
  }
});

module.exports = router;