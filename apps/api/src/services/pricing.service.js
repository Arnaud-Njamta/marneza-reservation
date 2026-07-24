/**
 * Service tarification — calcule le prix d'une réservation.
 *
 * @module services/pricing.service
 * @calledBy services/booking.service.js
 * @calledBy controllers/pricing.controller.js
 * @db pricing_rules
 */

const prisma = require('../config/database');
const env = require('../config/env');
const { isRuleEffective } = require('./admin-pricing.service');
const { canIncludeApartment } = require('./availability.service');

function formatQuote(rule, customerCategory = 'personnel') {
  const base =
    customerCategory === 'entreprise'
      ? Number(rule.amountEntreprise ?? rule.amount)
      : Number(rule.amountPersonnel ?? rule.amount);

  const quote = {
    amount: base,
    currency: rule.currency || env.defaultCurrency,
    customerCategory,
  };

  if (rule.compareAtAmount != null && Number(rule.compareAtAmount) > base) {
    quote.compareAtAmount = Number(rule.compareAtAmount);
  }
  if (rule.promoLabel) {
    quote.promoLabel = rule.promoLabel;
  }

  return quote;
}

/**
 * @param {Object} params
 * @param {string} params.resourceId
 * @param {string} params.bookingTypeId
 * @param {string} [params.customerCategory]
 * @param {string} [params.promoCode]
 */
async function getQuote({
  resourceId,
  bookingTypeId,
  customerCategory = 'personnel',
  promoCode,
  includeApartment = false,
  resourceSlug,
}) {
  const rule = await prisma.pricingRule.findFirst({
    where: { resourceId, bookingTypeId },
  });

  if (!rule) {
    const err = new Error('Tarif non configuré pour ce type de location');
    err.statusCode = 400;
    throw err;
  }

  if (!isRuleEffective(rule)) {
    const err = new Error(
      'Ce tarif est hors période (dates de début/fin de la promo) ou désactivé. Vérifiez les dates dans Admin → Tarifs.'
    );
    err.statusCode = 400;
    throw err;
  }

  if (includeApartment && resourceSlug && !canIncludeApartment(resourceSlug)) {
    const err = new Error('Option appartement non disponible pour cette ressource');
    err.statusCode = 400;
    throw err;
  }

  const quote = formatQuote(rule, customerCategory);

  if (promoCode) {
    const promoService = require('./promo.service');
    const promo = await promoService.validatePromoCode(promoCode);
    quote.promoCode = promo.code;
    quote.promoCodeId = promo.id;
    quote.promoDiscount = promo.discountAmount;
    quote.amountBeforePromo = quote.amount;
    quote.amount = promoService.applyDiscount(quote.amount, promo.discountAmount);
  }

  if (includeApartment) {
    quote.includesApartment = true;
    quote.apartmentAddon = env.apartmentAddonAmount;
    quote.amount += env.apartmentAddonAmount;
  }

  return quote;
}

module.exports = { getQuote, formatQuote };
