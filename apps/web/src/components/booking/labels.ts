import type { EventType } from '@/types/api';

/** Libellés affichage — codes API inchangés */
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: 'Mariage',
  party: 'Fête / Anniversaire',
  ceremony: 'Cérémonie',
  conference: 'Conférence / Séminaire',
  other: 'Autre',
};

export const EVENT_TYPES_BY_RESOURCE: Record<string, EventType[]> = {
  hall: ['wedding', 'party', 'ceremony', 'other'],
  conference: ['conference', 'other'],
  apartment: ['other'],
};

/** Code envoyé à l'API pour availability/quote (gère conf_*) */
export function apiBookingTypeCode(code: string): string {
  if (code.startsWith('conf_')) return code.replace('conf_', '');
  return code;
}
