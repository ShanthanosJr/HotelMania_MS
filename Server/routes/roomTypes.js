const express = require('express');
const RoomType = require('../models/RoomType');
const Hotel = require('../models/Hotel');
const { protect, admin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

// @desc    Get all room types
// @route   GET /api/room-types
// @access  Public
router.get('/', async (req, res) => {
  try {
    const roomTypes = await RoomType.find({}).populate('hotel');
    res.status(200).json({ success: true, count: roomTypes.length, data: roomTypes });
  } catch (error) {
    console.error('Get room types error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get single room type
// @route   GET /api/room-types/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const roomType = await RoomType.findById(req.params.id).populate('hotel');

    if (!roomType) {
      return res.status(404).json({ success: false, message: 'Room type not found' });
    }

    res.status(200).json({ success: true, data: roomType });
  } catch (error) {
    console.error('Get room type error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Create room type
// @route   POST /api/room-types
// @access  Private/Admin
router.post('/', protect, admin, upload.array('photos', 5), async (req, res) => {
  try {
    const roomTypeData = req.body;

    // Verify hotel exists
    const hotel = await Hotel.findById(roomTypeData.hotel);
    if (!hotel) {
      return res.status(404).json({ success: false, message: 'Hotel not found' });
    }

    // Parse amenities if sent as string (FormData)
    if (typeof roomTypeData.amenities === 'string') {
      try {
        const parsed = JSON.parse(roomTypeData.amenities);
        if (Array.isArray(parsed)) roomTypeData.amenities = parsed;
      } catch (e) {
        roomTypeData.amenities = roomTypeData.amenities.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    // Process uploaded files
    if (req.files && req.files.length > 0) {
      roomTypeData.photos = req.files.map(file => `/uploads/${file.filename}`);
    } else {
      roomTypeData.photos = [];
    }

    const roomType = await RoomType.create(roomTypeData);

    // Add room type to hotel's roomTypes array
    await Hotel.findByIdAndUpdate(roomTypeData.hotel, {
      $addToSet: { roomTypes: roomType._id }
    });

    const populatedRoomType = await RoomType.findById(roomType._id).populate('hotel');
    res.status(201).json({ success: true, data: populatedRoomType });
  } catch (error) {
    console.error('Create room type error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Update room type
// @route   PUT /api/room-types/:id
// @access  Private/Admin
router.put('/:id', protect, admin, upload.array('photos', 5), async (req, res) => {
  try {
    let updateData = req.body;

    // Handle amenities parsing
    if (typeof updateData.amenities === 'string') {
      try {
        const parsed = JSON.parse(updateData.amenities);
        if (Array.isArray(parsed)) updateData.amenities = parsed;
      } catch (e) {
        updateData.amenities = updateData.amenities.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    // Fetch existing room type to preserve photos if needed
    const existingRoomType = await RoomType.findById(req.params.id);
    if (!existingRoomType) {
      return res.status(404).json({ success: false, message: 'Room type not found' });
    }

    // Handle photos
    if (req.files && req.files.length > 0) {
      const newPhotos = req.files.map(file => `/uploads/${file.filename}`);
      updateData.photos = [...(existingRoomType.photos || []), ...newPhotos];
    } else {
      // If no new files, we might strictly delete 'photos' from updateData to prevent overwriting with string/undefined
      // unless we want to allow rewriting properities. 
      // Safer to just delete if not intended to change.
      delete updateData.photos;
    }

    const roomType = await RoomType.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    const populatedRoomType = await RoomType.findById(roomType._id).populate('hotel');
    res.status(200).json({ success: true, data: populatedRoomType });
  } catch (error) {
    console.error('Update room type error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Delete room type
// @route   DELETE /api/room-types/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const roomType = await RoomType.findByIdAndDelete(req.params.id);

    if (!roomType) {
      return res.status(404).json({ success: false, message: 'Room type not found' });
    }

    // Remove room type from hotel's roomTypes array
    await Hotel.findByIdAndUpdate(roomType.hotel, {
      $pull: { roomTypes: roomType._id }
    });

    res.status(200).json({ success: true, message: 'Room type deleted' });
  } catch (error) {
    console.error('Delete room type error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;