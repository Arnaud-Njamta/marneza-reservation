/**
 * Point d'entrée API Marneza Reservation.
 *
 * @module index
 * @see docs/API_MANUAL.md §1 — démarrage et jobs
 */

// .env racine doit être chargé avant app.js (Prisma)
require('./config/load-env');

const app = require('./app');
const env = require('./config/env');
const { expirePendingBookings } = require('./jobs/expire-pending.job');
const { sendBookingReminders } = require('./jobs/booking-reminders.job');

const PORT = env.apiPort;

function logMailConfig() {
  if (!env.mail.enabled) {
    console.log('[mail] Notifications désactivées (MAIL_ENABLED=false).');
    return;
  }

  const target = env.adminNotificationEmail || '(non configuré)';
  if (env.mail.mode === 'mailtrap') {
    const { useSandbox, inboxId, token } = env.mail.mailtrap;
    console.log(
      `[mail] Mode Mailtrap (${useSandbox ? 'sandbox' : 'envoi'}) → ${target}`
    );
    if (!token) {
      console.warn('[mail] MAILTRAP_TOKEN manquant — aucun email ne partira.');
    }
    if (useSandbox && !inboxId) {
      console.warn('[mail] MAILTRAP_INBOX_ID manquant — requis en mode sandbox.');
    }
    return;
  }

  if (env.mail.mode === 'preview') {
    console.log('[mail] Mode preview (Ethereal) — lien d\'aperçu dans la console.');
    return;
  }

  console.log(`[mail] Mode SMTP → ${target}`);
}

logMailConfig();

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Marneza API — http://localhost:${PORT}`);
  console.log(`📖 Documentation — http://localhost:${PORT}/api/docs`);
  console.log(`❤️  Health       — http://localhost:${PORT}/api/health\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\n❌ Port ${PORT} déjà utilisé.\n` +
        `   Arrête l'ancienne API (Ctrl+C) ou : netstat -ano | findstr :${PORT}\n` +
        `   puis : taskkill /PID <pid> /F\n`
    );
    process.exit(1);
  }
  throw err;
});

// Fermeture propre (évite EADDRINUSE sous node --watch)
function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Job expiration pending — toutes les 2 minutes
setInterval(expirePendingBookings, 2 * 60 * 1000);

// Rappels J-3, J-1, jour-J — toutes les heures (pas au démarrage immédiat)
setTimeout(sendBookingReminders, 5 * 60 * 1000);
setInterval(sendBookingReminders, 60 * 60 * 1000);

// Seed léger au démarrage (idempotent, sans backfill lourd à chaque restart)
(async () => {
  try {
    const templateService = require('./services/template.service');
    const synthesisService = require('./services/synthesis.service');
    const rentalTermsService = require('./services/rental-terms.service');
    await templateService.seedDefaultTemplates();
    await synthesisService.seedDefaultConfigs();
    await rentalTermsService.ensureDefaults();
    await require('./services/payment-settings.service').ensureDefaults();
  } catch (err) {
    console.warn('[init] Seed admin features:', err?.message || err);
  }
})();
