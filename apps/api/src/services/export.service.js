/**
 * Export Excel des réservations.
 *
 * @module services/export.service
 */

const ExcelJS = require('exceljs');
const prisma = require('../config/database');

const STATUS_LABELS = {
  created: 'Créée',
  processing: 'En cours',
  paid: 'Payée',
  fulfilled: 'Réalisée',
  cancelled: 'Annulée',
  refused: 'Refusée',
};

function durationHours(startAt, endAt) {
  const ms = new Date(endAt).getTime() - new Date(startAt).getTime();
  return Math.round((ms / 3600000) * 10) / 10;
}

function formatDt(iso) {
  return new Date(iso).toLocaleString('fr-FR', { timeZone: 'Africa/Kinshasa' });
}

async function fetchBookingsForExport({ from, to, status }) {
  const where = {};
  if (status) where.status = status;
  if (from || to) {
    where.startAt = {};
    if (from) where.startAt.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      where.startAt.lte = end;
    }
  }

  return prisma.booking.findMany({
    where,
    include: { resource: true, customer: true, bookingType: true, promoCode: true },
    orderBy: { startAt: 'asc' },
  });
}

async function buildBookingsWorkbook({ from, to, status }) {
  const bookings = await fetchBookingsForExport({ from, to, status });
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Marneza Reservation';
  const ws = wb.addWorksheet('Réservations');

  ws.columns = [
    { header: 'Référence', key: 'reference', width: 22 },
    { header: 'Client', key: 'client', width: 24 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Téléphone', key: 'phone', width: 16 },
    { header: 'Espace', key: 'space', width: 22 },
    { header: 'Type location', key: 'type', width: 18 },
    { header: 'Catégorie', key: 'category', width: 12 },
    { header: 'Entreprise', key: 'company', width: 20 },
    { header: 'Début', key: 'start', width: 20 },
    { header: 'Fin', key: 'end', width: 20 },
    { header: 'Durée (h)', key: 'hours', width: 10 },
    { header: 'Montant', key: 'amount', width: 12 },
    { header: 'Devise', key: 'currency', width: 8 },
    { header: 'Code promo', key: 'promo', width: 14 },
    { header: 'Réduction', key: 'discount', width: 10 },
    { header: 'Statut', key: 'status', width: 12 },
    { header: 'Remarques client', key: 'notes', width: 32 },
    { header: 'Créée le', key: 'created', width: 20 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F0EB' } };

  for (const b of bookings) {
    ws.addRow({
      reference: b.referenceNumber ?? b.id.slice(0, 8),
      client: `${b.customer.firstName} ${b.customer.lastName}`,
      email: b.customer.email,
      phone: b.customer.phone ?? '',
      space: b.resource.name,
      type: b.bookingType.name,
      category: b.customerCategory === 'entreprise' ? 'Entreprise' : 'Personnel',
      company: b.companyName ?? '',
      start: formatDt(b.startAt),
      end: formatDt(b.endAt),
      hours: durationHours(b.startAt, b.endAt),
      amount: Number(b.totalAmount),
      currency: b.currency,
      promo: b.promoCode?.code ?? '',
      discount: b.promoDiscount != null ? Number(b.promoDiscount) : '',
      status: STATUS_LABELS[b.status] ?? b.status,
      notes: b.notes ?? '',
      created: formatDt(b.createdAt),
    });
  }

  return { wb, count: bookings.length };
}

async function exportBookingsBuffer(opts) {
  const { wb } = await buildBookingsWorkbook(opts);
  return wb.xlsx.writeBuffer();
}

module.exports = { exportBookingsBuffer, buildBookingsWorkbook, fetchBookingsForExport };
