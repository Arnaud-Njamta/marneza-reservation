/**
 * Service de disponibilité — vérifie les conflits de créneaux.
 *
 * @module services/availability.service
 * @calledBy services/booking.service.js
 * @calledBy controllers/availability.controller.js
 * @calls services/slot-calculator.service.js
 * @calls utils/intervals.js
 * @db bookings, blocked_periods
 * @see docs/FLOWS/05-availability-check.md
 */

const prisma = require('../config/database');
const env = require('../config/env');
const { intervalsOverlap, BLOCKING_STATUSES } = require('../utils/intervals');
const slotCalculator = require('./slot-calculator.service');

const APARTMENT_SLUG = env.apartmentSlug || 'appartement';

async function getApartmentResource() {
  return prisma.resource.findUnique({ where: { slug: APARTMENT_SLUG } });
}

/**
 * Réservations qui bloquent l'appartement : réservations directes + salles avec option inclus.
 */
async function loadApartmentBlockingIntervals({ startAt, endAt, excludeBookingId }) {
  const apartment = await getApartmentResource();
  if (!apartment) return [];

  const overlap = {
    status: { in: BLOCKING_STATUSES },
    ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    startAt: { lt: endAt },
    endAt: { gt: startAt },
  };

  const [direct, bundled] = await Promise.all([
    prisma.booking.findMany({
      where: { ...overlap, resourceId: apartment.id },
      select: { startAt: true, endAt: true },
    }),
    prisma.booking.findMany({
      where: { ...overlap, includesApartment: true },
      select: { startAt: true, endAt: true },
    }),
  ]);

  return [...direct, ...bundled];
}

/**
 * Vérifie que l'appartement est libre sur le créneau (option +50$ avec une salle).
 */
async function assertApartmentAvailable({ startAt, endAt, excludeBookingId }) {
  const apartment = await getApartmentResource();
  if (!apartment) {
    const err = new Error('Appartement non configuré');
    err.statusCode = 500;
    throw err;
  }

  const blocking = await loadApartmentBlockingIntervals({ startAt, endAt, excludeBookingId });
  const blockedPeriods = await prisma.blockedPeriod.findMany({
    where: {
      resourceId: apartment.id,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
  });

  if (blocking.length > 0) {
    const err = new Error(
      "L'appartement n'est pas disponible sur ce créneau (déjà réservé ou inclus avec une autre salle)."
    );
    err.statusCode = 409;
    err.code = 'APARTMENT_CONFLICT';
    throw err;
  }

  if (blockedPeriods.length > 0) {
    const err = new Error("L'appartement est indisponible sur ce créneau.");
    err.statusCode = 409;
    err.code = 'APARTMENT_BLOCKED';
    throw err;
  }
}

function canIncludeApartment(resourceSlug) {
  return resourceSlug !== APARTMENT_SLUG;
}

function isHourBookingType(code) {
  return code === 'hour' || code === 'conf_hour';
}

/** Créneaux horaires testés pour la disponibilité (ex. 08:00–15:00) */
function listHourSlots(bookingType) {
  const startH = parseInt(bookingType.defaultStartTime.split(':')[0], 10);
  const endH = parseInt(bookingType.defaultEndTime.split(':')[0], 10);
  const slots = [];
  for (let h = startH; h < endH; h += 1) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
  }
  return slots;
}

function hasIntervalConflict(startAt, endAt, bookings, blocked) {
  return (
    bookings.some((b) => intervalsOverlap(startAt, endAt, b.startAt, b.endAt)) ||
    blocked.some((b) => intervalsOverlap(startAt, endAt, b.startAt, b.endAt))
  );
}

/**
 * Vérifie qu'aucune réservation ni période bloquée ne chevauche l'intervalle.
 * Lance une erreur 409 si conflit.
 *
 * @param {Object} params
 * @param {string} params.resourceId
 * @param {Date} params.startAt
 * @param {Date} params.endAt
 * @param {string} [params.excludeBookingId] - Exclure une réservation (update)
 * @throws {Error} CONFLICT si créneau indisponible
 */
async function assertNoConflict({ resourceId, startAt, endAt, excludeBookingId }) {
  const [bookings, blocked] = await Promise.all([
    prisma.booking.findMany({
      where: {
        resourceId,
        status: { in: BLOCKING_STATUSES },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    }),
    prisma.blockedPeriod.findMany({
      where: {
        resourceId,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    }),
  ]);

  if (bookings.length > 0) {
    const err = new Error('Ce créneau est déjà réservé ou en cours de réservation.');
    err.statusCode = 409;
    err.code = 'SLOT_CONFLICT';
    throw err;
  }

  if (blocked.length > 0) {
    const err = new Error('Ce créneau est indisponible (maintenance ou fermeture).');
    err.statusCode = 409;
    err.code = 'SLOT_BLOCKED';
    throw err;
  }
}

/**
 * Retourne les disponibilités pour une ressource sur une période.
 *
 * @param {Object} params
 * @param {string} params.resourceSlug
 * @param {string} params.from - "YYYY-MM-DD"
 * @param {string} params.to - "YYYY-MM-DD"
 * @param {string} params.bookingTypeCode
 * @returns {Promise<{ available: string[], unavailable: string[] }>}
 */
async function getAvailability({ resourceSlug, from, to, bookingTypeCode }) {
  const resource = await prisma.resource.findUnique({
    where: { slug: resourceSlug },
    include: { resourceType: { include: { bookingTypes: true } } },
  });

  if (!resource) {
    const err = new Error('Ressource introuvable');
    err.statusCode = 404;
    throw err;
  }

  const bookingType = resource.resourceType.bookingTypes.find(
    (bt) =>
      bt.code === bookingTypeCode ||
      bt.code === `conf_${bookingTypeCode}` ||
      bt.code === `apt_${bookingTypeCode}`
  );

  if (!bookingType) {
    const err = new Error('Type de location invalide pour cette ressource');
    err.statusCode = 400;
    throw err;
  }

  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T00:00:00.000Z`);
  // Inclure le lendemain pour les créneaux overnight qui débordent sur le mois suivant
  const queryToDate = new Date(toDate);
  queryToDate.setUTCDate(queryToDate.getUTCDate() + 1);

  const [bookings, blocked, apartmentBundled] = await Promise.all([
    prisma.booking.findMany({
      where: {
        resourceId: resource.id,
        status: { in: BLOCKING_STATUSES },
        startAt: { lte: queryToDate },
        endAt: { gte: fromDate },
      },
      select: { startAt: true, endAt: true },
    }),
    prisma.blockedPeriod.findMany({
      where: {
        resourceId: resource.id,
        startAt: { lte: toDate },
        endAt: { gte: fromDate },
      },
      select: { startAt: true, endAt: true },
    }),
    resource.slug === APARTMENT_SLUG
      ? prisma.booking.findMany({
          where: {
            includesApartment: true,
            status: { in: BLOCKING_STATUSES },
            startAt: { lte: queryToDate },
            endAt: { gte: fromDate },
          },
          select: { startAt: true, endAt: true },
        })
      : Promise.resolve([]),
  ]);

  const allBlocking = [...bookings, ...apartmentBundled];

  const available = [];
  const unavailable = [];

  const current = new Date(fromDate);
  while (current <= toDate) {
    const dateStr = current.toISOString().slice(0, 10);
    try {
      let open = false;

      if (isHourBookingType(bookingType.code)) {
        // Location à l'heure : au moins un créneau horaire libre sur la journée
        open = listHourSlots(bookingType).some((startHour) => {
          try {
            const { startAt, endAt } = slotCalculator.computeInterval({
              date: dateStr,
              bookingType,
              startHour,
            });
            return !hasIntervalConflict(startAt, endAt, allBlocking, blocked);
          } catch {
            return false;
          }
        });
      } else {
        const { startAt, endAt } = slotCalculator.computeInterval({
          date: dateStr,
          bookingType,
        });
        open = !hasIntervalConflict(startAt, endAt, allBlocking, blocked);
      }

      if (open) {
        available.push(dateStr);
      } else {
        unavailable.push(dateStr);
      }
    } catch {
      unavailable.push(dateStr);
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return { available, unavailable, resource: { slug: resource.slug, name: resource.name } };
}

module.exports = {
  assertNoConflict,
  assertApartmentAvailable,
  canIncludeApartment,
  getAvailability,
};
