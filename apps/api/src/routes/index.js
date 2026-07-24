/**
 * Agrégateur de toutes les routes API.
 *
 * @module routes/index
 * @see docs/API_MANUAL.md §3.2 — carte des routes
 * @see docs/API_ROUTES.md — index rapide
 *
 * Montage :
 * L22  /api/auth                          → auth.routes.js
 * L23  /api/resources                     → resources.routes.js
 * L24  /api/resources/:slug/availability  → availability.routes.js
 * L25  /api/bookings                      → bookings.routes.js
 * L26  /api/pricing                       → pricing.routes.js
 * L29  /api/admin/bookings                → admin/bookings.routes.js
 * L30  /api/admin/pricing                 → admin/pricing.routes.js
 * L31  /api/admin                         → admin/index.routes.js (stats, calendar)
 * L34  /api/health                        → health check inline
 */

const { Router } = require('express');
const authRoutes = require('./auth.routes');
const resourcesRoutes = require('./resources.routes');
const availabilityRoutes = require('./availability.routes');
const bookingsRoutes = require('./bookings.routes');
const pricingRoutes = require('./pricing.routes');
const adminBookingsRoutes = require('./admin/bookings.routes');
const adminPricingRoutes = require('./admin/pricing.routes');
const adminRoutes = require('./admin/index.routes');
const adminSettingsRoutes = require('./admin/settings.routes');
const rentalTermsRoutes = require('./rental-terms.routes');

const router = Router();

// ─── Public ────────────────────────────────────────────────────
router.use('/auth', authRoutes);
router.use('/resources', resourcesRoutes);
router.use('/resources/:slug/availability', availabilityRoutes);
router.use('/bookings', bookingsRoutes);
router.use('/pricing', pricingRoutes);
router.use('/rental-terms', rentalTermsRoutes);

// ─── Admin ─────────────────────────────────────────────────────
router.use('/admin/bookings', adminBookingsRoutes);
router.use('/admin/pricing', adminPricingRoutes);
router.use('/admin', adminSettingsRoutes);
router.use('/admin', adminRoutes);

// ─── Health check ──────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'marneza-reservation-api', version: '0.1.0' });
});

module.exports = router;
