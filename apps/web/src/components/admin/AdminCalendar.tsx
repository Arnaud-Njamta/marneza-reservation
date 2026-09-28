'use client';

/**
 * Calendrier admin — toutes les réservations, vue mois + liste.
 *
 * @route   /admin/calendar
 */

import { useMemo, useState, useCallback } from 'react';
import { adminGetCalendar } from '@/lib/api-client';
import type { AdminCalendarData, CalendarBooking } from '@/types/api';
import { guestFullName } from '@/lib/guest-identity';
import { eventLabel, formatDateTime, STATUS_LABELS, statusClass } from './admin-utils';
import { statusLabelShort } from '@/lib/booking-status';
import { AdminUpcomingAlerts } from './AdminUpcomingAlerts';
import { useAdminAutoRefresh } from './AdminRefreshContext';

function monthRange(year: number, month: number) {
  const from = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
  return { from, to };
}

function ymdUtc(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

function groupByDay(bookings: CalendarBooking[]) {
  const map = new Map<string, CalendarBooking[]>();
  for (const b of bookings) {
    const key = b.startAt.slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(b);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function AdminCalendar() {
  const today = new Date();
  const [slug, setSlug] = useState('all');
  const [viewYear, setViewYear] = useState(today.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(today.getUTCMonth());
  const [data, setData] = useState<AdminCalendarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const { from, to } = monthRange(viewYear, viewMonth);
      if (!opts?.silent) setLoading(true);
      try {
        const result = await adminGetCalendar(slug, from, to);
        setData(result);
      } catch {
        if (!opts?.silent) setData(null);
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [slug, viewYear, viewMonth]
  );

  useAdminAutoRefresh(load, [load]);

  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay();
  const bookingsByDay = useMemo(() => {
    if (!data) return new Map<string, CalendarBooking[]>();
    const map = new Map<string, CalendarBooking[]>();
    for (const b of data.bookings) {
      const key = b.startAt.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return map;
  }, [data]);

  const groupedList = useMemo(
    () => (data ? groupByDay(data.bookings) : []),
    [data]
  );

  const filteredList = selectedDay
    ? groupedList.filter(([day]) => day === selectedDay)
    : groupedList;

  const monthLabel = new Date(Date.UTC(viewYear, viewMonth, 1)).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const resources = data?.resources ?? [];

  return (
    <div className="admin-calendar-page">
      <AdminUpcomingAlerts />

      <div className="admin-calendar-toolbar">
        <div className="form-group admin-calendar-toolbar__filter">
          <label htmlFor="resource">Espace</label>
          <select id="resource" value={slug} onChange={(e) => setSlug(e.target.value)}>
            <option value="all">Tous les espaces</option>
            {resources.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-calendar-nav">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              if (viewMonth === 0) {
                setViewMonth(11);
                setViewYear((y) => y - 1);
              } else setViewMonth((m) => m - 1);
              setSelectedDay(null);
            }}
          >
            ←
          </button>
          <strong className="admin-calendar-nav__label">{monthLabel}</strong>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              if (viewMonth === 11) {
                setViewMonth(0);
                setViewYear((y) => y + 1);
              } else setViewMonth((m) => m + 1);
              setSelectedDay(null);
            }}
          >
            →
          </button>
          {selectedDay && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setSelectedDay(null)}
            >
              Tout le mois
            </button>
          )}
        </div>
      </div>

      {loading && <p className="admin-muted">Chargement…</p>}

      {!loading && data && (
        <>
          <div className="admin-month-grid">
            {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((d) => (
              <div key={d} className="admin-month-grid__head">
                {d}
              </div>
            ))}
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`pad-${i}`} className="admin-month-grid__cell admin-month-grid__cell--empty" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const ymd = ymdUtc(viewYear, viewMonth, day);
              const dayBookings = bookingsByDay.get(ymd) ?? [];
              const isSelected = selectedDay === ymd;
              const isToday = ymd === today.toISOString().slice(0, 10);

              return (
                <button
                  key={ymd}
                  type="button"
                  className={`admin-month-grid__cell ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`}
                  onClick={() => setSelectedDay(isSelected ? null : ymd)}
                >
                  <span className="admin-month-grid__day">{day}</span>
                  {dayBookings.length > 0 && (
                    <span className="admin-month-grid__count">{dayBookings.length}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="admin-calendar-summary">
            <strong>{data.bookings.length}</strong> réservation{data.bookings.length !== 1 ? 's' : ''}{' '}
            {slug === 'all' ? 'tous espaces' : `— ${data.resource.name}`}
          </div>

          {filteredList.length === 0 ? (
            <p className="admin-muted">Aucune réservation pour cette période.</p>
          ) : (
            <div className="admin-calendar-days">
              {filteredList.map(([day, bookings]) => (
                <section key={day} className="admin-calendar-day">
                  <h3 className="admin-calendar-day__title">
                    {new Date(`${day}T12:00:00.000Z`).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      timeZone: 'UTC',
                    })}
                  </h3>
                  <ul className="admin-calendar-list">
                    {bookings.map((b) => (
                      <li key={b.id} className="admin-calendar-card">
                        <div className="admin-calendar-card__main">
                          <div className="admin-calendar-card__title-row">
                            <strong>
                              {guestFullName(b)}
                            </strong>
                            <span
                              className={`badge badge--status ${statusClass(b.status)}`}
                              title={STATUS_LABELS[b.status] ?? b.status}
                            >
                              {statusLabelShort(b.status)}
                            </span>
                          </div>
                          <div className="admin-calendar-card__meta">
                            <span className="admin-calendar-card__resource">
                              {b.resource?.name ?? 'Espace'}
                            </span>
                            <span>
                              {formatDateTime(b.startAt)} → {formatDateTime(b.endAt)}
                            </span>
                            <span>{b.bookingType?.name}</span>
                            <span>{eventLabel(b.eventType)}</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
