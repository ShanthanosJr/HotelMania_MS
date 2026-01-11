const express = require('express');
const Hotel = require('../models/Hotel');
const { protect, admin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

// @desc    Get all hotels
// @route   GET /api/hotels
// @access  Public
router.get('/', async (req, res) => {
  try {
    const hotels = await Hotel.find({});
    res.status(200).json({ success: true, count: hotels.length, data: hotels });
  } catch (error) {
    console.error('Get hotels error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get single hotel
// @route   GET /api/hotels/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id).populate('roomTypes');

    if (!hotel) {
      return res.status(404).json({ success: false, message: 'Hotel not found' });
    }

    res.status(200).json({ success: true, data: hotel });
  } catch (error) {
    console.error('Get hotel error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Create hotel
// @route   POST /api/hotels
// @access  Private/Admin
router.post('/', protect, admin, upload.array('photos', 5), async (req, res) => {
  try {
    const hotelData = req.body;

    // Parse JSON strings back to objects/arrays if sent as form-data
    if (typeof hotelData.amenities === 'string') {
      // Handle comma-separated list or JSON string
      // Assuming the client sends it as comma-separated from the implementation plan
      // But if it was sent as a JSON stringified array, we try that first
      try {
        const parsed = JSON.parse(hotelData.amenities);
        if (Array.isArray(parsed)) hotelData.amenities = parsed;
      } catch (e) {
        // Fallback to splitting by comma if not JSON
        hotelData.amenities = hotelData.amenities.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    if (typeof hotelData.contactInfo === 'string') {
      try {
        hotelData.contactInfo = JSON.parse(hotelData.contactInfo);
      } catch (e) {
        console.error('Error parsing contactInfo:', e);
      }
    }

    // Process uploaded files
    if (req.files && req.files.length > 0) {
      hotelData.photos = req.files.map(file => `/uploads/${file.filename}`);
    } else {
      hotelData.photos = [];
    }

    const hotel = await Hotel.create(hotelData);
    res.status(201).json({ success: true, data: hotel });
  } catch (error) {
    console.error('Create hotel error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Update hotel
// @route   PUT /api/hotels/:id
// @access  Private/Admin
router.put('/:id', protect, admin, upload.array('photos', 5), async (req, res) => {
  try {
    let hotel = await Hotel.findById(req.params.id);
    if (!hotel) {
      return res.status(404).json({ success: false, message: 'Hotel not found' });
    }

    const updateData = req.body;

    // Handle amenities
    if (typeof updateData.amenities === 'string') {
      try {
        const parsed = JSON.parse(updateData.amenities);
        if (Array.isArray(parsed)) updateData.amenities = parsed;
      } catch (e) {
        updateData.amenities = updateData.amenities.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    if (typeof updateData.contactInfo === 'string') {
      try {
        updateData.contactInfo = JSON.parse(updateData.contactInfo);
      } catch (e) {
        console.error('Error parsing contactInfo:', e);
      }
    }

    // Handle photos: append new ones to existing
    if (req.files && req.files.length > 0) {
      const newPhotos = req.files.map(file => `/uploads/${file.filename}`);
      // If we want to replace, we would just use newPhotos.
      // But typically "update" might mean add to gallery or replace main.
      // Let's assume append for now, or if the user sends an explicit list of 'kept' photos we'd use that.
      // Since the requirement is basic upload, appending is safer than wiping.

      // However, if the user wants to DELETE photos, we need a mechanism.
      // For now, let's just append.
      updateData.photos = [...(hotel.photos || []), ...newPhotos];
    } else {
      // If no new files, don't overwrite photos with undefined/empty unless intended.
      // If the client sends 'photos' field with existing urls, we use that.
      // But with multipart/form-data, arrays of strings are tricky.
      // Let's preserve existing photos if no new ones are uploaded, OR if 'photos' is sent in body, we use it (to handle deletions likely not supported yet but good for safety).
      delete updateData.photos;
    }

    hotel = await Hotel.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, data: hotel });
  } catch (error) {
    console.error('Update hotel error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Delete hotel
// @route   DELETE /api/hotels/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const hotel = await Hotel.findByIdAndDelete(req.params.id);

    if (!hotel) {
      return res.status(404).json({ success: false, message: 'Hotel not found' });
    }

    res.status(200).json({ success: true, message: 'Hotel deleted' });
  } catch (error) {
    console.error('Delete hotel error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;