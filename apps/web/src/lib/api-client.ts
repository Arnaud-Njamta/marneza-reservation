/**
 * Client API centralisé — tous les appels frontend passent par ici.
 *
 * @module lib/api-client
 * @baseURL process.env.NEXT_PUBLIC_API_URL → http://localhost:4000
 * @see docs/API_ROUTES.md — chaque fonction référence sa route
 */

import type {
  AdminCalendarData,
  AdminPricingRule,
  AdminStats,
  AvailabilityResult,
  Booking,
  BookingFeeLine,
  Quote,
  Resource,
} from '@/types/api';
import { getAdminToken } from '@/lib/auth';
import { getBookingToken, saveBookingToken } from '@/lib/booking-access';
import { resolveApiBase } from '@/lib/api-base';

export { saveBookingToken };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${resolveApiBase()}${path}`, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.error?.message || 'Erreur API');
  }

  return json.data ?? json;
}

async function adminRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAdminToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options?.headers ?? {}),
  };
  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${resolveApiBase()}${path}`, {
    cache: 'no-store',
    ...options,
    headers,
  });

  const text = await res.text();
  let json: { data?: T; error?: { message?: string } } = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      res.ok
        ? 'Réponse API invalide'
        : text.slice(0, 120) || `Erreur serveur (${res.status})`
    );
  }

  if (!res.ok) {
    throw new Error(json?.error?.message || `Erreur API (${res.status})`);
  }

  return (json.data ?? json) as T;
}

function bookingRequest<T>(bookingId: string, path: string, options?: RequestInit): Promise<T> {
  const token = getBookingToken(bookingId);
  if (!token) {
    return Promise.reject(
      new Error('Lien de réservation invalide — utilisez le lien reçu par email.')
    );
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Booking-Token': token,
    ...(options?.headers ?? {}),
  };

  const sep = path.includes('?') ? '&' : '?';
  const url = `${resolveApiBase()}${path}${sep}token=${encodeURIComponent(token)}`;

  return fetch(url, { cache: 'no-store', ...options, headers }).then(async (res) => {
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.error?.message || 'Erreur API');
    }
    return json.data ?? json;
  });
}

// ─── Resources ─────────────────────────────────────────────────

/** @route GET /api/resources */
export function getResources() {
  return request<Resource[]>('/api/resources');
}

/** @route GET /api/resources/:slug */
export function getResource(slug: string) {
  return request<Resource>(`/api/resources/${slug}`);
}

// ─── Availability ────────────────────────────────────────────────

/**
 * @route GET /api/resources/:slug/availability
 * @calledBy MonthCalendar.tsx — calendrier
 */
export function getAvailability(
  slug: string,
  params: { from: string; to: string; booking_type: string }
) {
  const qs = new URLSearchParams(params).toString();
  return request<AvailabilityResult>(`/api/resources/${slug}/availability?${qs}`);
}

// ─── Pricing ───────────────────────────────────────────────────

/** @route GET /api/pricing/quote */
export function getQuote(
  resourceSlug: string,
  bookingTypeCode: string,
  customerCategory: 'personnel' | 'entreprise' = 'personnel',
  promoCode?: string,
  includeApartment?: boolean
) {
  const qs = new URLSearchParams({
    resource_slug: resourceSlug,
    booking_type_code: bookingTypeCode,
    customer_category: customerCategory,
  });
  if (promoCode?.trim()) qs.set('promo_code', promoCode.trim());
  if (includeApartment) qs.set('include_apartment', 'true');
  return request<Quote>(`/api/pricing/quote?${qs}`);
}

/** @route GET /api/pricing/validate-promo */
export function validatePromoCode(code: string) {
  const qs = new URLSearchParams({ code: code.trim() }).toString();
  return request<{ code: string; discountAmount: number; currency: string }>(
    `/api/pricing/validate-promo?${qs}`
  );
}

// ─── Bookings ──────────────────────────────────────────────────

/**
 * @route POST /api/bookings
 * @calledBy BookingWizard.tsx
 * @flow docs/FLOWS/01-create-booking.md
 */
export function createBooking(data: {
  resourceSlug: string;
  bookingTypeCode: string;
  date: string;
  endDate?: string;
  startHour?: string;
  eventType: string;
  customerCategory: 'personnel' | 'entreprise';
  companyName?: string;
  customer: { email: string; phone?: string; firstName: string; lastName: string };
  notes?: string;
  promoCode?: string;
  includeApartment?: boolean;
}) {
  return request<Booking>('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(data),
  }).then((booking) => {
    if (booking.accessToken) {
      saveBookingToken(booking.id, booking.accessToken);
    }
    return booking;
  });
}

/** @route GET /api/bookings/:id */
export function getBooking(id: string) {
  return bookingRequest<Booking>(id, `/api/bookings/${id}`);
}

/** @route POST /api/bookings/:id/cancel */
export function cancelBooking(id: string) {
  return bookingRequest<Booking>(id, `/api/bookings/${id}/cancel`, { method: 'POST' });
}

/** @route POST /api/bookings/:id/submit — client confirme sa demande */
export function submitBooking(id: string, termsAccepted: boolean) {
  return bookingRequest<Booking>(id, `/api/bookings/${id}/submit`, {
    method: 'POST',
    body: JSON.stringify({ termsAccepted }),
  });
}

/** @route POST /api/bookings/:id/claim-payment — client signale le virement */
export function claimPayment(id: string) {
  return bookingRequest<Booking>(id, `/api/bookings/${id}/claim-payment`, { method: 'POST' });
}

/** @route POST /api/bookings/:id/payment-proof — PDF ou capture */
export async function uploadPaymentProof(id: string, file: File) {
  const token = getBookingToken(id);
  if (!token) {
    throw new Error('Lien de réservation invalide — utilisez le lien reçu par email.');
  }
  const form = new FormData();
  form.append('proof', file);
  const url = `${resolveApiBase()}/api/bookings/${id}/payment-proof?token=${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'X-Booking-Token': token },
    body: form,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || 'Upload impossible');
  }
  return (json.data ?? json) as Booking;
}

/** URL de téléchargement preuve (client) */
export function paymentProofUrl(id: string) {
  const token = getBookingToken(id);
  if (!token) return null;
  return `${resolveApiBase()}/api/bookings/${id}/payment-proof?token=${encodeURIComponent(token)}`;
}

/** URL admin pour ouvrir la preuve */
export function adminPaymentProofUrl(id: string) {
  const token = getAdminToken();
  if (!token) return null;
  return `${resolveApiBase()}/api/admin/bookings/${id}/payment-proof`;
}

export async function openAdminPaymentProof(id: string) {
  const token = getAdminToken();
  if (!token) throw new Error('Non connecté');
  const res = await fetch(`${resolveApiBase()}/api/admin/bookings/${id}/payment-proof`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error?.message || 'Preuve introuvable');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ─── Admin ─────────────────────────────────────────────────────
// @see docs/FLOWS/03-admin-confirm.md

/** @route GET /api/admin/stats */
export function adminGetStats() {
  return adminRequest<AdminStats>('/api/admin/stats');
}

/** @route GET /api/admin/bookings */
export function adminListBookings(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return adminRequest<Booking[]>(`/api/admin/bookings${qs}`);
}

/** @route GET /api/admin/bookings/:id */
export function adminGetBooking(id: string) {
  return adminRequest<Booking>(`/api/admin/bookings/${id}`);
}

/** @route POST /api/admin/bookings/:id/send-invoice */
export function adminSendInvoice(id: string) {
  return adminRequest<Booking>(`/api/admin/bookings/${id}/send-invoice`, { method: 'POST' });
}

/** @route POST /api/admin/bookings/:id/confirm-payment */
export function adminConfirmPayment(id: string) {
  return adminRequest<Booking>(`/api/admin/bookings/${id}/confirm-payment`, { method: 'POST' });
}

/** @route POST /api/admin/bookings/:id/cancel */
export function adminCancelBooking(id: string) {
  return adminRequest<Booking>(`/api/admin/bookings/${id}/cancel`, { method: 'POST' });
}

/** @route POST /api/admin/bookings/:id/refuse */
export function adminRefuseBooking(id: string) {
  return adminRequest<Booking>(`/api/admin/bookings/${id}/refuse`, { method: 'POST' });
}

/** @route PATCH /api/admin/bookings/:id/status */
export function adminUpdateBookingStatus(id: string, status: string) {
  return adminRequest<Booking>(`/api/admin/bookings/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

/** @route PATCH /api/admin/bookings/:id/amount */
export function adminUpdateBookingAmount(
  id: string,
  data: { totalAmount: number; priceNote?: string }
) {
  return adminRequest<Booking>(`/api/admin/bookings/${id}/amount`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** @route PATCH /api/admin/bookings/:id — modification créneau + frais */
export function adminModifyBooking(
  id: string,
  data: {
    startAt?: string;
    endAt?: string;
    notes?: string;
    priceNote?: string;
    feeLines?: BookingFeeLine[];
  }
) {
  return adminRequest<Booking>(`/api/admin/bookings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** @route GET /api/admin/bookings/:id/secure-link */
export function adminGetSecureLink(id: string) {
  return adminRequest<{ url: string }>(`/api/admin/bookings/${id}/secure-link`);
}

/** @route GET /api/admin/bookings/upcoming */
export function adminGetUpcoming() {
  return adminRequest<import('@/types/api').UpcomingBooking[]>('/api/admin/bookings/upcoming');
}

/** @route GET /api/admin/calendar */
export function adminGetCalendar(resourceSlug: string, from: string, to: string) {
  const qs = new URLSearchParams({
    resource_slug: resourceSlug || 'all',
    from,
    to,
  }).toString();
  return adminRequest<AdminCalendarData>(`/api/admin/calendar?${qs}`);
}

/** @route GET /api/admin/pricing */
export function adminListPricing() {
  return adminRequest<AdminPricingRule[]>('/api/admin/pricing');
}

/** @route PATCH /api/admin/pricing/:id */
export function adminUpdatePricing(
  id: string,
  data: {
    amount?: number;
    amountPersonnel?: number;
    amountEntreprise?: number;
    compareAtAmount?: number | null;
    promoLabel?: string | null;
    validFrom?: string | null;
    validTo?: string | null;
    isActive?: boolean;
  }
) {
  return adminRequest<AdminPricingRule>(`/api/admin/pricing/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** @route GET /api/admin/synthesis */
export function adminGetSynthesis(params: { horizonMonths?: number; statuses?: string }) {
  const qs = new URLSearchParams();
  if (params.horizonMonths != null) qs.set('horizonMonths', String(params.horizonMonths));
  if (params.statuses) qs.set('statuses', params.statuses);
  return adminRequest<import('@/types/api').SynthesisResult>(`/api/admin/synthesis?${qs}`);
}

export function adminListSynthesisConfigs() {
  return adminRequest<import('@/types/api').ReminderConfig[]>('/api/admin/synthesis/configs');
}

export function adminListEmailTemplates() {
  return adminRequest<import('@/types/api').EmailTemplate[]>('/api/admin/templates');
}

export function adminSaveEmailTemplate(data: {
  code: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  useRichEditor?: boolean;
}) {
  return adminRequest<import('@/types/api').EmailTemplate>('/api/admin/templates', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function adminListPromoCodes() {
  return adminRequest<import('@/types/api').PromoCode[]>('/api/admin/promo-codes');
}

export function adminCreatePromoCode(data: {
  code?: string;
  discountAmount: number;
  label?: string;
  maxUses?: number;
  validFrom?: string;
  validTo?: string;
}) {
  return adminRequest<import('@/types/api').PromoCode>('/api/admin/promo-codes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function adminUpdatePromoCode(id: string, data: { isActive?: boolean; discountAmount?: number }) {
  return adminRequest<import('@/types/api').PromoCode>(`/api/admin/promo-codes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** @route GET /api/rental-terms */
export function getRentalTerms() {
  return request<import('@/types/api').RentalTerm[]>('/api/rental-terms');
}

export function adminListRentalTerms() {
  return adminRequest<import('@/types/api').RentalTerm[]>('/api/admin/rental-terms');
}

export function adminCreateRentalTerm(data: { body: string; sortOrder?: number; isActive?: boolean }) {
  return adminRequest<import('@/types/api').RentalTerm>('/api/admin/rental-terms', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function adminUpdateRentalTerm(
  id: string,
  data: { body?: string; sortOrder?: number; isActive?: boolean }
) {
  return adminRequest<import('@/types/api').RentalTerm>(`/api/admin/rental-terms/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function adminDeleteRentalTerm(id: string) {
  return adminRequest<{ ok: boolean }>(`/api/admin/rental-terms/${id}`, {
    method: 'DELETE',
  });
}

export function adminReorderRentalTerms(orderedIds: string[]) {
  return adminRequest<import('@/types/api').RentalTerm[]>('/api/admin/rental-terms/reorder', {
    method: 'PUT',
    body: JSON.stringify({ orderedIds }),
  });
}

export function adminGetPaymentSettings() {
  return adminRequest<import('@/types/api').PaymentSettings>('/api/admin/payment-settings');
}

export function adminSavePaymentSettings(data: import('@/types/api').PaymentSettings) {
  return adminRequest<import('@/types/api').PaymentSettings>('/api/admin/payment-settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/** Télécharge un fichier Excel des réservations */
export async function adminExportBookings(params: { from?: string; to?: string; status?: string }) {
  const qs = new URLSearchParams();
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.status) qs.set('status', params.status);

  const token = getAdminToken();
  const res = await fetch(`${resolveApiBase()}/api/admin/bookings/export?${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error?.message || 'Export impossible');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reservations-${params.from || 'debut'}-${params.to || 'fin'}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
