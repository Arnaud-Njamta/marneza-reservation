/**
 * Synthèse des réservations par horizon (mois / 3 / 6 / 12).
 *
 * @module services/synthesis.service
 */

const prisma = require('../config/database');

function monthRange(horizonMonths, timezone = 'Africa/Kinshasa') {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const from = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  let to;
  if (horizonMonths <= 0) {
    to = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
  } else {
    to = new Date(Date.UTC(y, m + horizonMonths + 1, 0, 23, 59, 59, 999));
  }

  return { from, to, timezone };
}

function parseJsonArray(val, fallback = []) {
  if (Array.isArray(val)) return val;
  if (val == null) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

/**
 * Liste les réservations pour une synthèse.
 */
async function getSynthesis({ horizonMonths = 0, statuses, resourceIds, timezone = 'Africa/Kinshasa' }) {
  const { from, to } = monthRange(horizonMonths, timezone);
  const statusList = statuses?.length ? statuses : ['paid', 'processing', 'fulfilled'];

  const where = {
    status: { in: statusList },
    startAt: { gte: from, lte: to },
  };

  if (resourceIds?.length) {
    where.resourceId = { in: resourceIds };
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      resource: true,
      customer: true,
      bookingType: true,
      feeLines: true,
    },
    orderBy: { startAt: 'asc' },
  });

  const safeBookings = bookings.map((b) => {
    const { accessToken, ...rest } = b;
    return rest;
  });

  const totalAmount = safeBookings.reduce((s, b) => s + Number(b.totalAmount), 0);
  const byResource = {};
  for (const b of safeBookings) {
    const name = b.resource.name;
    byResource[name] = (byResource[name] || 0) + 1;
  }

  return {
    horizonMonths,
    from: from.toISOString(),
    to: to.toISOString(),
    count: safeBookings.length,
    totalAmount,
    currency: safeBookings[0]?.currency ?? 'USD',
    byResource,
    bookings: safeBookings,
  };
}

/**
 * Charge un profil reminder_config et retourne sa synthèse.
 */
async function getSynthesisByConfigId(configId) {
  const config = await prisma.reminderConfig.findUnique({ where: { id: configId } });
  if (!config) {
    const err = new Error('Profil de synthèse introuvable');
    err.statusCode = 404;
    throw err;
  }

  const statuses = parseJsonArray(config.statuses);
  const resourceIds = config.resourceIds ? parseJsonArray(config.resourceIds) : null;

  const synthesis = await getSynthesis({
    horizonMonths: config.horizonMonths,
    statuses,
    resourceIds: resourceIds?.length ? resourceIds : undefined,
  });

  return { config, synthesis };
}

async function listReminderConfigs() {
  return prisma.reminderConfig.findMany({
    include: { template: true },
    orderBy: [{ sortOrder: 'asc' }, { horizonMonths: 'asc' }],
  });
}

async function upsertReminderConfig(id, data) {
  const payload = {
    name: data.name,
    horizonMonths: Number(data.horizonMonths ?? 0),
    statuses: data.statuses ?? ['paid', 'processing'],
    resourceIds: data.resourceIds ?? null,
    showInDashboard: data.showInDashboard !== false,
    emailEnabled: Boolean(data.emailEnabled),
    templateId: data.templateId || null,
    sortOrder: Number(data.sortOrder ?? 0),
    isActive: data.isActive !== false,
  };

  if (id) {
    return prisma.reminderConfig.update({ where: { id }, data: payload, include: { template: true } });
  }
  return prisma.reminderConfig.create({ data: payload, include: { template: true } });
}

async function seedDefaultConfigs() {
  const count = await prisma.reminderConfig.count();
  if (count > 0) return;

  const defaults = [
    { name: 'Mois en cours', horizonMonths: 0, statuses: ['paid', 'processing', 'fulfilled'] },
    { name: '3 prochains mois', horizonMonths: 3, statuses: ['paid', 'processing'] },
    { name: '6 prochains mois', horizonMonths: 6, statuses: ['paid'] },
    { name: '12 prochains mois', horizonMonths: 12, statuses: ['paid'] },
  ];

  for (let i = 0; i < defaults.length; i++) {
    await prisma.reminderConfig.create({
      data: {
        ...defaults[i],
        showInDashboard: true,
        sortOrder: i,
      },
    });
  }
}

module.exports = {
  getSynthesis,
  getSynthesisByConfigId,
  listReminderConfigs,
  upsertReminderConfig,
  seedDefaultConfigs,
  monthRange,
};
