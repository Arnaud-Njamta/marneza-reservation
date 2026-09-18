/**
 * Agrégateur de toutes les routes API Marneza.
 *
 * @module routes/index
 * @see docs/passation/PASSATION_Marneza_Reservation_BL_Concept.docx
 * @see docs/API_MANUAL.md
 *
 * Règle : routes → controllers → services → Prisma
 *
 * Montage sous /api (app.js) :
 *   /auth                          → auth.routes.js
 *   /home                          → home.routes.js (vitrine publique)
 *   /resources                     → resources.routes.js
 *   /resources/:slug/availability  → availability.routes.js
 *   /bookings                      → bookings.routes.js
 *   /pricing                       → pricing.routes.js
 *   /rental-terms                  → rental-terms.routes.js
 *   /admin/bookings                → admin/bookings.routes.js
 *   /admin/pricing                 → admin/pricing.routes.js
 *   /admin                         → admin/settings.routes.js + admin/index.routes.js
 *   /health                        → health check inline
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
const homeRoutes = require('./home.routes');

const router = Router();

// ─── Public ────────────────────────────────────────────────────
router.use('/auth', authRoutes);
router.use('/home', homeRoutes);
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
