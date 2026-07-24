/**
 * Routes auth — login public, récupération, session / profil protégés.
 *
 * @module routes/auth.routes
 * @mounted /api/auth
 */

const { Router } = require('express');
const auth = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = Router();

router.post('/login', auth.login);
router.post('/forgot-password', auth.forgotPassword);
router.post('/reset-password', auth.resetPassword);
router.post('/forgot-identifier', auth.forgotIdentifier);
router.post('/confirm-identifier', auth.confirmIdentifier);

router.get('/me', authMiddleware, auth.me);
router.patch('/me', authMiddleware, auth.updateMe);
router.post('/change-password', authMiddleware, auth.changePassword);

module.exports = router;
