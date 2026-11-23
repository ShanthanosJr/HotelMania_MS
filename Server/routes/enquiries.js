const express = require('express');
const rateLimit = require('express-rate-limit');
const Enquiry = require('../models/Enquiry');
const Subscriber = require('../models/Subscriber');
const { protect, authorize } = require('../middleware/auth');
const { sendEnquiryEmails } = require('../utils/mailer');
const router = express.Router();
router.param('id', require('../middleware/sanitize').validateId);

// Public forms: stop scripted spam without bothering real guests
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Too many messages, please try again in a few minutes' },
});

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
const dateOrUndefined = (v) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
};
const validationMessage = (error) => Object.values(error.errors).map(e => e.message).join(', ');

const deskRoles = authorize('admin', 'receptionist');

// Contact form (public)
router.post('/', publicLimiter, async (req, res) => {
  // Honeypot: real people never fill the hidden "website" field
  if (str(req.body.website, 200)) return res.status(201).json({ success: true });

  const checkIn = dateOrUndefined(req.body.checkIn);
  const checkOut = dateOrUndefined(req.body.checkOut);
  if (checkIn && checkOut && checkOut <= checkIn) {
    return res.status(400).json({ message: 'Check-out must be after check-in' });
  }
  const guests = Number(req.body.guests);

  try {
    const enquiry = await Enquiry.create({
      name: str(req.body.name, 100),
      email: str(req.body.email, 200),
      phone: str(req.body.phone, 40),
      topic: str(req.body.topic, 20) || 'general',
      checkIn,
      checkOut,
      guests: Number.isInteger(guests) && guests > 0 && guests <= 50 ? guests : undefined,
      message: str(req.body.message, 2000),
    });
    sendEnquiryEmails(enquiry);
    res.status(201).json({ success: true, data: { id: enquiry._id } });
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: validationMessage(error) });
    console.error('Error saving enquiry:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Newsletter sign-up (public). Signing up twice is not an error.
router.post('/newsletter', publicLimiter, async (req, res) => {
  const email = str(req.body.email, 200);
  try {
    const existing = email ? await Subscriber.findOne({ email: email.toLowerCase() }) : null;
    if (!existing) await Subscriber.create({ email, source: str(req.body.source, 40) || 'footer' });
    res.status(201).json({ success: true });
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: validationMessage(error) });
    if (error.code === 11000) return res.status(201).json({ success: true });
    console.error('Error saving subscriber:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Staff inbox
router.get('/', protect, deskRoles, async (req, res) => {
  const filter = {};
  if (Enquiry.STATUSES.includes(req.query.status)) filter.status = req.query.status;
  const enquiries = await Enquiry.find(filter).sort({ createdAt: -1 }).limit(500).populate('handledBy', 'name');
  const counts = await Enquiry.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
  res.json({
    success: true,
    data: enquiries,
    counts: Object.fromEntries(counts.map(c => [c._id, c.n])),
  });
});

router.patch('/:id', protect, deskRoles, async (req, res) => {
  const update = { handledBy: req.user._id };
  if (req.body.status !== undefined) {
    if (!Enquiry.STATUSES.includes(req.body.status)) return res.status(400).json({ message: 'Invalid status' });
    update.status = req.body.status;
  }
  if (req.body.staffNote !== undefined) update.staffNote = str(req.body.staffNote, 1000) || '';
  const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
    .populate('handledBy', 'name');
  if (!enquiry) return res.status(404).json({ message: 'Enquiry not found' });
  res.json({ success: true, data: enquiry });
});

router.get('/subscribers', protect, authorize('admin'), async (req, res) => {
  const subscribers = await Subscriber.find().sort({ createdAt: -1 }).limit(5000);
  res.json({ success: true, data: subscribers });
});

module.exports = router;
