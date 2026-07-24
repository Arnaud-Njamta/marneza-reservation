/**
 * Route devis tarifaire.
 *
 * @module routes/pricing.routes
 * @mounted routes/index.js → /api/pricing/quote
 */

const { Router } = require('express');
const ctrl = require('../controllers');

const router = Router();

/**
 * @route   GET /api/pricing/quote
 * @query   resource_slug, booking_type_code
 * @calledBy Frontend: récap prix avant confirmation
 * @calls   PricingService.getQuote()
 * @auth    Public
 */
router.get('/quote', ctrl.getQuote);
router.get('/validate-promo', ctrl.validatePromo);

module.exports = router;
