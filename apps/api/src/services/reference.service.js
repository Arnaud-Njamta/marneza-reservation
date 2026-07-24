/**
 * Génération référence réservation : JJ-MM-AAAA-NNNN-XXXX
 *
 * @module services/reference.service
 */

const crypto = require('crypto');
const prisma = require('../config/database');

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

function randomLetters(count = 4) {
  let out = '';
  const bytes = crypto.randomBytes(count);
  for (let i = 0; i < count; i++) {
    out += LETTERS[bytes[i] % LETTERS.length];
  }
  return out;
}

function dateKeyFromDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

/**
 * Génère une référence unique pour une nouvelle réservation.
 */
async function generateReferenceNumber(createdAt = new Date()) {
  const dateKey = dateKeyFromDate(createdAt);

  const seq = await prisma.$transaction(async (tx) => {
    const row = await tx.referenceSequence.upsert({
      where: { dateKey },
      create: { dateKey, counter: 1 },
      update: { counter: { increment: 1 } },
    });
    return row.counter;
  });

  const incr = String(seq).padStart(4, '0');

  for (let attempt = 0; attempt < 8; attempt++) {
    const ref = `${dateKey}-${incr}-${randomLetters(4)}`;
    const exists = await prisma.booking.findUnique({
      where: { referenceNumber: ref },
      select: { id: true },
    });
    if (!exists) return ref;
  }

  return `${dateKey}-${incr}-${randomLetters(4)}${Date.now() % 10}`;
}

/**
 * Backfill références manquantes (migration / seed).
 */
async function backfillMissingReferences() {
  const missing = await prisma.booking.findMany({
    where: { referenceNumber: null },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  for (const b of missing) {
    const referenceNumber = await generateReferenceNumber(b.createdAt);
    await prisma.booking.update({
      where: { id: b.id },
      data: { referenceNumber },
    });
  }

  return missing.length;
}

module.exports = { generateReferenceNumber, backfillMissingReferences, dateKeyFromDate };
