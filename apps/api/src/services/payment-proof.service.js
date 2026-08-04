/**
 * Upload / lecture des preuves de paiement (PDF ou image).
 *
 * @module services/payment-proof.service
 */

const fs = require('fs');
const path = require('path');
const prisma = require('../config/database');

const UPLOAD_DIR = path.resolve(__dirname, '../../../uploads/payment-proofs');
const MAX_BYTES = 8 * 1024 * 1024; // 8 Mo
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function absolutePath(relativePath) {
  return path.join(UPLOAD_DIR, path.basename(relativePath));
}

function extForMime(mime) {
  switch (mime) {
    case 'application/pdf':
      return '.pdf';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    default:
      return '.jpg';
  }
}

/**
 * Enregistre une preuve pour une réservation (remplace l'ancienne si présente).
 */
async function savePaymentProof(bookingId, file) {
  if (!file) {
    const err = new Error('Fichier manquant');
    err.statusCode = 400;
    throw err;
  }
  if (!ALLOWED_MIME.has(file.mimetype)) {
    const err = new Error('Format non accepté — PDF, JPG, PNG, WEBP ou GIF uniquement');
    err.statusCode = 400;
    throw err;
  }
  if (file.size > MAX_BYTES) {
    const err = new Error('Fichier trop volumineux (max 8 Mo)');
    err.statusCode = 400;
    throw err;
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    const err = new Error('Réservation introuvable');
    err.statusCode = 404;
    throw err;
  }

  if (!['processing', 'paid'].includes(booking.status)) {
    const err = new Error('Impossible d\'ajouter une preuve pour ce statut');
    err.statusCode = 400;
    throw err;
  }

  if (!booking.invoiceSentAt && booking.status === 'processing') {
    const err = new Error('La synthèse de réservation n\'a pas encore été envoyée');
    err.statusCode = 400;
    throw err;
  }

  ensureUploadDir();

  // Supprimer l'ancienne preuve disque si présente
  if (booking.paymentProofPath) {
    const oldAbs = absolutePath(booking.paymentProofPath);
    if (fs.existsSync(oldAbs)) {
      try {
        fs.unlinkSync(oldAbs);
      } catch {
        /* ignore */
      }
    }
  }

  const filename = `${bookingId}-${Date.now()}${extForMime(file.mimetype)}`;
  const abs = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(abs, file.buffer);

  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      paymentProofPath: filename,
      paymentProofMime: file.mimetype,
      paymentProofName: file.originalname || filename,
      paymentProofUploadedAt: new Date(),
    },
    include: {
      resource: true,
      customer: true,
      bookingType: true,
      feeLines: true,
    },
  });
}

function getProofFile(booking) {
  if (!booking?.paymentProofPath) {
    const err = new Error('Aucune preuve de paiement');
    err.statusCode = 404;
    throw err;
  }
  const abs = absolutePath(booking.paymentProofPath);
  if (!fs.existsSync(abs)) {
    const err = new Error('Fichier de preuve introuvable sur le serveur');
    err.statusCode = 404;
    throw err;
  }
  return {
    absolutePath: abs,
    mime: booking.paymentProofMime || 'application/octet-stream',
    name: booking.paymentProofName || booking.paymentProofPath,
  };
}

module.exports = {
  UPLOAD_DIR,
  MAX_BYTES,
  ALLOWED_MIME,
  savePaymentProof,
  getProofFile,
  ensureUploadDir,
};
