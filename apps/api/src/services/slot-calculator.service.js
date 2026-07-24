/**
 * Calcule start_at / end_at à partir d'une date et d'un type de location.
 *
 * @module services/slot-calculator.service
 * @calledBy services/booking.service.js
 * @calledBy services/availability.service.js
 * @see docs/DATABASE.md — Règles horaires
 *
 * Types salles (hall + conference) :
 *   hour      → créneau horaire dans 08h-16h (même jour)
 *   day       → 08h00 → 15h00
 *   evening   → 18h00 J → 07h00 J+1
 *   full_day  → 08h00 J → 07h00 J+1
 *
 * Types appartement :
 *   apt_day   → 08h00 → 18h00
 *   apt_night → 18h00 J → 08h00 J+1
 */

const env = require('../config/env');

/**
 * Parse "HH:mm" en heures et minutes.
 * @param {string} timeStr
 * @returns {{ hours: number, minutes: number }}
 */
function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

/**
 * Applique une heure à une date (fuseau Africa/Kinshasa via offset UTC+2 fixe pour le MVP).
 * TODO phase 2 : utiliser luxon/date-fns-tz pour DST.
 *
 * @param {Date} baseDate - Date du jour (YYYY-MM-DD)
 * @param {string} timeStr - "HH:mm"
 * @returns {Date}
 */
function applyTime(baseDate, timeStr) {
  const { hours, minutes } = parseTime(timeStr);
  const result = new Date(baseDate);
  // Kinshasa = UTC+2 (pas de DST)
  result.setUTCHours(hours - 2, minutes, 0, 0);
  return result;
}

/**
 * Calcule l'intervalle complet pour une réservation.
 *
 * @param {Object} params
 * @param {string} params.date - "YYYY-MM-DD"
 * @param {Object} params.bookingType - Enregistrement BookingType Prisma
 * @param {string} [params.startHour] - "HH:mm" requis si type = hour
 * @returns {{ startAt: Date, endAt: Date }}
 */
function computeInterval({ date, endDate, bookingType, startHour }) {
  const baseDate = new Date(`${date}T00:00:00.000Z`);

  if (bookingType.code === 'hour' || bookingType.code === 'conf_hour') {
    if (!startHour) {
      throw new Error('startHour requis pour une location à l\'heure');
    }
    const hourStart = applyTime(baseDate, startHour);
    const hourEnd = new Date(hourStart);
    hourEnd.setUTCHours(hourEnd.getUTCHours() + 1);
    const maxEnd = applyTime(baseDate, bookingType.defaultEndTime);
    if (hourEnd > maxEnd) {
      throw new Error(`Le créneau dépasse la limite ${bookingType.defaultEndTime}`);
    }
    return { startAt: hourStart, endAt: hourEnd };
  }

  const startAt = applyTime(baseDate, bookingType.defaultStartTime);
  let endAt;

  if (bookingType.spansOvernight) {
    const endBase = endDate
      ? new Date(`${endDate}T00:00:00.000Z`)
      : new Date(baseDate);
    if (!endDate) {
      endBase.setUTCDate(endBase.getUTCDate() + 1);
    }
    endAt = applyTime(endBase, bookingType.defaultEndTime);
    if (endDate && endDate <= date) {
      throw new Error('La date de fin doit être après la date de début');
    }
  } else {
    endAt = applyTime(baseDate, bookingType.defaultEndTime);
  }

  return { startAt, endAt };
}

module.exports = {
  computeInterval,
  applyTime,
  parseTime,
  timezone: env.defaultTimezone,
};
