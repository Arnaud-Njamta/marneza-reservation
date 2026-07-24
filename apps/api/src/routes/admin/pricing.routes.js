/**
 * Routes admin — tarifs vitrine / promos.
 *
 * @module routes/admin/pricing.routes
 * @mounted /api/admin/pricing
 */

const { Router } = require('express');
const admin = require('../../controllers/admin.controller');
const auth = require('../../middlewares/auth.middleware');

const router = Router();
router.use(auth);

router.get('/', admin.listPricing);
router.patch('/:id', admin.updatePricingRule);

module.exports = router;
