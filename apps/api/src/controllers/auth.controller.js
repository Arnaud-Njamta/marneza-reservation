/**
 * Contrôleur auth — login, profil, récupération compte.
 *
 * @module controllers/auth.controller
 */

const authService = require('../services/auth.service');
const recoveryService = require('../services/auth-recovery.service');

async function login(req, res, next) {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({
        error: { message: 'Email et mot de passe requis' },
      });
    }

    const result = await authService.login(email, password);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    res.json({ data: req.user });
  } catch (err) {
    next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const { email, firstName, lastName, currentPassword } = req.body ?? {};
    const result = await authService.updateProfile(req.user.id, {
      email,
      firstName,
      lastName,
      currentPassword,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body ?? {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: { message: 'Mot de passe actuel et nouveau mot de passe requis' },
      });
    }
    const result = await authService.changePassword(
      req.user.id,
      currentPassword,
      newPassword
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body ?? {};
    if (!email) {
      return res.status(400).json({ error: { message: 'E-mail requis' } });
    }
    const result = await recoveryService.requestPasswordReset(email);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { email, code, newPassword } = req.body ?? {};
    if (!email || !code || !newPassword) {
      return res.status(400).json({
        error: { message: 'E-mail, code et nouveau mot de passe requis' },
      });
    }
    const result = await recoveryService.resetPasswordWithCode(email, code, newPassword);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function forgotIdentifier(req, res, next) {
  try {
    const { recoveryEmail } = req.body ?? {};
    if (!recoveryEmail) {
      return res.status(400).json({
        error: {
          message:
            'Indiquez votre e-mail de connexion ou l’adresse de notification admin (ADMIN_NOTIFICATION_EMAIL)',
        },
      });
    }
    const result = await recoveryService.requestIdentifierHint(recoveryEmail);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function confirmIdentifier(req, res, next) {
  try {
    const { recoveryEmail, code } = req.body ?? {};
    if (!recoveryEmail || !code) {
      return res.status(400).json({
        error: { message: 'E-mail de récupération et code requis' },
      });
    }
    const result = await recoveryService.confirmIdentifierHint(recoveryEmail, code);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  me,
  updateMe,
  changePassword,
  forgotPassword,
  resetPassword,
  forgotIdentifier,
  confirmIdentifier,
};
