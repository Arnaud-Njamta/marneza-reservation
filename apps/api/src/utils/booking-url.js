/**
 * URL client sécurisée pour une réservation.
 */

const env = require('../config/env');

function clientBookingUrl(booking) {
  return `${env.appUrl}/book/${booking.resource.slug}/confirm/${booking.id}?token=${booking.accessToken}`;
}

module.exports = { clientBookingUrl };
