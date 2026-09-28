import type { Booking } from '@/types/api';

/** Nom figé à la réservation (guest*) avec repli sur Customer pour l'historique. */
export function guestFirstName(b: Pick<Booking, 'guestFirstName' | 'customer'>): string {
  return b.guestFirstName || b.customer?.firstName || '';
}

export function guestLastName(b: Pick<Booking, 'guestLastName' | 'customer'>): string {
  return b.guestLastName || b.customer?.lastName || '';
}

export function guestFullName(b: Pick<Booking, 'guestFirstName' | 'guestLastName' | 'customer'>): string {
  return `${guestFirstName(b)} ${guestLastName(b)}`.trim();
}

export function guestEmail(b: Pick<Booking, 'guestEmail' | 'customer'>): string {
  return b.guestEmail || b.customer?.email || '';
}
