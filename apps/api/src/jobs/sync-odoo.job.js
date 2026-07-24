/**
 * Job : sync réservation confirmée → Odoo (phase 2).
 *
 * @module jobs/sync-odoo.job
 * @triggeredBy BookingService.confirm() — phase 2
 * @calls   services/odoo/odoo.sync.service.js
 * @see     docs/FLOWS/04-sync-odoo.md
 */

const { syncBookingToOdoo } = require('../services/odoo/odoo.sync.service');

async function runSyncOdooJob(bookingId) {
  console.log(`[sync-odoo] Démarrage sync booking ${bookingId}`);
  return syncBookingToOdoo(bookingId);
}

module.exports = { runSyncOdooJob };
