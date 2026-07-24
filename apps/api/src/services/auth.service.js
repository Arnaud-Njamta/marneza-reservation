/**
 * Service authentification admin — login JWT + gestion de compte.
 *
 * @module services/auth.service
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const env = require('../config/env');

const ADMIN_ROLES = new Set(['admin', 'manager', 'staff']);
const MIN_PASSWORD_LENGTH = 8;

function assertPasswordStrength(password) {
  if (!password || String(password).length < MIN_PASSWORD_LENGTH) {
    const err = new Error(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`);
    err.statusCode = 400;
    throw err;
  }
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

function toPublicUser(user) {
  const roles = user.userRoles.map((ur) => ur.role.code);
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles,
  };
}

async function loadUserWithRoles(where) {
  return prisma.user.findUnique({
    where,
    include: {
      userRoles: { include: { role: true } },
    },
  });
}

async function login(email, password) {
  const user = await loadUserWithRoles({ email: email.toLowerCase().trim() });

  if (!user || !user.isActive) {
    const err = new Error('Email ou mot de passe incorrect');
    err.statusCode = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const err = new Error('Email ou mot de passe incorrect');
    err.statusCode = 401;
    throw err;
  }

  const roles = user.userRoles.map((ur) => ur.role.code);
  const hasAdminAccess = roles.some((code) => ADMIN_ROLES.has(code));
  if (!hasAdminAccess) {
    const err = new Error('Accès non autorisé');
    err.statusCode = 403;
    throw err;
  }

  const token = signToken(user);

  return {
    token,
    user: toPublicUser(user),
  };
}

async function getUserFromToken(payload) {
  const user = await loadUserWithRoles({ id: payload.sub });

  if (!user || !user.isActive) {
    const err = new Error('Session invalide');
    err.statusCode = 401;
    throw err;
  }

  const roles = user.userRoles.map((ur) => ur.role.code);
  if (!roles.some((code) => ADMIN_ROLES.has(code))) {
    const err = new Error('Accès non autorisé');
    err.statusCode = 403;
    throw err;
  }

  return toPublicUser(user);
}

async function hashPassword(password) {
  // 10 rounds : assez sûr, ~2× plus rapide que 12 au login (surtout sous Windows)
  return bcrypt.hash(password, 10);
}

async function updateProfile(userId, { email, firstName, lastName, currentPassword }) {
  const user = await loadUserWithRoles({ id: userId });
  if (!user || !user.isActive) {
    const err = new Error('Session invalide');
    err.statusCode = 401;
    throw err;
  }

  const data = {};

  if (typeof firstName === 'string' && firstName.trim()) {
    data.firstName = firstName.trim();
  }
  if (typeof lastName === 'string' && lastName.trim()) {
    data.lastName = lastName.trim();
  }

  if (typeof email === 'string' && email.trim()) {
    const nextEmail = email.toLowerCase().trim();
    if (nextEmail !== user.email) {
      if (!currentPassword) {
        const err = new Error('Mot de passe actuel requis pour changer l’e-mail');
        err.statusCode = 400;
        throw err;
      }
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        const err = new Error('Mot de passe actuel incorrect');
        err.statusCode = 401;
        throw err;
      }
      const taken = await prisma.user.findUnique({ where: { email: nextEmail } });
      if (taken && taken.id !== user.id) {
        const err = new Error('Cet e-mail est déjà utilisé');
        err.statusCode = 409;
        throw err;
      }
      data.email = nextEmail;
    }
  }

  if (Object.keys(data).length === 0) {
    const err = new Error('Aucune modification à enregistrer');
    err.statusCode = 400;
    throw err;
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    include: { userRoles: { include: { role: true } } },
  });

  return {
    token: signToken(updated),
    user: toPublicUser(updated),
  };
}

async function changePassword(userId, currentPassword, newPassword) {
  assertPasswordStrength(newPassword);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) {
    const err = new Error('Session invalide');
    err.statusCode = 401;
    throw err;
  }

  if (!currentPassword) {
    const err = new Error('Mot de passe actuel requis');
    err.statusCode = 400;
    throw err;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    const err = new Error('Mot de passe actuel incorrect');
    err.statusCode = 401;
    throw err;
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return { message: 'Mot de passe mis à jour' };
}

module.exports = {
  login,
  verifyToken,
  getUserFromToken,
  hashPassword,
  signToken,
  updateProfile,
  changePassword,
};
