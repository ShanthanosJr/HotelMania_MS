// Strips MongoDB operator keys ($...) and dotted keys from user input so that
// payloads like {"email": {"$gt": ""}} cannot be used for NoSQL injection.
// (Express 5's default "simple" query parser never produces nested objects,
// so only body and params need cleaning.)
const clean = (value) => {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete value[key];
      } else {
        value[key] = clean(value[key]);
      }
    }
  }
  return value;
};

const sanitize = (req, res, next) => {
  if (req.body) clean(req.body);
  if (req.params) clean(req.params);
  next();
};

// Copy only the allowed keys that are present in the source object
const pick = (source, keys) => {
  const out = {};
  for (const key of keys) {
    if (source && source[key] !== undefined) out[key] = source[key];
  }
  return out;
};

module.exports = { sanitize, pick };

// router.param handler: reject malformed ObjectIds with 400 instead of a 500 CastError
const validateId = (req, res, next, id) => {
  // eslint-disable-next-line global-require
  if (!require('mongoose').isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  next();
};

module.exports.validateId = validateId;
