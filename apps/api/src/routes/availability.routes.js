/**
 * Routes disponibilité calendrier.
 *
 * @module routes/availability.routes
 * @mounted routes/index.js → /api/resources/:slug/availability
 * @see docs/FLOWS/05-availability-check.md
 */

const { Router } = require('express');
const ctrl = require('../controllers');

const router = Router({ mergeParams: true });

/**
 * @route   GET /api/resources/:slug/availability
 * @query   from, to, booking_type
 * @calledBy Frontend: book/[slug]/page.tsx → calendrier
 * @calls   AvailabilityService.getAvailability()
 * @auth    Public
 */
router.get('/', ctrl.getAvailability);

module.exports = router;
