/**
 * Middleware Multer — preuve de paiement (mémoire, 8 Mo).
 */

const multer = require('multer');
const { MAX_BYTES, ALLOWED_MIME } = require('../services/payment-proof.service');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      const err = new Error('Format non accepté — PDF, JPG, PNG, WEBP ou GIF uniquement');
      err.statusCode = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

function paymentProofUpload(req, res, next) {
  upload.single('proof')(req, res, (err) => {
    if (err) {
      const status = err.statusCode || (err.code === 'LIMIT_FILE_SIZE' ? 400 : 400);
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Fichier trop volumineux (max 8 Mo)'
          : err.message || 'Upload impossible';
      return res.status(status).json({ error: { message } });
    }
    next();
  });
}

module.exports = { paymentProofUpload };
