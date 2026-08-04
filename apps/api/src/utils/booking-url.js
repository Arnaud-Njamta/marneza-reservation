/**
 * URL client sécurisée pour une réservation.
 */

const env = require('../config/env');

/** Normalise APP_URL : pas de slash final, schéma https en prod si manquant. */
function publicAppUrl() {
  let base = String(env.appUrl || '').trim().replace(/\/+$/, '');
  if (!base) {
    base = 'http://localhost:3000';
  }
  // Sans schéma, les clients mail n’en font pas un lien cliquable
  if (!/^https?:\/\//i.test(base)) {
    base = `https://${base}`;
  }
  return base;
}

function clientBookingUrl(booking) {
  const slug = booking.resource?.slug || booking.resourceSlug;
  const token = booking.accessToken || '';
  const id = booking.id;
  const q = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${publicAppUrl()}/book/${slug}/confirm/${id}${q}`;
}

module.exports = { clientBookingUrl, publicAppUrl };
