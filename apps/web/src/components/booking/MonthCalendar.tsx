'use client';

/**
 * Calendrier mensuel — affiche les jours disponibles / indisponibles.
 */

import { useEffect, useState } from 'react';
import { getAvailability } from '@/lib/api-client';
import { apiBookingTypeCode } from './labels';

type Props = {
  slug: string;
  bookingTypeCode: string;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
};

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function toYmdUtc(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

function todayYmdLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function monthRange(year: number, month: number) {
  const from = toYmdUtc(year, month, 1);
  const to = toYmdUtc(year, month + 1, 0);
  return { from, to };
}

export function MonthCalendar({ slug, bookingTypeCode, selectedDate, onSelectDate }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [available, setAvailable] = useState<Set<string>>(new Set());
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingTypeCode) return;

    const { from, to } = monthRange(viewYear, viewMonth);
    let cancelled = false;

    async function fetchAvailability() {
      setLoading(true);
      try {
        const data = await getAvailability(slug, {
          from,
          to,
          booking_type: apiBookingTypeCode(bookingTypeCode),
        });
        if (!cancelled) {
          setAvailable(new Set(data.available));
          setError(null);
          setHasLoaded(true);
        }
      } catch (e) {
        if (!cancelled) {
          setAvailable(new Set());
          setHasLoaded(true);
          setError(
            e instanceof Error
              ? `${e.message} — vérifiez que l'API tourne (npm run dev:api).`
              : 'Impossible de charger les disponibilités — vérifiez que l\'API tourne (port 4000).'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setHasLoaded(false);
    fetchAvailability();
    const poll = setInterval(fetchAvailability, 20000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [slug, bookingTypeCode, viewYear, viewMonth]);

  const firstDay = new Date(Date.UTC(viewYear, viewMonth, 1));
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
  const startOffset = (firstDay.getUTCDay() + 6) % 7;

  const monthLabel = new Date(Date.UTC(viewYear, viewMonth, 1)).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const todayStr = todayYmdLocal();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <button
          type="button"
          className="btn btn-outline"
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
          onClick={() => {
            if (viewMonth === 0) {
              setViewMonth(11);
              setViewYear((y) => y - 1);
            } else setViewMonth((m) => m - 1);
          }}
        >
          ←
        </button>
        <strong style={{ textTransform: 'capitalize' }}>{monthLabel}</strong>
        <button
          type="button"
          className="btn btn-outline"
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
          onClick={() => {
            if (viewMonth === 11) {
              setViewMonth(0);
              setViewYear((y) => y + 1);
            } else setViewMonth((m) => m + 1);
          }}
        >
          →
        </button>
      </div>

      {loading && !hasLoaded && (
        <p style={{ color: 'var(--marneza-muted)', fontSize: '0.875rem' }}>Chargement des disponibilités…</p>
      )}
      {error && <div className="error-banner" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
        {WEEKDAYS.map((d) => (
          <div key={d} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--marneza-muted)' }}>
            {d}
          </div>
        ))}

        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = toYmdUtc(viewYear, viewMonth, day);
          const isPast = dateStr < todayStr;
          const isAvailable = available.has(dateStr);
          const isSelected = selectedDate === dateStr;
          const canSelect = hasLoaded && !isPast && isAvailable;
          const disabled = !canSelect;

          return (
            <button
              key={dateStr}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(dateStr)}
              style={{
                padding: '0.5rem 0',
                border: isSelected ? '2px solid var(--marneza-orange)' : '1px solid var(--marneza-border)',
                borderRadius: 8,
                background: isSelected
                  ? '#fff7ed'
                  : !hasLoaded
                    ? '#fafafa'
                    : isAvailable && !isPast
                      ? '#fff'
                      : '#f3f4f6',
                color: disabled ? '#9ca3af' : '#111',
                cursor: canSelect ? 'pointer' : 'not-allowed',
                fontWeight: isSelected ? 700 : 400,
                fontSize: '0.9rem',
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--marneza-muted)', marginTop: '0.75rem' }}>
        Les jours blancs sont disponibles pour ce type de créneau. Les jours grisés sont passés ou déjà réservés.
      </p>
    </div>
  );
}
