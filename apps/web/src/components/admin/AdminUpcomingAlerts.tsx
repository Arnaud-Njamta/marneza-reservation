import { Link } from 'react-router-dom';
import { useCallback, useState } from 'react';
import { adminGetUpcoming } from '@/lib/api-client';
import type { UpcomingBooking } from '@/types/api';
import { guestFullName } from '@/lib/guest-identity';
import { formatDateTime } from './admin-utils';
import { useAdminAutoRefresh } from './AdminRefreshContext';

const URGENCY_LABELS = {
  today: { label: "Aujourd'hui", className: 'admin-alert--today' },
  '1day': { label: 'Demain', className: 'admin-alert--1day' },
  '3days': { label: 'Dans 3 jours', className: 'admin-alert--3days' },
};

export function AdminUpcomingAlerts() {
  const [items, setItems] = useState<UpcomingBooking[]>([]);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const data = await adminGetUpcoming();
      setItems(data);
    } catch {
      if (!opts?.silent) setItems([]);
    }
  }, []);

  useAdminAutoRefresh(load, [load]);

  if (items.length === 0) return null;

  return (
    <section className="admin-upcoming">
      <div className="admin-upcoming__header">
        <h2>Réservations à venir</h2>
        <Link to="/admin/calendar" className="admin-upcoming__link">
          Voir le calendrier →
        </Link>
      </div>
      <div className="admin-upcoming__list">
        {items.map((b) => {
          const meta = b.urgency ? URGENCY_LABELS[b.urgency] : null;
          return (
            <article key={b.id} className={`admin-upcoming-card ${meta?.className ?? ''}`}>
              <div className="admin-upcoming-card__badge">{meta?.label ?? `J-${b.daysUntil}`}</div>
              <div className="admin-upcoming-card__body">
                <strong>
                  {guestFullName(b)}
                </strong>
                <span>{b.resource?.name ?? 'Espace'}</span>
                <span>
                  {formatDateTime(b.startAt)} → {formatDateTime(b.endAt)}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
