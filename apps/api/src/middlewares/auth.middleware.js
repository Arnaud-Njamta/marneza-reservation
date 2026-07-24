/**
 * Middleware auth admin — vérifie le JWT Bearer.
 *
 * @module middlewares/auth.middleware
 */

const authService = require('../services/auth.service');
const env = require('../config/env');

/** Cache court pour éviter 1 requête DB users à chaque appel admin */
const userCache = new Map();
const USER_CACHE_TTL_MS = 60_000;

function getCachedUser(userId) {
  const hit = userCache.get(userId);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    userCache.delete(userId);
    return null;
  }
  return hit.user;
}

function setCachedUser(userId, user) {
  userCache.set(userId, { user, expiresAt: Date.now() + USER_CACHE_TTL_MS });
}

async function authMiddleware(req, res, next) {
  const requireAuth = env.requireAuth || env.nodeEnv === 'production';

  if (!requireAuth) {
    return next();
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Connexion requise' },
    });
  }

  try {
    const token = header.slice(7);
    const payload = authService.verifyToken(token);

    let user = getCachedUser(payload.sub);
    if (!user) {
      user = await authService.getUserFromToken(payload);
      setCachedUser(payload.sub, user);
    }

    req.user = user;
    next();
  } catch (err) {
    const status = err.statusCode || 401;
    return res.status(status).json({
      error: {
        code: status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED',
        message: err.message || 'Session invalide ou expirée',
      },
    });
  }
}

module.exports = authMiddleware;
