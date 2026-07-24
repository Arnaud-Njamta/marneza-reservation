/**
 * Middleware — vérifie le jeton d'accès client pour une réservation.
 *
 * @module middlewares/booking-access.middleware
 * @see docs/API_MANUAL.md §9.2
 *
 * L9-15  extractToken()         — query ?token=, header X-Booking-Token, body.accessToken
 * L18-33 requireBookingAccess() — 401 si absent, 403 si invalide/expiré
 *        → booking.service.js assertAccessToken() L208
 */

const bookingService = require('../services/booking.service');

function extractToken(req) {
  return (
    req.query.token ||
    req.headers['x-booking-token'] ||
    req.body?.accessToken ||
    null
  );
}

function requireBookingAccess(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      error: { message: 'Accès non autorisé — lien de réservation invalide' },
    });
  }

  bookingService
    .assertAccessToken(req.params.id, String(token))
    .then(() => next())
    .catch((err) => {
      const status = err.statusCode || 403;
      res.status(status).json({ error: { message: err.message } });
    });
}

module.exports = { requireBookingAccess, extractToken };
