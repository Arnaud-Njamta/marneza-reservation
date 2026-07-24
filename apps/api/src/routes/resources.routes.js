/**
 * Routes publiques — ressources réservables.
 *
 * @module routes/resources.routes
 * @mounted routes/index.js → /api/resources
 * @see docs/API_ROUTES.md
 */

const { Router } = require('express');
const ctrl = require('../controllers');

const router = Router();

/**
 * @route   GET /api/resources
 * @calledBy Frontend: api-client.ts → getResources() (futur)
 * @calls   ResourceService.listActive()
 * @auth    Public
 */
router.get('/', ctrl.listResources);

/**
 * @route   GET /api/resources/:slug
 * @calledBy Frontend: book/[slug]/page.tsx → getResource(slug)
 * @calls   ResourceService.getBySlug()
 * @auth    Public
 */
router.get('/:slug', ctrl.getResource);

module.exports = router;
