/**
 * Service admin tarifs — liste et mise à jour des pricing_rules.
 *
 * @module services/admin-pricing.service
 */

const prisma = require('../config/database');
const { ymdInTimezone } = require('../utils/dates');

/** YYYY-MM-DD depuis un champ DATE Prisma/MySQL (composantes UTC). */
function dateOnlyYmd(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string') return value.slice(0, 10);
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse input admin "YYYY-MM-DD" → Date stable (midi UTC). */
function parseAdminDate(value) {
  if (value == null || value === '') return null;
  const ymd = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  return new Date(`${ymd}T12:00:00.000Z`);
}

async function listAll() {
  return prisma.pricingRule.findMany({
    include: {
      resource: { select: { id: true, slug: true, name: true } },
      bookingType: { select: { id: true, code: true, name: true } },
    },
    orderBy: [{ resource: { name: 'asc' } }, { bookingType: { name: 'asc' } }],
  });
}

async function updateRule(id, data) {
  const existing = await prisma.pricingRule.findUnique({ where: { id } });
  if (!existing) {
    const err = new Error('Tarif introuvable');
    err.statusCode = 404;
    throw err;
  }

  const payload = {};

  if (data.amount !== undefined) {
    payload.amount = data.amount;
    if (data.amountPersonnel === undefined) payload.amountPersonnel = data.amount;
  }
  if (data.amountPersonnel !== undefined) {
    payload.amountPersonnel = data.amountPersonnel;
    payload.amount = data.amountPersonnel;
  }
  if (data.amountEntreprise !== undefined) payload.amountEntreprise = data.amountEntreprise;
  if (data.compareAtAmount !== undefined) {
    payload.compareAtAmount =
      data.compareAtAmount === null || data.compareAtAmount === ''
        ? null
        : data.compareAtAmount;
  }
  if (data.promoLabel !== undefined) {
    payload.promoLabel = data.promoLabel === '' ? null : data.promoLabel;
  }
  if (data.validFrom !== undefined) {
    payload.validFrom = parseAdminDate(data.validFrom);
  }
  if (data.validTo !== undefined) {
    payload.validTo = parseAdminDate(data.validTo);
  }
  if (data.isActive !== undefined) payload.isActive = Boolean(data.isActive);

  return prisma.pricingRule.update({
    where: { id },
    data: payload,
    include: {
      resource: { select: { id: true, slug: true, name: true } },
      bookingType: { select: { id: true, code: true, name: true } },
    },
  });
}

/**
 * Règle active aujourd'hui (comparaison jour calendaire).
 * Évite le bug : validFrom=aujourd'hui rejeté à cause du décalage UTC vs heure locale.
 */
function isRuleEffective(rule, at = new Date()) {
  if (!rule.isActive) return false;

  const todayYmd = ymdInTimezone(at);
  const fromYmd = dateOnlyYmd(rule.validFrom);
  const toYmd = dateOnlyYmd(rule.validTo);

  if (fromYmd && fromYmd > todayYmd) return false;
  if (toYmd && toYmd < todayYmd) return false;
  return true;
}

module.exports = {
  listAll,
  updateRule,
  isRuleEffective,
  dateOnlyYmd,
  parseAdminDate,
};
