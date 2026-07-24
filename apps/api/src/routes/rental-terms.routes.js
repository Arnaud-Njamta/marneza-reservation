/**
 * Conditions de location — lecture publique.
 *
 * @module routes/rental-terms.routes
 * @mounted /api/rental-terms
 */

const { Router } = require('express');
const ctrl = require('../controllers');

const router = Router();

/**
 * @route   GET /api/rental-terms
 * @calledBy ConfirmClient — liste affichée avant acceptation
 * @auth    Public
 */
router.get('/', ctrl.listRentalTerms);

module.exports = router;
