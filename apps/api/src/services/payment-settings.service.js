/**
 * Infos de virement / paiement — stockées dans system_settings (éditables admin).
 *
 * @module services/payment-settings.service
 */

const prisma = require('../config/database');
const env = require('../config/env');

const KEYS = {
  bankName: 'payment_bank_name',
  bankAccount: 'payment_bank_account',
  bankHolder: 'payment_bank_holder',
  mobileMoney: 'payment_mobile_money',
  referenceHelp: 'payment_reference_help',
};

function defaultsFromEnv() {
  return {
    bankName: env.payment.bankName,
    bankAccount: env.payment.bankAccount,
    bankHolder: env.payment.bankHolder,
    mobileMoney: env.payment.mobileMoney,
    referenceHelp: env.payment.referenceHelp,
  };
}

async function getPaymentSettings() {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: Object.values(KEYS) } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const defaults = defaultsFromEnv();

  return {
    bankName: map[KEYS.bankName] || defaults.bankName,
    bankAccount: map[KEYS.bankAccount] || defaults.bankAccount,
    bankHolder: map[KEYS.bankHolder] || defaults.bankHolder,
    mobileMoney: map[KEYS.mobileMoney] || defaults.mobileMoney,
    referenceHelp: map[KEYS.referenceHelp] || defaults.referenceHelp,
  };
}

async function upsertPaymentSettings(partial = {}) {
  const allowed = Object.keys(KEYS);
  const updates = {};

  for (const field of allowed) {
    if (partial[field] !== undefined && partial[field] !== null) {
      updates[field] = String(partial[field]).trim();
    }
  }

  if (Object.keys(updates).length === 0) {
    const err = new Error('Aucun champ paiement à enregistrer');
    err.statusCode = 400;
    throw err;
  }

  await Promise.all(
    Object.entries(updates).map(([field, value]) =>
      prisma.systemSetting.upsert({
        where: { key: KEYS[field] },
        update: { value },
        create: { key: KEYS[field], value },
      })
    )
  );

  return getPaymentSettings();
}

/** Seed idempotent : crée les clés manquantes depuis l'env, ne écrase pas l'existant. */
async function ensureDefaults() {
  const defaults = defaultsFromEnv();
  let created = 0;

  for (const [field, key] of Object.entries(KEYS)) {
    const existing = await prisma.systemSetting.findUnique({ where: { key } });
    if (!existing) {
      await prisma.systemSetting.create({ data: { key, value: defaults[field] } });
      created += 1;
    }
  }

  return { created };
}

module.exports = {
  KEYS,
  getPaymentSettings,
  upsertPaymentSettings,
  ensureDefaults,
};
