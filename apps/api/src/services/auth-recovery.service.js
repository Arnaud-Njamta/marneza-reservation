/**
 * Codes de récupération admin — reset mot de passe / rappel d'identifiant.
 *
 * @module services/auth-recovery.service
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const env = require('../config/env');
const mailService = require('./mail.service');

const PURPOSE_PASSWORD = 'password_reset';
const PURPOSE_IDENTIFIER = 'identifier_hint';
const CODE_TTL_MS = 15 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;

const NEUTRAL_PASSWORD_MSG =
  'Si un compte correspond, un code de vérification a été envoyé par e-mail.';
const NEUTRAL_IDENTIFIER_MSG =
  'Si cette adresse est autorisée, un code de vérification a été envoyé par e-mail.';

function normalizeEmail(email) {
  return String(email || '')
    .toLowerCase()
    .trim();
}

function assertPasswordStrength(password) {
  if (!password || String(password).length < MIN_PASSWORD_LENGTH) {
    const err = new Error(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`);
    err.statusCode = 400;
    throw err;
  }
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

function generateSixDigitCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

async function invalidateOpenCodes(userId, purpose) {
  await prisma.authRecoveryCode.updateMany({
    where: { userId, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });
}

async function createRecoveryCode(userId, purpose) {
  await invalidateOpenCodes(userId, purpose);
  const code = generateSixDigitCode();
  const codeHash = await bcrypt.hash(code, 10);
  await prisma.authRecoveryCode.create({
    data: {
      userId,
      purpose,
      codeHash,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  return code;
}

async function consumeRecoveryCode(userId, purpose, code) {
  const candidates = await prisma.authRecoveryCode.findMany({
    where: {
      userId,
      purpose,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  for (const row of candidates) {
    const ok = await bcrypt.compare(String(code || '').trim(), row.codeHash);
    if (ok) {
      await prisma.authRecoveryCode.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      });
      return true;
    }
  }

  const err = new Error('Code invalide ou expiré');
  err.statusCode = 400;
  throw err;
}

async function findAdminCapableUserByEmail(email) {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    include: { userRoles: { include: { role: true } } },
  });
  if (!user || !user.isActive) return null;
  const roles = user.userRoles.map((ur) => ur.role.code);
  if (!roles.some((c) => c === 'admin' || c === 'manager' || c === 'staff')) return null;
  return user;
}

/**
 * Résout le(s) compte(s) pour « identifiant oublié » :
 * recoveryEmail = email de connexion OU ADMIN_NOTIFICATION_EMAIL.
 */
async function resolveUsersForIdentifierRecovery(recoveryEmail) {
  const email = normalizeEmail(recoveryEmail);
  if (!email) return [];

  const notification = normalizeEmail(env.adminNotificationEmail || '');
  const users = [];

  const byLogin = await findAdminCapableUserByEmail(email);
  if (byLogin) users.push(byLogin);

  if (notification && email === notification) {
    const all = await prisma.user.findMany({
      where: { isActive: true },
      include: { userRoles: { include: { role: true } } },
    });
    for (const u of all) {
      const roles = u.userRoles.map((ur) => ur.role.code);
      if (!roles.some((c) => c === 'admin' || c === 'manager' || c === 'staff')) continue;
      if (!users.some((x) => x.id === u.id)) users.push(u);
    }
  }

  return users;
}

async function requestPasswordReset(email) {
  const user = await findAdminCapableUserByEmail(email);
  if (user) {
    const code = await createRecoveryCode(user.id, PURPOSE_PASSWORD);
    await mailService.sendAuthRecoveryCodeEmail({
      to: user.email,
      purpose: PURPOSE_PASSWORD,
      code,
      firstName: user.firstName,
    });
  }
  return { message: NEUTRAL_PASSWORD_MSG };
}

async function resetPasswordWithCode(email, code, newPassword) {
  assertPasswordStrength(newPassword);
  const user = await findAdminCapableUserByEmail(email);
  if (!user) {
    const err = new Error('Code invalide ou expiré');
    err.statusCode = 400;
    throw err;
  }
  await consumeRecoveryCode(user.id, PURPOSE_PASSWORD, code);
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });
  await invalidateOpenCodes(user.id, PURPOSE_PASSWORD);
  return { message: 'Mot de passe mis à jour. Vous pouvez vous connecter.' };
}

async function requestIdentifierHint(recoveryEmail) {
  const users = await resolveUsersForIdentifierRecovery(recoveryEmail);
  if (users.length > 0) {
    // Un code lié au premier user ; confirm renverra tous les emails autorisés pour cette recoveryEmail
    const primary = users[0];
    const code = await createRecoveryCode(primary.id, PURPOSE_IDENTIFIER);
    const to = normalizeEmail(recoveryEmail);
    await mailService.sendAuthRecoveryCodeEmail({
      to,
      purpose: PURPOSE_IDENTIFIER,
      code,
      firstName: primary.firstName,
    });
  }
  return { message: NEUTRAL_IDENTIFIER_MSG };
}

async function confirmIdentifierHint(recoveryEmail, code) {
  const users = await resolveUsersForIdentifierRecovery(recoveryEmail);
  if (users.length === 0) {
    const err = new Error('Code invalide ou expiré');
    err.statusCode = 400;
    throw err;
  }
  await consumeRecoveryCode(users[0].id, PURPOSE_IDENTIFIER, code);
  const loginEmails = [...new Set(users.map((u) => u.email))];
  await mailService.sendAuthIdentifierRevealEmail({
    to: normalizeEmail(recoveryEmail),
    loginEmails,
    firstName: users[0].firstName,
  });
  return {
    message: 'Identifiant(s) envoyé(s) par e-mail.',
    loginEmails,
  };
}

module.exports = {
  PURPOSE_PASSWORD,
  PURPOSE_IDENTIFIER,
  MIN_PASSWORD_LENGTH,
  assertPasswordStrength,
  normalizeEmail,
  requestPasswordReset,
  resetPasswordWithCode,
  requestIdentifierHint,
  confirmIdentifierHint,
};
