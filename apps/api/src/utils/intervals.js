/**
 * Utilitaires intervalles temporels — cœur anti-conflit
 *
 * @module utils/intervals
 * @usedBy services/availability.service.js
 * @usedBy services/slot-calculator.service.js
 * @see docs/FLOWS/05-availability-check.md
 */

/**
 * Vérifie si deux intervalles [start, end) se chevauchent.
 * Règle métier : toute intersection = conflit sur la même ressource.
 *
 * @param {Date} aStart
 * @param {Date} aEnd
 * @param {Date} bStart
 * @param {Date} bEnd
 * @returns {boolean}
 */
function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Statuts qui bloquent le calendrier (Option C).
 * created/processing/paid/fulfilled = créneau occupé
 *
 * @type {string[]}
 */
const BLOCKING_STATUSES = [
  'created',
  'processing',
  'paid',
  'fulfilled',
];

module.exports = {
  intervalsOverlap,
  BLOCKING_STATUSES,
};
