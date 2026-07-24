/**
 * Stockage local du jeton d'accès réservation (lien sécurisé client).
 */

const STORAGE_PREFIX = 'marneza_booking_token_';

export function saveBookingToken(bookingId: string, token: string) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${bookingId}`, token);
  } catch {
    /* ignore */
  }
}

export function getBookingToken(bookingId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(`${STORAGE_PREFIX}${bookingId}`);
  } catch {
    return null;
  }
}

export function bookingTokenQuery(bookingId: string): string {
  const token = getBookingToken(bookingId);
  return token ? `?token=${encodeURIComponent(token)}` : '';
}
