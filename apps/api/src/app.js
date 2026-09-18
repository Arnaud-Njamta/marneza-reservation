/**
 * Application Express — middlewares + montage routes Marneza.
 *
 * @module app
 * Passation : docs/passation/PASSATION_Marneza_Reservation_BL_Concept.docx
 *
 * helmet → CORS → JSON
 * /api/docs  — Swagger UI
 * /api       — routes/index.js
 * errorMiddleware en dernier
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
