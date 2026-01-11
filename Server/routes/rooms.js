const express = require('express');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const RoomType = require('../models/RoomType');
const Hotel = require('../models/Hotel');
const { protect, admin } = require('../middleware/auth');
const router = express.Router();

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Allow filtering by hotel ID
    const { hotel } = req.query;
    let filter = {};

    if (hotel) {
      filter.hotel = hotel;
    }

    // Date based availability filter
    const { checkIn, checkOut } = req.query;
    if (checkIn && checkOut) {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);

      // Find bookings that overlap with the requested range
      // Overlap logic: (StartA < EndB) and (EndA > StartB)
      const conflictBookings = await Booking.find({
        status: { $ne: 'cancelled' },
        room: { $exists: true }, // Ensure room field exists
        $or: [
          {
            checkInDate: { $lt: checkOutDate },
            checkOutDate: { $gt: checkInDate }
          }
        ]
      }).select('room');

      const conflictRoomIds = conflictBookings.map(b => b.room);

      // Exclude these rooms
      if (conflictRoomIds.length > 0) {
        filter._id = { $nin: conflictRoomIds };
      }
    }

    const rooms = await Room.find(filter).populate('type').populate('hotel');
    res.status(200).json({ success: true, count: rooms.length, data: rooms });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get single room
// @route   GET /api/rooms/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate('type').populate('hotel');

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    res.status(200).json({ success: true, data: room });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Create room
// @route   POST /api/rooms
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  try {
    // Verify room type exists
    const roomType = await RoomType.findById(req.body.type);
    if (!roomType) {
      return res.status(404).json({ success: false, message: 'Room type not found' });
    }

    // Verify hotel exists
    const hotel = await Hotel.findById(req.body.hotel);
    if (!hotel) {
      return res.status(404).json({ success: false, message: 'Hotel not found' });
    }

    const room = await Room.create(req.body);
    const populatedRoom = await Room.findById(room._id).populate('type').populate('hotel');
    res.status(201).json({ success: true, data: populatedRoom });
  } catch (error) {
    console.error('Create room error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Update room
// @route   PUT /api/rooms/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('type').populate('hotel');

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    res.status(200).json({ success: true, data: room });
  } catch (error) {
    console.error('Update room error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Delete room
// @route   DELETE /api/rooms/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    res.status(200).json({ success: true, message: 'Room deleted' });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;