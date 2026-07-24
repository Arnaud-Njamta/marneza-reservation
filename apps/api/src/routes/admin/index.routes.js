/**
 * Routes admin — calendrier et statistiques.
 *
 * @module routes/admin/index.routes
 * @mounted /api/admin
 */

const { Router } = require('express');
const admin = require('../../controllers/admin.controller');
const auth = require('../../middlewares/auth.middleware');

const router = Router();
router.use(auth);

/**
 * @route GET /api/admin/calendar
 * @calledBy AdminCalendar.tsx
 */
router.get('/calendar', admin.getCalendar);

/**
 * @route GET /api/admin/stats
 * @calledBy AdminDashboard.tsx
 */
router.get('/stats', admin.getStats);

module.exports = router;
