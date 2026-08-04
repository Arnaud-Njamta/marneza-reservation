/**
 * Contrôleurs HTTP — fine couche entre routes et services.
 *
 * @module controllers
 * @see docs/API_MANUAL.md §4 — routes publiques détaillées
 * @pattern Route → Controller → Service → Prisma
 *
 * INDEX :
 * L31  listResources      GET  /api/resources
 * L40  getResource        GET  /api/resources/:slug
 * L51  getAvailability    GET  /api/resources/:slug/availability
 * L68  getQuote           GET  /api/pricing/quote
 * L98  createBooking      POST /api/bookings
 * L107 getBooking         GET  /api/bookings/:id
 * L117 cancelBooking      POST /api/bookings/:id/cancel
 * L126 submitBooking      POST /api/bookings/:id/submit
 * L138 claimPayment       POST /api/bookings/:id/claim-payment
 * L147 markBookingReviewedFromEmail  GET /api/bookings/:id/admin-review
 */

const resourceService = require('../services/resource.service');
const availabilityService = require('../services/availability.service');
const pricingService = require('../services/pricing.service');
const bookingService = require('../services/booking.service');
const mailService = require('../services/mail.service');
const env = require('../config/env');
const prisma = require('../config/database');

// ─── Resources ─────────────────────────────────────────────────

async function listResources(req, res, next) {
  try {
    const resources = await resourceService.listActive();
    res.json({ data: resources });
  } catch (err) {
    next(err);
  }
}

async function getResource(req, res, next) {
  try {
    const resource = await resourceService.getBySlug(req.params.slug);
    res.json({ data: resource });
  } catch (err) {
    next(err);
  }
}

// ─── Availability ────────────────────────────────────────────────

async function getAvailability(req, res, next) {
  try {
    const { from, to, booking_type: bookingTypeCode } = req.query;
    const result = await availabilityService.getAvailability({
      resourceSlug: req.params.slug,
      from,
      to,
      bookingTypeCode,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

// ─── Pricing ───────────────────────────────────────────────────

async function getQuote(req, res, next) {
  try {
    const {
      resource_slug: resourceSlug,
      booking_type_code: bookingTypeCode,
      customer_category: customerCategory = 'personnel',
      promo_code: promoCode,
      include_apartment: includeApartment,
    } = req.query;
    const resource = await resourceService.getBySlug(resourceSlug);
    const bookingType = resource.resourceType.bookingTypes.find(
      (bt) =>
        bt.code === bookingTypeCode ||
        bt.code === `conf_${bookingTypeCode}` ||
        bt.code === `apt_${bookingTypeCode}`
    );
    if (!bookingType) {
      return res.status(400).json({ error: 'Type de location invalide' });
    }
    const quote = await pricingService.getQuote({
      resourceId: resource.id,
      bookingTypeId: bookingType.id,
      customerCategory,
      promoCode,
      includeApartment: includeApartment === 'true' || includeApartment === '1',
      resourceSlug,
    });
    res.json({ data: quote });
  } catch (err) {
    next(err);
  }
}

async function validatePromo(req, res, next) {
  try {
    const { code } = req.query;
    const promo = await require('../services/promo.service').validatePromoCode(code);
    res.json({ data: promo });
  } catch (err) {
    next(err);
  }
}

// ─── Bookings ──────────────────────────────────────────────────

async function createBooking(req, res, next) {
  try {
    const booking = await bookingService.createPending(req.body);
    res.status(201).json({ data: booking });
  } catch (err) {
    next(err);
  }
}

async function getBooking(req, res, next) {
  try {
    const booking = await bookingService.getById(req.params.id);
    const { accessToken, ...safe } = booking;
    res.json({ data: safe });
  } catch (err) {
    next(err);
  }
}

async function cancelBooking(req, res, next) {
  try {
    const booking = await bookingService.cancel(req.params.id);
    res.json({ data: booking });
  } catch (err) {
    next(err);
  }
}

async function submitBooking(req, res, next) {
  try {
    const { termsAccepted } = req.body ?? {};
    const booking = await bookingService.submitByClient(req.params.id, {
      termsAccepted: Boolean(termsAccepted),
    });
    res.json({ data: booking });
  } catch (err) {
    next(err);
  }
}

async function claimPayment(req, res, next) {
  try {
    const booking = await bookingService.claimPaymentByClient(req.params.id, req.file);
    res.json({ data: booking });
  } catch (err) {
    next(err);
  }
}

async function uploadPaymentProof(req, res, next) {
  try {
    const proofService = require('../services/payment-proof.service');
    const booking = await proofService.savePaymentProof(req.params.id, req.file);
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

async function markBookingReviewedFromEmail(req, res, next) {
  try {
    const { token } = req.query;
    const { id } = req.params;
    if (!token) {
      return res.status(400).send('Lien invalide: token manquant');
    }

    const ok = mailService.verifyReviewToken(token, id);
    if (!ok) {
      return res.status(401).send('Lien invalide ou expiré');
    }

    await bookingService.markAsProcessingFromEmail(id);
    return res.redirect(`${env.appUrl}/admin`);
  } catch (err) {
    next(err);
  }
}

// ─── Admin ─────────────────────────────────────────────────────

async function adminListBookings(req, res, next) {
  try {
    const bookings = await prisma.booking.findMany({
      include: { resource: true, customer: true, bookingType: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ data: bookings });
  } catch (err) {
    next(err);
  }
}

async function adminCancelBooking(req, res, next) {
  try {
    const booking = await bookingService.cancel(req.params.id);
    res.json({ data: booking });
  } catch (err) {
    next(err);
  }
}

async function listRentalTerms(_req, res, next) {
  try {
    const terms = await require('../services/rental-terms.service').listActive();
    res.json({ data: terms });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listResources,
  getResource,
  getAvailability,
  getQuote,
  validatePromo,
  createBooking,
  getBooking,
  cancelBooking,
  submitBooking,
  claimPayment,
  uploadPaymentProof,
  downloadPaymentProof,
  markBookingReviewedFromEmail,
  listRentalTerms,
  adminListBookings,
  adminCancelBooking,
};
