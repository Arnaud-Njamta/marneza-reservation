import type { Booking, EventType } from '@/types/api';
import { EVENT_TYPE_LABELS } from '@/components/booking/labels';
import { STATUS_LABELS, statusClass, customerCategoryLabel } from '@/lib/booking-status';

export { STATUS_LABELS, statusClass, customerCategoryLabel };

export type PaymentWorkflowFlag = {
  key: string;
  label: string;
  tone: 'neutral' | 'info' | 'success' | 'warning';
};

export function paymentWorkflowFlags(booking: Booking): PaymentWorkflowFlag[] {
  const flags: PaymentWorkflowFlag[] = [];
  if (booking.termsAcceptedAt) {
    flags.push({ key: 'terms', label: 'Conditions OK', tone: 'neutral' });
  }
  if (booking.status === 'processing' && !booking.invoiceSentAt) {
    flags.push({ key: 'await-summary', label: 'À envoyer synthèse', tone: 'warning' });
  }
  if (booking.invoiceSentAt) {
    flags.push({ key: 'invoice', label: 'Synthèse envoyée', tone: 'info' });
  }
  if (booking.paymentClaimedAt) {
    flags.push({ key: 'claimed', label: 'Paiement signalé', tone: 'warning' });
  }
  if (booking.status === 'paid') {
    flags.push({ key: 'paid', label: 'Paiement confirmé', tone: 'success' });
  }
  return flags;
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Africa/Kinshasa',
  });
}

export function eventLabel(eventType: string) {
  return EVENT_TYPE_LABELS[eventType as EventType] ?? eventType;
}

export type { Booking };
