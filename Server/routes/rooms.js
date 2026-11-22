const express = require('express');
const mongoose = require('mongoose');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const RoomType = require('../models/RoomType');
const Hotel = require('../models/Hotel');
const { protect, admin, staff } = require('../middleware/auth');
const { pick } = require('../middleware/sanitize');
const { BLOCKING_STATUSES } = require('../utils/bookingService');
const router = express.Router();
router.param('id', require('../middleware/sanitize').validateId);

const ROOM_FIELDS = ['roomNumber', 'hotel', 'type', 'status'];

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Allow filtering by hotel ID
    const { hotel } = req.query;
    let filter = {};

    if (hotel) {
      if (!mongoose.isValidObjectId(hotel)) {
        return res.status(400).json({ success: false, message: 'Invalid hotel' });
      }
      filter.hotel = hotel;
    }

    // Date based availability filter
    const { checkIn, checkOut } = req.query;
    if (checkIn && checkOut) {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime()) || checkOutDate <= checkInDate) {
        return res.status(400).json({ success: false, message: 'Invalid check-in / check-out dates' });
      }

      // Rooms under maintenance are never offered
      filter.status = { $ne: 'maintenance' };

      // Find bookings that overlap with the requested range
      // Overlap logic: (StartA < EndB) and (EndA > StartB)
      const conflictBookings = await Booking.find({
        status: { $in: BLOCKING_STATUSES },
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
    const data = pick(req.body, ROOM_FIELDS);
    const roomType = await RoomType.findById(data.type);
    if (!roomType) {
      return res.status(404).json({ success: false, message: 'Room type not found' });
    }

    // Verify hotel exists
    const hotel = await Hotel.findById(data.hotel);
    if (!hotel) {
      return res.status(404).json({ success: false, message: 'Hotel not found' });
    }

    if (!roomType.hotel.equals(hotel._id)) {
      return res.status(400).json({ success: false, message: 'Room type does not belong to this hotel' });
    }

    const room = await Room.create(data);
    const populatedRoom = await Room.findById(room._id).populate('type').populate('hotel');
    res.status(201).json({ success: true, data: populatedRoom });
  } catch (error) {
    console.error('Create room error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Room number already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Update room
// @route   PUT /api/rooms/:id
// @access  Private/Admin (housekeeping & reception may change status only)
router.put('/:id', protect, staff, async (req, res) => {
  try {
    const data = req.user.role === 'admin'
      ? pick(req.body, ROOM_FIELDS)
      : pick(req.body, ['status']);
    const room = await Room.findByIdAndUpdate(req.params.id, data, {
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
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Room number already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Delete room
// @route   DELETE /api/rooms/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const upcoming = await Booking.countDocuments({
      room: room._id,
      status: { $in: BLOCKING_STATUSES },
      checkOutDate: { $gte: new Date() },
    });
    if (upcoming) {
      return res.status(400).json({ success: false, message: `This room has ${upcoming} active/upcoming booking(s). Move or cancel them first.` });
    }

    await room.deleteOne();

    res.status(200).json({ success: true, message: 'Room deleted' });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;