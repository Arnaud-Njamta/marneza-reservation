/**
 * Sync Odoo — JSON-RPC basique (phase 2).
 *
 * @module services/odoo/odoo.sync.service
 * @calledBy jobs/sync-odoo.job.js
 * @see docs/ODOO_SYNC.md
 * @see docs/FLOWS/04-sync-odoo.md
 */

const prisma = require('../../config/database');
const env = require('../../config/env');
const { callOdoo, searchCreate } = require('./odoo.client');

async function syncBookingToOdoo(bookingId) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true, resource: true, bookingType: true },
  });

  if (!booking) throw new Error(`Booking ${bookingId} introuvable`);

  const log = await prisma.odooSyncLog.create({
    data: {
      bookingId,
      entityType: 'booking',
      entityId: bookingId,
      status: 'pending',
      requestData: {
        customerEmail: booking.customer.email,
        resource: booking.resource.slug,
        startAt: booking.startAt,
        endAt: booking.endAt,
      },
    },
  });

  try {
    if (!env.odoo.syncEnabled) {
      await prisma.odooSyncLog.update({
        where: { id: log.id },
        data: {
          status: 'success',
          responseData: { skipped: true, reason: 'ODOO_SYNC_ENABLED=false' },
        },
      });
      console.log(`[sync-odoo] Sync ignorée (désactivée) — booking ${bookingId}`);
      return { skipped: true };
    }

    // Phase 2 : créer res.partner + sale.order via JSON-RPC
    const partnerId = await searchCreate('res.partner', [['email', '=', booking.customer.email]], {
      name: `${booking.customer.firstName} ${booking.customer.lastName}`,
      email: booking.customer.email,
      phone: booking.customer.phone,
    });

    const orderId = await callOdoo('sale.order', 'create', [
      {
        partner_id: partnerId,
        note: `Réservation ${booking.resource.name} — ${booking.bookingType.name}\nDu ${booking.startAt} au ${booking.endAt}`,
      },
    ]);

    await prisma.booking.update({
      where: { id: bookingId },
      data: { odooSaleOrderId: orderId },
    });

    if (booking.customer.odooPartnerId !== partnerId) {
      await prisma.customer.update({
        where: { id: booking.customerId },
        data: { odooPartnerId: partnerId },
      });
    }

    await prisma.odooSyncLog.update({
      where: { id: log.id },
      data: { status: 'success', responseData: { partnerId, orderId } },
    });

    console.log(`[sync-odoo] OK booking ${bookingId} → sale.order ${orderId}`);
    return { partnerId, orderId };
  } catch (error) {
    await prisma.odooSyncLog.update({
      where: { id: log.id },
      data: { status: 'failed', errorMessage: error.message },
    });
    throw error;
  }
}

module.exports = { syncBookingToOdoo };
