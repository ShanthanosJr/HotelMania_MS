const express = require('express');
const mongoose = require('mongoose');
const { HttpError, parseStay, availability } = require('../utils/bookingService');
const { getPricingConfig } = require('../utils/settings');
const router = express.Router();

/** GET /api/availability/config: currency, service charge and tax, so "from" prices match checkout. */
router.get('/config', async (req, res) => {
  res.status(200).json({ success: true, data: await getPricingConfig() });
});

/**
 * GET /api/availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD&guests=2[&hotel=<id>][&roomType=<id>]
 * Public. Lists room types with how many rooms are free for the whole stay and the full price.
 * Guests book a room type; a specific room is assigned by the system.
 */
router.get('/', async (req, res) => {
  try {
    const { checkIn, checkOut, hotel, roomType } = req.query;
    for (const [name, value] of [['hotel', hotel], ['roomType', roomType]]) {
      if (value && !mongoose.isValidObjectId(value)) throw new HttpError(400, `Invalid ${name}`);
    }
    const stay = parseStay(checkIn, checkOut);
    const guests = Math.min(20, Math.max(1, parseInt(req.query.guests, 10) || 1));

    const results = await availability({ ...stay, guests, hotel, roomType });
    res.status(200).json({
      success: true,
      data: {
        checkIn: stay.checkInDate,
        checkOut: stay.checkOutDate,
        nights: stay.nights,
        guests,
        ...(await getPricingConfig()),
        results,
      },
    });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.status).json({ success: false, message: error.message });
    console.error('Availability error:', error);
    res.status(500).json({ success: false, message: 'Could not check availability' });
  }
});

module.exports = router;
