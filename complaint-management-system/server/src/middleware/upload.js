const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cfg = require('../config');
const AppError = require('../utils/AppError');
const { randomToken } = require('../utils/crypto');

const TYPES = { '.png': { mime: 'image/png', magic: [0x89, 0x50, 0x4e, 0x47] }, '.jpg': { mime: 'image/jpeg', magic: [0xff, 0xd8, 0xff] },
  '.jpeg': { mime: 'image/jpeg', magic: [0xff, 0xd8, 0xff] }, '.pdf': { mime: 'application/pdf', magic: [0x25, 0x50, 0x44, 0x46] } };
const parser = multer({
  storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 3 },
  fileFilter: (req, f, cb) => cb(TYPES[path.extname(f.originalname).toLowerCase()] ? null : new AppError(400, 'Only PNG, JPG or PDF files are allowed.', 'BAD_FILE_TYPE'), true),
}).array('attachment', 3);

// Verifies the real file signature, then stores under a random name.
const attachments = (req, res, next) => parser(req, res, (err) => {
  if (err) return next(err);
  req.savedFiles = [];
  for (const f of req.files || []) {
    const t = TYPES[path.extname(f.originalname).toLowerCase()];
    if (!t.magic.every((b, i) => f.buffer[i] === b)) return next(new AppError(400, 'That file’s contents do not match its type.', 'BAD_FILE_CONTENT'));
  }
  fs.mkdirSync(cfg.uploadDir, { recursive: true });
  for (const f of req.files || []) {
    const ext = path.extname(f.originalname).toLowerCase();
    const filename = `${randomToken(16)}${ext}`;
    fs.writeFileSync(path.join(cfg.uploadDir, filename), f.buffer);
    req.savedFiles.push({ filename, original: f.originalname.slice(0, 120), mime: TYPES[ext].mime, size: f.size });
  }
  next();
});
module.exports = { attachments };
