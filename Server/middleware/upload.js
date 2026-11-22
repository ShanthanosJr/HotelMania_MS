const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// UPLOAD_DIR lets production point at a persistent volume instead of the app folder.
// For multi-instance / ephemeral hosting, move to S3/Cloudinary.
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../uploads'));
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    // Extension comes from the validated mimetype, never from the client's filename
    cb(null, `${file.fieldname}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ALLOWED[file.mimetype]}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB
});

module.exports = upload;
module.exports.uploadDir = uploadDir;
