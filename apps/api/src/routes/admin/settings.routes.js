/**
 * Routes admin — synthèse, templates, promos, export.
 *
 * @module routes/admin/settings.routes
 * @mounted /api/admin
 */

const { Router } = require('express');
const admin = require('../../controllers/admin.controller');
const auth = require('../../middlewares/auth.middleware');

const router = Router();
router.use(auth);

router.get('/synthesis/configs', admin.listSynthesisConfigs);
router.get('/synthesis', admin.getSynthesis);
router.post('/synthesis/configs', admin.saveSynthesisConfig);
router.get('/templates', admin.listEmailTemplates);
router.put('/templates', admin.saveEmailTemplate);
router.get('/promo-codes', admin.listPromoCodes);
router.post('/promo-codes', admin.createPromoCode);
router.patch('/promo-codes/:id', admin.updatePromoCode);
router.get('/rental-terms', admin.listRentalTermsAdmin);
router.post('/rental-terms', admin.createRentalTerm);
router.put('/rental-terms/reorder', admin.reorderRentalTerms);
router.patch('/rental-terms/:id', admin.updateRentalTerm);
router.delete('/rental-terms/:id', admin.deleteRentalTerm);
router.get('/payment-settings', admin.getPaymentSettings);
router.put('/payment-settings', admin.savePaymentSettings);
router.get('/site-home', admin.getSiteHomeAdmin);
router.put('/site-home', admin.saveSiteHomeTexts);
router.patch('/resources/:id', admin.updateResourceShowcase);
router.post('/bookings/backfill-references', admin.backfillReferences);

module.exports = router;
