/**
 * Utilitaires dates — comparaisons jour calendaire en fuseau métier.
 */

const env = require('../config/env');

function ymdInTimezone(date, timeZone = env.defaultTimezone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
}

function daysBetweenYmd(fromYmd, toYmd) {
  const from = new Date(`${fromYmd}T12:00:00.000Z`);
  const to = new Date(`${toYmd}T12:00:00.000Z`);
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

function startOfYmdUtc(ymd) {
  return new Date(`${ymd}T00:00:00.000Z`);
}

function endOfYmdUtc(ymd) {
  return new Date(`${ymd}T23:59:59.999Z`);
}

module.exports = {
  ymdInTimezone,
  daysBetweenYmd,
  startOfYmdUtc,
  endOfYmdUtc,
};
