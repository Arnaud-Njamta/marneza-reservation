/**
 * Job : expiration des réservations en attente (hold 15 min).
 *
 * @module jobs/expire-pending.job
 * @schedule Toutes les 2 minutes (à brancher via cron ou setInterval en dev)
 * @calls   prisma.booking.updateMany
 * @see     docs/FLOWS/02-hold-expiration.md
 *
 * Règle : created dont expiresAt < now() → status = cancelled
 */

const prisma = require('../config/database');

async function expirePendingBookings() {
  const result = await prisma.booking.updateMany({
    where: {
      status: 'created',
      expiresAt: { lt: new Date() },
    },
    data: { status: 'cancelled' },
  });

  if (result.count > 0) {
    console.log(`[expire-pending] ${result.count} réservation(s) expirée(s)`);
  }

  return result.count;
}

module.exports = { expirePendingBookings };
