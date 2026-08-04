/**
 * Contenu public page d’accueil.
 * @mounted /api/home
 */

const { Router } = require('express');
const ctrl = require('../controllers');

const router = Router();
router.get('/', ctrl.getPublicHome);

module.exports = router;
