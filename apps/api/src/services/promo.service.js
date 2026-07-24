/**
 * Codes promo — validation et application.
 *
 * @module services/promo.service
 */

const prisma = require('../config/database');
const crypto = require('crypto');

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

function isPromoEffective(promo, at = new Date()) {
  if (!promo.isActive) return false;
  if (promo.validFrom && promo.validFrom > at) return false;
  if (promo.validTo && promo.validTo < at) return false;
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) return false;
  return true;
}

/**
 * Valide un code promo et retourne le montant de réduction.
 */
async function validatePromoCode(code) {
  const normalized = normalizeCode(code);
  if (!normalized) {
    const err = new Error('Code promo requis');
    err.statusCode = 400;
    throw err;
  }

  const promo = await prisma.promoCode.findUnique({ where: { code: normalized } });
  if (!promo || !isPromoEffective(promo)) {
    const err = new Error('Code promo invalide ou expiré');
    err.statusCode = 400;
    throw err;
  }

  return {
    id: promo.id,
    code: promo.code,
    discountAmount: Number(promo.discountAmount),
    currency: promo.currency,
    label: promo.label,
  };
}

/**
 * Applique une réduction sur un montant (plancher à 0).
 */
function applyDiscount(amount, discountAmount) {
  return Math.max(0, Number(amount) - Number(discountAmount));
}

/**
 * Génère un code promo aléatoire lisible.
 */
function generatePromoCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

async function listPromoCodes() {
  return prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
}

async function createPromoCode(data) {
  const {
    code,
    discountAmount,
    currency = 'USD',
    validFrom,
    validTo,
    maxUses,
    label,
  } = data;

  if (!discountAmount || Number(discountAmount) <= 0) {
    const err = new Error('Montant de réduction invalide');
    err.statusCode = 400;
    throw err;
  }

  let finalCode = normalizeCode(code) || generatePromoCode();
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.promoCode.findUnique({ where: { code: finalCode } });
    if (!exists) break;
    finalCode = generatePromoCode();
  }

  return prisma.promoCode.create({
    data: {
      code: finalCode,
      discountAmount,
      currency,
      validFrom: validFrom ? new Date(validFrom) : null,
      validTo: validTo ? new Date(validTo) : null,
      maxUses: maxUses != null ? Number(maxUses) : null,
      label: label?.trim() || null,
    },
  });
}

async function updatePromoCode(id, data) {
  const patch = {};
  if (data.discountAmount != null) patch.discountAmount = data.discountAmount;
  if (data.validFrom !== undefined) patch.validFrom = data.validFrom ? new Date(data.validFrom) : null;
  if (data.validTo !== undefined) patch.validTo = data.validTo ? new Date(data.validTo) : null;
  if (data.maxUses !== undefined) patch.maxUses = data.maxUses != null ? Number(data.maxUses) : null;
  if (data.isActive !== undefined) patch.isActive = Boolean(data.isActive);
  if (data.label !== undefined) patch.label = data.label?.trim() || null;

  return prisma.promoCode.update({ where: { id }, data: patch });
}

async function incrementPromoUsage(promoCodeId, tx = prisma) {
  await tx.promoCode.update({
    where: { id: promoCodeId },
    data: { usedCount: { increment: 1 } },
  });
}

module.exports = {
  validatePromoCode,
  applyDiscount,
  generatePromoCode,
  listPromoCodes,
  createPromoCode,
  updatePromoCode,
  incrementPromoUsage,
  isPromoEffective,
};
