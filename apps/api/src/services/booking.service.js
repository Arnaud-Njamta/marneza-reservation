/**
 * Service réservations — création, workflow client, admin.
 *
 * @module services/booking.service
 * @see docs/API_MANUAL.md §6 — documentation ligne par ligne
 *
 * INDEX DES FONCTIONS (numéros de ligne exacts — voir grep si le fichier évolue) :
 * ────────────────────────────────────────────────────────
 * L56  bookingInclude()           — relations Prisma à charger
 * L66  generateAccessToken()      — token 64 hex pour lien client
 * L81  createPending(data)         — POST /api/bookings — hold 15 min
 * L204 linkExpiryDate()            — now + BOOKING_LINK_EXPIRE_HOURS
 * L208 assertAccessToken(id,token) — middleware booking-access
 * L251 getById(id)                 — GET /api/bookings/:id
 * L266 cancel(id)                  — annulation client ou admin
 * L283 submitByClient(id)          — POST .../submit — → processing
 * L326 sendInvoiceByAdmin(id)      — POST admin .../send-invoice
 * L346 claimPaymentByClient(id)    — POST .../claim-payment
 * L375 confirmPaymentByAdmin(id)   — POST admin .../confirm-payment → paid
 * L416 refuse(id)                  — refus admin
 * L431 updateStatus(id, status)    — PATCH admin .../status
 * L463 updateAmount(id, data)      — PATCH admin .../amount
 * L493 modifyByAdmin(id, data)     — PATCH admin .../id (dates + frais)
 * L580 markAsProcessingFromEmail   — lien email admin review
 *
 * STATUTS : created → processing → paid → fulfilled
 *           created/processing → cancelled | refused
 */

const prisma = require('../config/database');
const env = require('../config/env');
const crypto = require('crypto');
const availabilityService = require('./availability.service');
const slotCalculator = require('./slot-calculator.service');
const pricingService = require('./pricing.service');
const mailService = require('./mail.service');
const { generateReferenceNumber } = require('./reference.service');
const promoService = require('./promo.service');
const { clientBookingUrl } = require('../utils/booking-url');

const BOOKING_STATUSES = {
  CREATED: 'created',
  PROCESSING: 'processing',
  PAID: 'paid',
  FULFILLED: 'fulfilled',
  CANCELLED: 'cancelled',
  REFUSED: 'refused',
};

const FINAL_STATUSES = new Set([
  BOOKING_STATUSES.CANCELLED,
  BOOKING_STATUSES.REFUSED,
  BOOKING_STATUSES.FULFILLED,
]);

const CUSTOMER_CATEGORIES = new Set(['personnel', 'entreprise']);

function bookingInclude() {
  return {
    resource: true,
    bookingType: true,
    customer: true,
    payments: true,
    feeLines: { orderBy: { createdAt: 'asc' } },
  };
}

function generateAccessToken() {
  return crypto.randomBytes(32).toString('hex');
}

function sumFeeLines(feeLines) {
  return feeLines.reduce((sum, line) => sum + Number(line.amount), 0);
}

function computeTotalAmount(quotedAmount, feeLines) {
  return Number(quotedAmount) + sumFeeLines(feeLines);
}

/**
 * Crée une réservation avec hold 15 min.
 *
 * Appelée par : POST /api/bookings → controllers/index.js:createBooking (L98)
 * @see docs/API_MANUAL.md §4.1
 */
async function createPending(data) {
  // ── Étape 1 : destructuration du body JSON (voir API_MANUAL §4.1 body) ──
  const {
    resourceSlug,
    bookingTypeCode,
    date,
    endDate,
    startHour,
    eventType,
    customerCategory = 'personnel',
    companyName,
    customer: customerData,
    notes,
    promoCode,
    includeApartment: includeApartmentRequested = false,
  } = data;

  const includeApartment =
    Boolean(includeApartmentRequested) && availabilityService.canIncludeApartment(resourceSlug);

  // ── Étape 2 : validation catégorie client (personnel | entreprise) ──
  if (!CUSTOMER_CATEGORIES.has(customerCategory)) {
    const err = new Error('Type de client invalide (personnel ou entreprise)');
    err.statusCode = 400;
    throw err;
  }

  if (customerCategory === 'entreprise' && !companyName?.trim()) {
    const err = new Error('Le nom de l\'entreprise est requis');
    err.statusCode = 400;
    throw err;
  }

  // ── Étape 3 : charge la ressource (espace) par slug + types de location ──
  const resource = await prisma.resource.findUnique({
    where: { slug: resourceSlug },
    include: { resourceType: { include: { bookingTypes: true } } },
  });

  if (!resource) {
    const err = new Error('Ressource introuvable');
    err.statusCode = 404;
    throw err;
  }

  const bookingType = resource.resourceType.bookingTypes.find(
    (bt) =>
      bt.code === bookingTypeCode ||
      bt.code === `conf_${bookingTypeCode}` ||
      bt.code === `apt_${bookingTypeCode}`
  );

  if (!bookingType) {
    const err = new Error('Type de location invalide');
    err.statusCode = 400;
    throw err;
  }

  // ── Étape 4 : calcule startAt/endAt selon type (jour, heure, nuit…) ──
  const { startAt, endAt } = slotCalculator.computeInterval({
    date,
    endDate,
    bookingType,
    startHour,
  });

  // ── Étape 5 : vérifie qu'aucune autre réservation ne chevauche → 409 si conflit ──
  await availabilityService.assertNoConflict({
    resourceId: resource.id,
    startAt,
    endAt,
  });

  if (includeApartment) {
    await availabilityService.assertApartmentAvailable({ startAt, endAt });
  }

  // ── Étape 6 : calcule le tarif depuis pricing_rules (personnel/entreprise) + promo ──
  const quote = await pricingService.getQuote({
    resourceId: resource.id,
    bookingTypeId: bookingType.id,
    customerCategory,
    promoCode,
    includeApartment,
    resourceSlug,
  });
  const { amount, currency, promoCodeId, promoDiscount } = quote;
  const apartmentFee = includeApartment ? env.apartmentAddonAmount : 0;
  const roomAmount = amount - apartmentFee;

  // ── Étape 7 : expiration du hold (BOOKING_HOLD_MINUTES, défaut 15 min) ──
  const expiresAt = new Date(Date.now() + env.bookingHoldMinutes * 60 * 1000);

  // ── Étape 8 : rattacher / créer le client (email)
  // L'identité AFFICHÉE est figée sur le booking (guest*). On peut mettre à
  // jour la fiche Customer (CRM / dernier contact) sans renommer l'historique,
  // car admin/mails lisent guest* en priorité.
  const guestFirst = String(customerData?.firstName || '').trim();
  const guestLast = String(customerData?.lastName || '').trim();
  const guestEmail = String(customerData?.email || '').trim().toLowerCase();
  const guestPhone = customerData?.phone ? String(customerData.phone).trim() : null;

  if (!guestFirst || !guestLast || !guestEmail) {
    const err = new Error('Prénom, nom et email sont obligatoires');
    err.statusCode = 400;
    throw err;
  }

  let customer = await prisma.customer.findFirst({
    where: { email: guestEmail },
  });

  if (!customer) {
    // Compat : anciens customers éventuellement stockés avec une autre casse
    customer = await prisma.customer.findFirst({
      where: { email: customerData.email },
    });
  }

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        email: guestEmail,
        phone: guestPhone,
        firstName: guestFirst,
        lastName: guestLast,
      },
    });
  } else {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        firstName: guestFirst,
        lastName: guestLast,
        email: guestEmail,
        ...(guestPhone ? { phone: guestPhone } : {}),
      },
    });
  }

  // ── Étape 9 : INSERT booking + snapshot identité + référence + accessToken ──
  const referenceNumber = await generateReferenceNumber();
  const booking = await prisma.booking.create({
    data: {
      resourceId: resource.id,
      customerId: customer.id,
      guestFirstName: guestFirst,
      guestLastName: guestLast,
      guestEmail,
      guestPhone,
      bookingTypeId: bookingType.id,
      eventType,
      startAt,
      endAt,
      status: BOOKING_STATUSES.CREATED,
      expiresAt,
      customerCategory,
      companyName: customerCategory === 'entreprise' ? companyName.trim() : null,
      quotedAmount: roomAmount,
      totalAmount: amount,
      currency,
      notes,
      referenceNumber,
      promoCodeId: promoCodeId ?? null,
      promoDiscount: promoDiscount ?? null,
      includesApartment: includeApartment,
      accessToken: generateAccessToken(),
      ...(includeApartment
        ? {
            feeLines: {
              create: [
                {
                  label: 'Appartement Marneza inclus',
                  amount: apartmentFee,
                },
              ],
            },
          }
        : {}),
    },
    include: bookingInclude(),
  });

  if (promoCodeId) {
    await promoService.incrementPromoUsage(promoCodeId);
  }

  // ── Étape 10 : email client (async, erreur loggée sans bloquer la réponse) ──
  mailService.sendClientBookingCreatedEmail(booking).catch((err) => {
    console.error('[mail] Echec email création client', booking.id, err?.message || err);
  });

  return booking;
}

/** Date d'expiration du lien client après paiement confirmé (BOOKING_LINK_EXPIRE_HOURS). */
function linkExpiryDate() {
  return new Date(Date.now() + env.bookingLinkExpireHours * 60 * 60 * 1000);
}

/**
 * Vérifie le token d'accès client (query ?token= ou header X-Booking-Token).
 *
 * Appelée par : middlewares/booking-access.middleware.js (L26-27)
 * @see docs/API_MANUAL.md §9.2
 */
async function assertAccessToken(id, token) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { accessToken: true, accessTokenExpiresAt: true, status: true },
  });

  if (!booking) {
    const err = new Error('Réservation introuvable');
    err.statusCode = 404;
    throw err;
  }

  // Réservation annulée ou refusée → lien mort
  if (['cancelled', 'refused'].includes(booking.status)) {
    const err = new Error('Cette réservation n\'est plus disponible');
    err.statusCode = 403;
    throw err;
  }

  // Lien expiré 24 h après paiement (accessTokenExpiresAt défini à confirmPayment)
  if (booking.accessTokenExpiresAt && booking.accessTokenExpiresAt < new Date()) {
    const err = new Error(
      'Ce lien a expiré. Contactez l\'équipe Marneza si vous avez besoin d\'informations.'
    );
    err.statusCode = 403;
    throw err;
  }

  const provided = String(token || '');
  const stored = booking.accessToken || '';

  if (!provided || provided.length < 32 || stored.length !== provided.length) {
    const err = new Error('Lien de réservation invalide ou expiré');
    err.statusCode = 403;
    throw err;
  }

  const match = crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(provided));
  if (!match) {
    const err = new Error('Lien de réservation invalide ou expiré');
    err.statusCode = 403;
    throw err;
  }
}

async function getById(id) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: bookingInclude(),
  });

  if (!booking) {
    const err = new Error('Réservation introuvable');
    err.statusCode = 404;
    throw err;
  }

  return booking;
}

async function cancel(id) {
  const booking = await getById(id);

  if (FINAL_STATUSES.has(booking.status)) {
    const err = new Error('Cette réservation ne peut pas être annulée');
    err.statusCode = 400;
    throw err;
  }

  return prisma.booking.update({
    where: { id },
    data: { status: BOOKING_STATUSES.CANCELLED, expiresAt: null },
    include: bookingInclude(),
  });
}

/** Client confirme (conditions acceptées) → processing + email admin */
async function submitByClient(id, { termsAccepted }) {
  const booking = await getById(id);

  if (!termsAccepted) {
    const err = new Error('Vous devez accepter les conditions de location');
    err.statusCode = 400;
    throw err;
  }

  if (booking.status !== BOOKING_STATUSES.CREATED) {
    const err = new Error('Cette demande a déjà été envoyée');
    err.statusCode = 400;
    throw err;
  }

  if (booking.expiresAt && booking.expiresAt < new Date()) {
    const err = new Error('Le délai de réservation est expiré');
    err.statusCode = 400;
    throw err;
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status: BOOKING_STATUSES.PROCESSING,
      expiresAt: null,
      termsAcceptedAt: new Date(),
    },
    include: bookingInclude(),
  });

  mailService.sendAdminNewBookingEmail(updated).catch((err) => {
    console.error('[mail] Echec notification admin (nouvelle demande)', id, err?.message || err);
  });

  mailService.sendClientSubmitConfirmedEmail(updated).catch((err) => {
    console.error('[mail] Echec confirmation client', id, err?.message || err);
  });

  return updated;
}

/** Admin envoie la synthèse de réservation + instructions au client */
async function sendInvoiceByAdmin(id) {
  const booking = await getById(id);

  if (booking.status !== BOOKING_STATUSES.PROCESSING) {
    const err = new Error(
      'La synthèse ne peut être envoyée que pour une réservation « en cours de traitement » (le client doit d\'abord confirmer sa demande).'
    );
    err.statusCode = 400;
    throw err;
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { invoiceSentAt: new Date() },
    include: bookingInclude(),
  });

  // L'email ne doit pas bloquer le workflow admin (quota Mailtrap, SMTP down, etc.)
  try {
    await mailService.sendClientInvoiceEmail(updated);
  } catch (err) {
    console.error('[mail] Échec envoi synthèse client', id, err?.message || err);
    updated._mailWarning =
      'Synthèse marquée comme envoyée, mais l\'email a échoué (vérifiez Mailtrap / SMTP). Vous pouvez renvoyer.';
  }

  return updated;
}

/** Client signale avoir payé (virement / mobile money) — n'accorde PAS le statut payé.
 *  Preuve (PDF/image) optionnelle mais recommandée — jointe dans le même envoi. */
async function claimPaymentByClient(id, file) {
  const booking = await getById(id);

  if (booking.status !== BOOKING_STATUSES.PROCESSING) {
    const err = new Error('Action non disponible pour ce statut');
    err.statusCode = 400;
    throw err;
  }

  if (!booking.invoiceSentAt) {
    const err = new Error('La synthèse de réservation n\'a pas encore été envoyée par l\'admin');
    err.statusCode = 400;
    throw err;
  }

  if (file) {
    const proofService = require('./payment-proof.service');
    await proofService.savePaymentProof(id, file);
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { paymentClaimedAt: new Date() },
    include: bookingInclude(),
  });

  mailService.sendAdminPaymentClaimedEmail(updated).catch((err) => {
    console.error('[mail] Echec notification paiement signalé', id, err?.message || err);
  });

  mailService.sendClientPaymentClaimedAckEmail(updated).catch((err) => {
    console.error('[mail] Echec ack client paiement signalé', id, err?.message || err);
  });

  return updated;
}

/** Admin confirme réception du paiement → payé */
async function confirmPaymentByAdmin(id) {
  const booking = await getById(id);

  if (booking.status !== BOOKING_STATUSES.PROCESSING) {
    const err = new Error('Seules les réservations en cours de traitement peuvent être marquées payées');
    err.statusCode = 400;
    throw err;
  }

  // Transaction atomique : statut paid + enregistrement paiement manuel + expiration lien 24h
  const updated = await prisma.$transaction(async (tx) => {
    const paidBooking = await tx.booking.update({
      where: { id },
      data: {
        status: BOOKING_STATUSES.PAID,
        expiresAt: null, // plus de hold
        accessTokenExpiresAt: linkExpiryDate(), // lien client valide encore 24 h
      },
      include: bookingInclude(),
    });

    // Trace comptable du virement (provider=manual, pas de passerelle bancaire)
    await tx.payment.create({
      data: {
        bookingId: id,
        amount: paidBooking.totalAmount,
        currency: paidBooking.currency,
        status: 'paid',
        provider: 'manual',
        paidAt: new Date(),
      },
    });

    return paidBooking;
  });

  mailService.sendClientPaymentConfirmedEmail(updated).catch((err) => {
    console.error('[mail] Echec confirmation client', id, err?.message || err);
  });

  return updated;
}

async function refuse(id) {
  const booking = await getById(id);
  if (FINAL_STATUSES.has(booking.status)) {
    const err = new Error('Cette réservation est déjà finalisée');
    err.statusCode = 400;
    throw err;
  }

  return prisma.booking.update({
    where: { id },
    data: { status: BOOKING_STATUSES.REFUSED, expiresAt: null },
    include: bookingInclude(),
  });
}

/**
 * Suppression définitive (admin) — irréversible.
 * Efface paiements, sync Odoo, lignes liées, preuve disque, puis la réservation.
 */
async function deletePermanently(id) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    const err = new Error('Réservation introuvable');
    err.statusCode = 404;
    throw err;
  }

  if (booking.paymentProofPath) {
    try {
      const fs = require('fs');
      const path = require('path');
      const abs = path.join(
        path.resolve(__dirname, '../../../uploads/payment-proofs'),
        path.basename(booking.paymentProofPath)
      );
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    } catch (err) {
      console.warn('[booking] Impossible de supprimer la preuve disque', id, err?.message || err);
    }
  }

  await prisma.$transaction([
    prisma.payment.deleteMany({ where: { bookingId: id } }),
    prisma.odooSyncLog.deleteMany({ where: { bookingId: id } }),
    prisma.bookingFeeLine.deleteMany({ where: { bookingId: id } }),
    prisma.bookingOptionLine.deleteMany({ where: { bookingId: id } }),
    prisma.booking.delete({ where: { id } }),
  ]);

  return { id, deleted: true };
}

async function updateStatus(id, status) {
  if (!Object.values(BOOKING_STATUSES).includes(status)) {
    const err = new Error('Statut invalide');
    err.statusCode = 400;
    throw err;
  }

  const booking = await getById(id);

  if (FINAL_STATUSES.has(booking.status) && booking.status !== status) {
    const err = new Error('Réservation finalisée, changement interdit');
    err.statusCode = 400;
    throw err;
  }

  const shouldClearExpiry = status !== BOOKING_STATUSES.CREATED;
  const tokenExpiryPatch =
    status === BOOKING_STATUSES.PAID && !booking.accessTokenExpiresAt
      ? { accessTokenExpiresAt: linkExpiryDate() }
      : {};

  return prisma.booking.update({
    where: { id },
    data: {
      status,
      expiresAt: shouldClearExpiry ? null : booking.expiresAt,
      ...tokenExpiryPatch,
    },
    include: bookingInclude(),
  });
}

async function updateAmount(id, { totalAmount, priceNote }) {
  const booking = await getById(id);

  if (![BOOKING_STATUSES.CREATED, BOOKING_STATUSES.PROCESSING].includes(booking.status)) {
    const err = new Error('Le montant ne peut être modifié qu\'avant le paiement');
    err.statusCode = 400;
    throw err;
  }

  const amount = Number(totalAmount);
  if (!Number.isFinite(amount) || amount < 0) {
    const err = new Error('Montant invalide');
    err.statusCode = 400;
    throw err;
  }

  return prisma.booking.update({
    where: { id },
    data: {
      totalAmount: amount,
      priceNote: priceNote?.trim() || null,
    },
    include: bookingInclude(),
  });
}

/**
 * Admin modifie créneau / notes / frais facture.
 * Recalcule totalAmount = tarif de base + somme des frais.
 */
async function modifyByAdmin(id, data) {
  const booking = await getById(id);

  if (FINAL_STATUSES.has(booking.status)) {
    const err = new Error('Cette réservation ne peut plus être modifiée');
    err.statusCode = 400;
    throw err;
  }

  const { startAt, endAt, notes, priceNote, feeLines } = data;

  const nextStart = startAt ? new Date(startAt) : booking.startAt;
  const nextEnd = endAt ? new Date(endAt) : booking.endAt;

  if (Number.isNaN(nextStart.getTime()) || Number.isNaN(nextEnd.getTime()) || nextEnd <= nextStart) {
    const err = new Error('Dates invalides');
    err.statusCode = 400;
    throw err;
  }

  const datesChanged =
    nextStart.getTime() !== new Date(booking.startAt).getTime() ||
    nextEnd.getTime() !== new Date(booking.endAt).getTime();

  if (datesChanged) {
    await availabilityService.assertNoConflict({
      resourceId: booking.resourceId,
      startAt: nextStart,
      endAt: nextEnd,
      excludeBookingId: id,
    });
  }

  let normalizedFees = booking.feeLines;
  if (Array.isArray(feeLines)) {
    normalizedFees = feeLines
      .filter((line) => line.label?.trim() && Number(line.amount) > 0)
      .map((line) => ({
        label: line.label.trim(),
        amount: Number(line.amount),
      }));

    if (normalizedFees.some((line) => !Number.isFinite(line.amount) || line.amount < 0)) {
      const err = new Error('Montant de frais invalide');
      err.statusCode = 400;
      throw err;
    }
  }

  const baseAmount = Number(booking.quotedAmount ?? booking.totalAmount);
  const nextTotal = computeTotalAmount(baseAmount, normalizedFees);
  const feesChanged = Array.isArray(feeLines);
  const contentChanged = datesChanged || feesChanged || notes !== undefined || priceNote !== undefined;

  const updated = await prisma.$transaction(async (tx) => {
    if (feesChanged) {
      await tx.bookingFeeLine.deleteMany({ where: { bookingId: id } });
      if (normalizedFees.length > 0) {
        await tx.bookingFeeLine.createMany({
          data: normalizedFees.map((line) => ({
            bookingId: id,
            label: line.label,
            amount: line.amount,
          })),
        });
      }
    }

    return tx.booking.update({
      where: { id },
      data: {
        startAt: nextStart,
        endAt: nextEnd,
        totalAmount: nextTotal,
        notes: notes !== undefined ? notes?.trim() || null : undefined,
        priceNote: priceNote !== undefined ? priceNote?.trim() || null : undefined,
        ...(contentChanged && booking.invoiceSentAt
          ? { paymentClaimedAt: null }
          : {}),
      },
      include: bookingInclude(),
    });
  });

  return updated;
}

async function markAsProcessingFromEmail(id) {
  const booking = await getById(id);
  if (booking.status !== BOOKING_STATUSES.CREATED) {
    return booking;
  }

  return prisma.booking.update({
    where: { id },
    data: {
      status: BOOKING_STATUSES.PROCESSING,
      expiresAt: null,
    },
    include: bookingInclude(),
  });
}

module.exports = {
  createPending,
  getById,
  assertAccessToken,
  clientBookingUrl,
  cancel,
  submitByClient,
  sendInvoiceByAdmin,
  claimPaymentByClient,
  confirmPaymentByAdmin,
  refuse,
  deletePermanently,
  updateStatus,
  updateAmount,
  modifyByAdmin,
  markAsProcessingFromEmail,
  BOOKING_STATUSES,
};
