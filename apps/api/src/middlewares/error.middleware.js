/**
 * Middleware gestion d'erreurs centralisée.
 *
 * @module middlewares/error.middleware
 * @mounted app.js L31 (dernier middleware)
 * @see docs/API_MANUAL.md §10
 *
 * L9   statusCode = err.statusCode || 500
 * L10  code = err.code || 'INTERNAL_ERROR'
 * L16  res.status().json({ error: { code, message } })
 */

function errorMiddleware(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  if (process.env.NODE_ENV === 'development') {
    console.error(`[${req.method}] ${req.path}`, err);
  }

  res.status(statusCode).json({
    error: {
      code,
      message: err.message || 'Erreur interne du serveur',
    },
  });
}

module.exports = errorMiddleware;
