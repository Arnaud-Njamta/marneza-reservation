import type { Booking, CustomerCategory } from '@/types/api';

export const STATUS_LABELS: Record<string, string> = {
  created: 'Créée',
  processing: 'En cours de traitement',
  paid: 'Payée',
  fulfilled: 'Réalisée',
  cancelled: 'Annulée',
  refused: 'Refusée',
};

export const CUSTOMER_CATEGORY_LABELS: Record<CustomerCategory, string> = {
  personnel: 'Personnel / Particulier',
  entreprise: 'Entreprise',
};

export type ClientStep = {
  key: string;
  label: string;
  statuses: string[];
};

export const CLIENT_WORKFLOW_STEPS: ClientStep[] = [
  { key: 'created', label: 'Créneau', statuses: ['created'] },
  { key: 'processing', label: 'Validation', statuses: ['processing'] },
  { key: 'paid', label: 'Payée', statuses: ['paid'] },
  { key: 'fulfilled', label: 'Réalisée', statuses: ['fulfilled'] },
];

export function clientStepIndex(status: string): number {
  if (['cancelled', 'refused'].includes(status)) return -1;
  const idx = CLIENT_WORKFLOW_STEPS.findIndex((s) => s.statuses.includes(status));
  return idx >= 0 ? idx : 0;
}

/** Message contextuel selon l'étape réelle du workflow */
export function clientStatusMessage(booking: Booking): string {
  if (booking.status === 'created') {
    return 'Votre créneau est réservé 15 minutes. Acceptez les conditions puis confirmez votre demande.';
  }
  if (booking.status === 'processing' && !booking.invoiceSentAt) {
    return 'Votre demande est en cours d\'examen. Notre équipe peut ajuster le tarif avant l\'envoi de la facture.';
  }
  if (booking.status === 'processing' && booking.invoiceSentAt && !booking.paymentClaimedAt) {
    return 'La facture et les instructions de paiement ont été envoyées à votre email. Effectuez le virement puis cliquez sur « J\'ai effectué le paiement ».';
  }
  if (booking.status === 'processing' && booking.paymentClaimedAt) {
    return 'Merci — nous vérifions la réception de votre paiement. Vous serez notifié dès confirmation.';
  }
  if (booking.status === 'paid') {
    return 'Paiement confirmé par notre équipe. Votre réservation est validée.';
  }
  if (booking.status === 'fulfilled') {
    return 'Votre réservation a été réalisée. Merci !';
  }
  if (booking.status === 'cancelled') {
    return 'Réservation annulée. Le créneau est à nouveau disponible.';
  }
  if (booking.status === 'refused') {
    return 'Votre demande a été refusée.';
  }
  return '';
}

export function statusClass(status: string) {
  switch (status) {
    case 'created':
      return 'badge badge-pending';
    case 'processing':
      return 'badge badge-processing';
    case 'paid':
      return 'badge badge-confirmed';
    case 'fulfilled':
      return 'badge badge-completed';
    case 'cancelled':
      return 'badge badge-cancelled';
    case 'refused':
      return 'badge badge-refused';
    default:
      return 'badge';
  }
}

export const STATUS_LABELS_SHORT: Record<string, string> = {
  created: 'Créée',
  processing: 'En cours',
  paid: 'Payée',
  fulfilled: 'Réalisée',
  cancelled: 'Annulée',
  refused: 'Refusée',
};

export function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

export function statusLabelShort(status: string) {
  return STATUS_LABELS_SHORT[status] ?? status;
}

export function customerCategoryLabel(category: CustomerCategory) {
  return CUSTOMER_CATEGORY_LABELS[category] ?? category;
}

export function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatYmdFr(ymd: string) {
  return new Date(`${ymd}T12:00:00.000Z`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
