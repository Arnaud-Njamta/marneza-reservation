/**
 * Routes admin — réservations.
 *
 * @module routes/admin/bookings.routes
 * @mounted routes/index.js L29 → /api/admin/bookings
 * @see docs/API_MANUAL.md §5 — routes admin détaillées
 *
 * Toutes les routes passent par auth.middleware.js (L13 router.use(auth))
 *
 * INDEX :
 * L15  GET    /                    → listBookings
 * L16  GET    /upcoming            → getUpcomingBookings
 * L17  GET    /:id                 → getBooking
 * L18  POST   /:id/send-invoice    → sendInvoice
 * L19  POST   /:id/confirm-payment → confirmPayment
 * L20  POST   /:id/cancel          → cancelBooking
 * L21  POST   /:id/refuse          → refuseBooking
 * L22  PATCH  /:id/status          → updateBookingStatus
 * L23  PATCH  /:id/amount          → updateBookingAmount
 * L24  PATCH  /:id                 → modifyBooking
 * L25  GET    /:id/secure-link     → getSecureLink
 */

const { Router } = require('express');
const admin = require('../../controllers/admin.controller');
const auth = require('../../middlewares/auth.middleware');

const router = Router();
router.use(auth);

router.get('/', admin.listBookings);
router.get('/export', admin.exportBookings);
router.get('/upcoming', admin.getUpcomingBookings);
router.get('/:id', admin.getBooking);
router.post('/:id/send-invoice', admin.sendInvoice);
router.post('/:id/confirm-payment', admin.confirmPayment);
router.post('/:id/cancel', admin.cancelBooking);
router.post('/:id/refuse', admin.refuseBooking);
router.patch('/:id/status', admin.updateBookingStatus);
router.patch('/:id/amount', admin.updateBookingAmount);
router.patch('/:id', admin.modifyBooking);
router.get('/:id/secure-link', admin.getSecureLink);

module.exports = router;
