/**
 * Liens Odoo Shop ↔ app réservation (option A).
 * Un produit Odoo = une ressource ; le prix réel est calculé dans l'app.
 *
 * @see docs/ODOO_SHOP_LINK.md
 */

import type { CustomerCategory, PricingRule, Resource } from '@/types/api';
import { ODOO_SITE } from '@/lib/marneza-theme';

/** Aligné sur DEFAULT_TIMEZONE API (Africa/Kinshasa). */
const BUSINESS_TZ = 'Africa/Kinshasa';

/** Fiches produit Odoo par slug ressource */
export const ODOO_PRODUCT_URLS: Record<string, string> = {
  'espace-polyvalent': `${ODOO_SITE}/shop/serv1-esp-espace-polyvalent-17`,
  'salle-conference': `${ODOO_SITE}/shop`,
  appartement: `${ODOO_SITE}/shop`,
};

/** Liens réservation depuis Odoo (option A) */
export const RESERVATION_URLS: Record<string, string> = {
  'espace-polyvalent': '/book/espace-polyvalent?from=odoo',
  'salle-conference': '/book/salle-conference?from=odoo',
  appartement: '/book/appartement?from=odoo',
};

export const ODOO_SHOP_URL = `${ODOO_SITE}/shop`;

export function isFromOdoo(from?: string | string[] | null): boolean {
  const value = Array.isArray(from) ? from[0] : from;
  return value === 'odoo';
}

/** YYYY-MM-DD depuis DATE MySQL/Prisma (composantes UTC). */
function dateOnlyYmd(value: string | Date | null | undefined): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') return value.slice(0, 10);
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Même logique que isRuleEffective côté API (jour calendaire). */
export function isPricingRuleVisible(rule: PricingRule, at = new Date()): boolean {
  if (rule.isActive === false) return false;
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
  const fromYmd = dateOnlyYmd(rule.validFrom);
  const toYmd = dateOnlyYmd(rule.validTo);
  if (fromYmd && fromYmd > todayStr) return false;
  if (toYmd && toYmd < todayStr) return false;
  return true;
}

/** Prix affiché selon catégorie client (personnel par défaut, comme le devis API). */
export function ruleDisplayAmount(
  rule: PricingRule,
  customerCategory: CustomerCategory = 'personnel'
): number {
  if (customerCategory === 'entreprise') {
    return Number(rule.amountEntreprise ?? rule.amountPersonnel ?? rule.amount);
  }
  return Number(rule.amountPersonnel ?? rule.amount);
}

export type DisplayPrice = {
  amount: number;
  currency: string;
  compareAtAmount?: number;
  promoLabel?: string;
};

function toDisplayPrice(
  rule: PricingRule,
  customerCategory: CustomerCategory = 'personnel'
): DisplayPrice {
  const amount = ruleDisplayAmount(rule, customerCategory);
  const compareAt = rule.compareAtAmount != null ? Number(rule.compareAtAmount) : undefined;
  const entry: DisplayPrice = {
    amount,
    currency: rule.currency,
  };
  if (compareAt != null && compareAt > amount) {
    entry.compareAtAmount = compareAt;
  }
  if (rule.promoLabel) {
    entry.promoLabel = rule.promoLabel;
  }
  return entry;
}

export function getOdooProductUrl(slug: string): string {
  return ODOO_PRODUCT_URLS[slug] ?? ODOO_SHOP_URL;
}

export function getResourceMinPrice(
  resource: Resource,
  customerCategory: CustomerCategory = 'personnel'
): DisplayPrice | null {
  const activeRules = (resource.pricingRules ?? []).filter((rule) => isPricingRuleVisible(rule));
  if (!activeRules.length) return null;

  let best: DisplayPrice | null = null;
  for (const rule of activeRules) {
    const price = toDisplayPrice(rule, customerCategory);
    if (!best || price.amount < best.amount) best = price;
  }
  return best;
}

export function getPriceByBookingType(
  resource: Resource,
  customerCategory: CustomerCategory = 'personnel'
): Map<string, DisplayPrice> {
  const map = new Map<string, DisplayPrice>();
  for (const rule of resource.pricingRules ?? []) {
    if (!isPricingRuleVisible(rule)) continue;
    map.set(rule.bookingType.code, toDisplayPrice(rule, customerCategory));
  }
  return map;
}
