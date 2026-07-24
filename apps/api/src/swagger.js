/**
 * Configuration OpenAPI / Swagger.
 *
 * @module swagger
 * @url  GET /api/docs
 * @see  docs/API_ROUTES.md
 */

const swaggerJsdoc = require('swagger-jsdoc');
const env = require('./config/env');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Marneza Reservation API',
      version: '0.1.0',
      description:
        'API de réservation salles et appartements Marneza. Documentation complète : docs/API_ROUTES.md',
    },
    servers: [{ url: env.apiUrl }],
  },
  apis: ['./src/routes/*.js', './src/routes/admin/*.js'],
};

module.exports = swaggerJsdoc(options);
