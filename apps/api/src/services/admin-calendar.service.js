/**
 * Service calendrier admin — toutes les réservations sur une période.
 *
 * @module services/admin-calendar.service
 */

const prisma = require('../config/database');
const { BLOCKING_STATUSES } = require('../utils/intervals');
const { ymdInTimezone, daysBetweenYmd } = require('../utils/dates');
const env = require('../config/env');

const bookingInclude = {
  customer: true,
  bookingType: true,
  resource: { select: { id: true, name: true, slug: true } },
};

async function getCalendar({ resourceSlug, from, to }) {
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);

  let resource = null;
  let resourceId;

  if (resourceSlug && resourceSlug !== 'all') {
    resource = await prisma.resource.findUnique({ where: { slug: resourceSlug } });
    if (!resource) {
      const err = new Error('Ressource introuvable');
      err.statusCode = 404;
      throw err;
    }
    resourceId = resource.id;
  }

  const resourceFilter = resourceId ? { resourceId } : {};

  const [bookings, blocked, resources] = await Promise.all([
    prisma.booking.findMany({
      where: {
        ...resourceFilter,
        status: { in: BLOCKING_STATUSES },
        startAt: { lte: toDate },
        endAt: { gte: fromDate },
      },
      include: bookingInclude,
      orderBy: { startAt: 'asc' },
    }),
    resourceId
      ? prisma.blockedPeriod.findMany({
          where: {
            resourceId,
            startAt: { lte: toDate },
            endAt: { gte: fromDate },
          },
        })
      : prisma.blockedPeriod.findMany({
          where: {
            startAt: { lte: toDate },
            endAt: { gte: fromDate },
          },
          include: { resource: { select: { name: true, slug: true } } },
        }),
    prisma.resource.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return {
    resource: resource ?? { id: 'all', name: 'Tous les espaces', slug: 'all' },
    resources,
    bookings,
    blockedPeriods: blocked,
  };
}

/** Réservations payées dans les 3 prochains jours (J-3 à jour-J) */
async function getUpcoming() {
  const todayYmd = ymdInTimezone(new Date(), env.defaultTimezone);

  const bookings = await prisma.booking.findMany({
    where: { status: 'paid' },
    include: bookingInclude,
    orderBy: { startAt: 'asc' },
  });

  return bookings
    .map((booking) => {
      const startYmd = ymdInTimezone(booking.startAt, env.defaultTimezone);
      const daysUntil = daysBetweenYmd(todayYmd, startYmd);
      let urgency = null;
      if (daysUntil === 0) urgency = 'today';
      else if (daysUntil === 1) urgency = '1day';
      else if (daysUntil <= 3) urgency = '3days';
      return { ...booking, daysUntil, urgency };
    })
    .filter((b) => b.daysUntil >= 0 && b.daysUntil <= 3);
}

module.exports = { getCalendar, getUpcoming };
