/**
 * Contrôleurs admin — dashboard, calendrier, sync.
 *
 * @module controllers/admin.controller
 * @see docs/API_MANUAL.md §5 — routes admin détaillées
 *
 * INDEX :
 * L35  listBookings         GET   /api/admin/bookings
 * L59  getBooking            GET   /api/admin/bookings/:id
 * L77  sendInvoice           POST  /api/admin/bookings/:id/send-invoice
 * L89  confirmPayment        POST  /api/admin/bookings/:id/confirm-payment
 * L104 cancelBooking         POST  /api/admin/bookings/:id/cancel
 * L116 refuseBooking         POST  /api/admin/bookings/:id/refuse
 * L129 updateBookingStatus    PATCH /api/admin/bookings/:id/status
 * L143 updateBookingAmount    PATCH /api/admin/bookings/:id/amount
 * L157 modifyBooking          PATCH /api/admin/bookings/:id
 * L176 getSecureLink          GET   /api/admin/bookings/:id/secure-link
 * L193 getCalendar            GET   /api/admin/calendar
 * L210 getUpcomingBookings    GET   /api/admin/bookings/upcoming
 * L222 getStats               GET   /api/admin/stats
 * L245 listPricing            GET   /api/admin/pricing
 * L258 updatePricingRule      PATCH /api/admin/pricing/:id
 */

const prisma = require('../config/database');
const bookingService = require('../services/booking.service');
const adminCalendarService = require('../services/admin-calendar.service');
const adminPricingService = require('../services/admin-pricing.service');
const synthesisService = require('../services/synthesis.service');
const templateService = require('../services/template.service');
const promoService = require('../services/promo.service');
const exportService = require('../services/export.service');
const referenceService = require('../services/reference.service');
const { runSyncOdooJob } = require('../jobs/sync-odoo.job');

/**
 * @route GET /api/admin/bookings
 * @query status — filtre optionnel (pending, confirmed, cancelled…)
 */
async function listBookings(req, res, next) {
  try {
    const { status } = req.query;
    const bookings = await prisma.booking.findMany({
      where: status ? { status } : undefined,
      include: {
        resource: true,
        customer: true,
        bookingType: true,
        feeLines: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const safe = bookings.map(({ accessToken, ...rest }) => rest);
    res.json({ data: safe });
  } catch (err) {
    next(err);
  }
}

/**
 * @route GET /api/admin/bookings/:id
 */
async function getBooking(req, res, next) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { resource: true, customer: true, bookingType: true, syncLogs: true },
    });
    if (!booking) {
      return res.status(404).json({ error: { message: 'Réservation introuvable' } });
    }
    res.json({ data: booking });
  } catch (err) {
    next(err);
  }
}

/**
 * @route POST /api/admin/bookings/:id/send-invoice
 */
async function sendInvoice(req, res, next) {
  try {
    const booking = await bookingService.sendInvoiceByAdmin(req.params.id);
    const mailWarning = booking._mailWarning || null;
    const { accessToken, _mailWarning, ...rest } = booking;

    // Sérialisation explicite — évite "Internal Server Error" (texte brut) si Decimal/spread Prisma casse res.json
    const plain = JSON.parse(
      JSON.stringify(rest, (_key, value) => {
        if (typeof value === 'bigint') return value.toString();
        if (value != null && typeof value === 'object' && typeof value.toNumber === 'function') {
          return value.toNumber();
        }
        return value;
      })
    );

    res.json({
      data: {
        ...plain,
        ...(mailWarning ? { _mailWarning: mailWarning } : {}),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route POST /api/admin/bookings/:id/confirm-payment
 */
async function confirmPayment(req, res, next) {
  try {
    const booking = await bookingService.confirmPaymentByAdmin(req.params.id);
    runSyncOdooJob(booking.id).catch((err) => {
      console.error('[sync-odoo] Échec sync booking', booking.id, err.message);
    });
    res.json({ data: booking });
  } catch (err) {
    next(err);
  }
}

async function downloadPaymentProof(req, res, next) {
  try {
    const booking = await bookingService.getById(req.params.id);
    const proofService = require('../services/payment-proof.service');
    const file = proofService.getProofFile(booking);
    res.setHeader('Content-Type', file.mime);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.name)}"`
    );
    require('fs').createReadStream(file.absolutePath).pipe(res);
  } catch (err) {
    next(err);
  }
}

/**
 * @route POST /api/admin/bookings/:id/cancel
 */
async function cancelBooking(req, res, next) {
  try {
    const booking = await bookingService.cancel(req.params.id);
    res.json({ data: booking });
  } catch (err) {
    next(err);
  }
}

/**
 * @route POST /api/admin/bookings/:id/refuse
 */
async function refuseBooking(req, res, next) {
  try {
    const booking = await bookingService.refuse(req.params.id);
    res.json({ data: booking });
  } catch (err) {
    next(err);
  }
}

/**
 * @route DELETE /api/admin/bookings/:id
 */
async function deleteBooking(req, res, next) {
  try {
    const result = await bookingService.deletePermanently(req.params.id);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * @route PATCH /api/admin/bookings/:id/status
 * @body status
 */
async function updateBookingStatus(req, res, next) {
  try {
    const { status } = req.body ?? {};
    const booking = await bookingService.updateStatus(req.params.id, status);
    res.json({ data: booking });
  } catch (err) {
    next(err);
  }
}

/**
 * @route PATCH /api/admin/bookings/:id/amount
 * @body totalAmount, priceNote?
 */
async function updateBookingAmount(req, res, next) {
  try {
    const { totalAmount, priceNote } = req.body ?? {};
    const booking = await bookingService.updateAmount(req.params.id, { totalAmount, priceNote });
    res.json({ data: booking });
  } catch (err) {
    next(err);
  }
}

/**
 * @route PATCH /api/admin/bookings/:id
 * @body startAt?, endAt?, notes?, priceNote?, feeLines?: [{ label, amount }]
 */
async function modifyBooking(req, res, next) {
  try {
    const { startAt, endAt, notes, priceNote, feeLines } = req.body ?? {};
    const booking = await bookingService.modifyByAdmin(req.params.id, {
      startAt,
      endAt,
      notes,
      priceNote,
      feeLines,
    });
    res.json({ data: booking });
  } catch (err) {
    next(err);
  }
}

/**
 * @route GET /api/admin/bookings/:id/secure-link
 */
async function getSecureLink(req, res, next) {
  try {
    const booking = await bookingService.getById(req.params.id);
    res.json({
      data: {
        url: bookingService.clientBookingUrl(booking),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @route GET /api/admin/calendar
 * @query resource_slug, from, to
 */
async function getCalendar(req, res, next) {
  try {
    const { resource_slug: resourceSlug = 'all', from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: { message: 'from et to requis' } });
    }
    const data = await adminCalendarService.getCalendar({ resourceSlug, from, to });
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

/**
 * @route GET /api/admin/bookings/upcoming
 * Réservations confirmées dans les 3 prochains jours
 */
async function getUpcomingBookings(req, res, next) {
  try {
    const bookings = await adminCalendarService.getUpcoming();
    res.json({ data: bookings });
  } catch (err) {
    next(err);
  }
}

/**
 * @route GET /api/admin/stats
 */
async function getStats(req, res, next) {
  try {
    const [created, processing, paid, thisMonth] = await Promise.all([
      prisma.booking.count({ where: { status: 'created' } }),
      prisma.booking.count({ where: { status: 'processing' } }),
      prisma.booking.count({ where: { status: 'paid' } }),
      prisma.booking.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);
    res.json({ data: { created, processing, paid, thisMonth } });
  } catch (err) {
    next(err);
  }
}

/**
 * @route GET /api/admin/pricing
 */
async function listPricing(req, res, next) {
  try {
    const rules = await adminPricingService.listAll();
    res.json({ data: rules });
  } catch (err) {
    next(err);
  }
}

/**
 * @route PATCH /api/admin/pricing/:id
 * @body amount, compareAtAmount, promoLabel, validFrom, validTo, isActive
 */
async function updatePricingRule(req, res, next) {
  try {
    const rule = await adminPricingService.updateRule(req.params.id, req.body);
    res.json({ data: rule });
  } catch (err) {
    next(err);
  }
}

// ─── Synthèse & paramètres ─────────────────────────────────────

async function listSynthesisConfigs(req, res, next) {
  try {
    const configs = await synthesisService.listReminderConfigs();
    res.json({ data: configs });
  } catch (err) {
    next(err);
  }
}

async function getSynthesis(req, res, next) {
  try {
    const { horizonMonths, statuses, resourceIds } = req.query;
    let statusList;
    if (statuses) {
      statusList = String(statuses).split(',').map((s) => s.trim()).filter(Boolean);
    }
    let resourceIdList;
    if (resourceIds) {
      resourceIdList = String(resourceIds).split(',').map((s) => s.trim()).filter(Boolean);
    }
    const data = await synthesisService.getSynthesis({
      horizonMonths: horizonMonths != null ? Number(horizonMonths) : 0,
      statuses: statusList,
      resourceIds: resourceIdList,
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function saveSynthesisConfig(req, res, next) {
  try {
    const { id, ...body } = req.body ?? {};
    const config = await synthesisService.upsertReminderConfig(id || null, body);
    res.json({ data: config });
  } catch (err) {
    next(err);
  }
}

async function listEmailTemplates(req, res, next) {
  try {
    const templates = await templateService.listTemplates();
    res.json({ data: templates });
  } catch (err) {
    next(err);
  }
}

async function saveEmailTemplate(req, res, next) {
  try {
    const { code, ...body } = req.body ?? {};
    if (!code) {
      return res.status(400).json({ error: { message: 'code requis' } });
    }
    const template = await templateService.upsertTemplate(code, body);
    res.json({ data: template });
  } catch (err) {
    next(err);
  }
}

async function listPromoCodes(req, res, next) {
  try {
    const codes = await promoService.listPromoCodes();
    res.json({ data: codes });
  } catch (err) {
    next(err);
  }
}

async function createPromoCode(req, res, next) {
  try {
    const promo = await promoService.createPromoCode(req.body ?? {});
    res.status(201).json({ data: promo });
  } catch (err) {
    next(err);
  }
}

async function updatePromoCode(req, res, next) {
  try {
    const promo = await promoService.updatePromoCode(req.params.id, req.body ?? {});
    res.json({ data: promo });
  } catch (err) {
    next(err);
  }
}

async function exportBookings(req, res, next) {
  try {
    const { from, to, status } = req.query;
    const buffer = await exportService.exportBookingsBuffer({ from, to, status });
    const filename = `reservations-${from || 'all'}-${to || 'all'}.xlsx`.replace(/[^a-zA-Z0-9._-]/g, '-');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
}

async function backfillReferences(req, res, next) {
  try {
    const count = await referenceService.backfillMissingReferences();
    res.json({ data: { backfilled: count } });
  } catch (err) {
    next(err);
  }
}

async function listRentalTermsAdmin(_req, res, next) {
  try {
    const terms = await require('../services/rental-terms.service').listAll();
    res.json({ data: terms });
  } catch (err) {
    next(err);
  }
}

async function createRentalTerm(req, res, next) {
  try {
    const term = await require('../services/rental-terms.service').create(req.body ?? {});
    res.status(201).json({ data: term });
  } catch (err) {
    next(err);
  }
}

async function updateRentalTerm(req, res, next) {
  try {
    const term = await require('../services/rental-terms.service').update(req.params.id, req.body ?? {});
    res.json({ data: term });
  } catch (err) {
    next(err);
  }
}

async function deleteRentalTerm(req, res, next) {
  try {
    const result = await require('../services/rental-terms.service').remove(req.params.id);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function reorderRentalTerms(req, res, next) {
  try {
    const { orderedIds } = req.body ?? {};
    const terms = await require('../services/rental-terms.service').reorder(orderedIds);
    res.json({ data: terms });
  } catch (err) {
    next(err);
  }
}

async function getPaymentSettings(req, res, next) {
  try {
    const settings = await require('../services/payment-settings.service').getPaymentSettings();
    res.json({ data: settings });
  } catch (err) {
    next(err);
  }
}

async function savePaymentSettings(req, res, next) {
  try {
    const settings = await require('../services/payment-settings.service').upsertPaymentSettings(
      req.body ?? {}
    );
    res.json({ data: settings });
  } catch (err) {
    next(err);
  }
}

async function getSiteHomeAdmin(_req, res, next) {
  try {
    const site = require('../services/site-content.service');
    const [home, resources] = await Promise.all([
      site.getHomeTexts(),
      site.listResourcesForAdmin(),
    ]);
    res.json({ data: { home, resources } });
  } catch (err) {
    next(err);
  }
}

async function saveSiteHomeTexts(req, res, next) {
  try {
    const home = await require('../services/site-content.service').updateHomeTexts(req.body ?? {});
    res.json({ data: home });
  } catch (err) {
    next(err);
  }
}

async function updateResourceShowcase(req, res, next) {
  try {
    const resource = await require('../services/site-content.service').updateResourceShowcase(
      req.params.id,
      req.body ?? {}
    );
    res.json({ data: resource });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listBookings,
  getBooking,
  sendInvoice,
  confirmPayment,
  downloadPaymentProof,
  cancelBooking,
  refuseBooking,
  deleteBooking,
  updateBookingStatus,
  updateBookingAmount,
  modifyBooking,
  getSecureLink,
  getUpcomingBookings,
  getCalendar,
  getStats,
  listPricing,
  updatePricingRule,
  listSynthesisConfigs,
  getSynthesis,
  saveSynthesisConfig,
  listEmailTemplates,
  saveEmailTemplate,
  listPromoCodes,
  createPromoCode,
  updatePromoCode,
  exportBookings,
  backfillReferences,
  listRentalTermsAdmin,
  createRentalTerm,
  updateRentalTerm,
  deleteRentalTerm,
  reorderRentalTerms,
  getPaymentSettings,
  savePaymentSettings,
  getSiteHomeAdmin,
  saveSiteHomeTexts,
  updateResourceShowcase,
};
