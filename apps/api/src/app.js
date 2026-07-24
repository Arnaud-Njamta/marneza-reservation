/**
 * Application Express — middlewares + montage routes.
 *
 * @module app
 * @see docs/API_MANUAL.md §2 — anatomie d'une requête
 *
 * L20  helmet()           — en-têtes sécurité HTTP
 * L21  cors()             — origines CORS_ORIGINS (.env)
 * L22  express.json()    — parse body JSON
 * L25  /api/docs         — Swagger UI (documentation interactive)
 * L28  /api              — toutes les routes API (routes/index.js)
 * L31  errorMiddleware   — gestion erreurs JSON (dernier middleware)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const env = require('./config/env');
const apiRoutes = require('./routes');
const errorMiddleware = require('./middlewares/error.middleware');
const swaggerSpec = require('./swagger');

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigins, credentials: true }));
app.use(express.json());

// ─── Documentation OpenAPI ─────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Routes API ────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ─── Erreurs ───────────────────────────────────────────────────
app.use(errorMiddleware);

module.exports = app;
