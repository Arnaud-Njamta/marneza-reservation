/**
 * Routes réservations client.
 *
 * @module routes/bookings.routes
 * @mounted routes/index.js L25 → /api/bookings
 * @see docs/API_MANUAL.md §4 — chaîne d'appels détaillée
 *
 * INDEX :
 * L23  POST   /              → createBooking      (public)
 * L31  GET    /:id           → getBooking         (token client)
 * L32  GET    /:id/admin-review → markBookingReviewedFromEmail (JWT email)
 * L40  POST   /:id/cancel    → cancelBooking      (token client)
 * L41  POST   /:id/submit    → submitBooking      (token client)
 * L42  POST   /:id/claim-payment → claimPayment  (token client)
 */

const { Router } = require('express');
const ctrl = require('../controllers');

const { requireBookingAccess } = require('../middlewares/booking-access.middleware');

const router = Router();

/**
 * @route   POST /api/bookings
 * @calledBy Frontend: book/[slug]/page.tsx → createBooking()
 * @calls   BookingService.createPending() → hold 15 min
 * @auth    Public
 * @body    { resourceSlug, bookingTypeCode, date, startHour?, eventType, customer }
 */
router.post('/', ctrl.createBooking);

/**
 * @route   GET /api/bookings/:id
 * @calledBy Frontend: book/[slug]/confirm/[id]/page.tsx (timer hold)
 * @calls   BookingService.getById()
 * @auth    Public
 */
router.get('/:id', requireBookingAccess, ctrl.getBooking);
router.get('/:id/admin-review', ctrl.markBookingReviewedFromEmail);

/**
 * @route   POST /api/bookings/:id/cancel
 * @calledBy Frontend: bouton annuler
 * @calls   BookingService.cancel()
 * @auth    Jeton d'accès client (token)
 */
router.post('/:id/cancel', requireBookingAccess, ctrl.cancelBooking);
router.post('/:id/submit', requireBookingAccess, ctrl.submitBooking);
router.post('/:id/claim-payment', requireBookingAccess, ctrl.claimPayment);

module.exports = router;
