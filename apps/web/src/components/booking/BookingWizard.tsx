import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CustomerCategory, EventType, Quote, Resource } from '@/types/api';
import { createBooking, getQuote } from '@/lib/api-client';
import { saveBookingToken } from '@/lib/booking-access';
import { addDaysYmd, CUSTOMER_CATEGORY_LABELS, formatYmdFr } from '@/lib/booking-status';
import { getPriceByBookingType } from '@/lib/odoo-shop';
import { EVENT_TYPE_LABELS, EVENT_TYPES_BY_RESOURCE } from './labels';
import { MonthCalendar } from './MonthCalendar';
import { PriceDisplay } from './PriceDisplay';

const HOUR_SLOTS = Array.from({ length: 8 }, (_, i) => {
  const h = 8 + i;
  return `${String(h).padStart(2, '0')}:00`;
});

type Props = {
  resource: Resource;
  fromOdoo?: boolean;
};

export function BookingWizard({ resource, fromOdoo = false }: Props) {
  const navigate = useNavigate();
  const bookingTypes = resource.resourceType.bookingTypes;
  const resourceTypeCode = resource.resourceType.code;

  const [bookingTypeCode, setBookingTypeCode] = useState(bookingTypes[0]?.code ?? '');
  const [eventType, setEventType] = useState<EventType>(
    EVENT_TYPES_BY_RESOURCE[resourceTypeCode]?.[0] ?? 'other'
  );
  const [customerCategory, setCustomerCategory] = useState<CustomerCategory>('personnel');
  const [companyName, setCompanyName] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [startHour, setStartHour] = useState('08:00');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customer, setCustomer] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [notes, setNotes] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState<string | null>(null);
  const [includeApartment, setIncludeApartment] = useState(false);

  const canAddApartment = resourceTypeCode !== 'apartment';
  const isHourType = bookingTypeCode === 'hour' || bookingTypeCode === 'conf_hour';
  const selectedBookingType = bookingTypes.find((bt) => bt.code === bookingTypeCode);
  const isOvernightType = Boolean(selectedBookingType?.spansOvernight);
  const eventTypes = EVENT_TYPES_BY_RESOURCE[resourceTypeCode] ?? ['other'];
  const pricesByType = getPriceByBookingType(resource, customerCategory);

  useEffect(() => {
    if (!bookingTypeCode) return;
    let cancelled = false;
    setQuoteError(null);
    getQuote(
      resource.slug,
      bookingTypeCode,
      customerCategory,
      promoApplied ?? undefined,
      includeApartment
    )
      .then((q) => {
        if (!cancelled) {
          setQuote(q);
          setQuoteError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setQuote(null);
          setQuoteError(err instanceof Error ? err.message : 'Tarif indisponible');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [resource.slug, bookingTypeCode, customerCategory, promoApplied, includeApartment]);

  useEffect(() => {
    if (selectedDate && isOvernightType) {
      setEndDate(addDaysYmd(selectedDate, 1));
    } else {
      setEndDate(null);
    }
  }, [selectedDate, isOvernightType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedDate) {
      setError('Veuillez sélectionner une date.');
      return;
    }

    if (customerCategory === 'entreprise' && !companyName.trim()) {
      setError('Veuillez indiquer le nom de l\'entreprise.');
      return;
    }

    if (isOvernightType && !endDate) {
      setError('Veuillez sélectionner la date de fin.');
      return;
    }

    setLoading(true);
    try {
      const booking = await createBooking({
        resourceSlug: resource.slug,
        bookingTypeCode,
        date: selectedDate,
        endDate: isOvernightType ? endDate! : undefined,
        startHour: isHourType ? startHour : undefined,
        eventType,
        customerCategory,
        companyName: customerCategory === 'entreprise' ? companyName.trim() : undefined,
        customer,
        notes: notes || undefined,
        promoCode: promoApplied ?? undefined,
        includeApartment: canAddApartment && includeApartment,
      });
      if (booking.accessToken) {
        saveBookingToken(booking.id, booking.accessToken);
        navigate(`/book/${resource.slug}/confirm/${booking.id}?token=${encodeURIComponent(booking.accessToken)}`);
      } else {
        navigate(`/book/${resource.slug}/confirm/${booking.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la réservation');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <h2>Type de location</h2>
        {fromOdoo && (
          <p style={{ fontSize: '0.875rem', color: 'var(--marneza-muted)', marginBottom: '1rem' }}>
            Choisissez le créneau souhaité — le tarif exact est calculé ici, pas sur la boutique.
          </p>
        )}
        <div className="option-grid">
          {bookingTypes.map((bt) => {
            const price = pricesByType.get(bt.code);
            return (
              <button
                key={bt.id}
                type="button"
                className={`option-btn ${bookingTypeCode === bt.code ? 'selected' : ''}`}
                onClick={() => {
                  setBookingTypeCode(bt.code);
                  setSelectedDate(null);
                  setEndDate(null);
                }}
              >
                <span className="option-btn__label">{bt.name}</span>
                {price && (
                  <span className="option-btn__price">
                    <PriceDisplay
                      amount={price.amount}
                      currency={price.currency}
                      compareAtAmount={price.compareAtAmount}
                      promoLabel={price.promoLabel}
                      size="sm"
                    />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {quote && (
          <p style={{ marginTop: '1rem' }}>
            Tarif sélectionné :{' '}
            <PriceDisplay
              amount={quote.amount}
              currency={quote.currency}
              compareAtAmount={quote.compareAtAmount}
              promoLabel={quote.promoLabel}
            />
            {quote.includesApartment && quote.apartmentAddon != null && (
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--marneza-muted)', marginTop: '0.35rem' }}>
                Dont appartement inclus (+{quote.apartmentAddon} {quote.currency})
              </span>
            )}
          </p>
        )}
        {!quote && quoteError && (
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--marneza-danger, #9b2226)' }}>
            {quoteError}
          </p>
        )}
      </div>

      {canAddApartment && (
        <div className="card apartment-addon-card">
          <label className="apartment-addon-label">
            <input
              type="checkbox"
              checked={includeApartment}
              onChange={(e) => setIncludeApartment(e.target.checked)}
            />
            <span>
              <strong>Inclure l&apos;appartement Marneza</strong>
              <span className="apartment-addon-label__hint">
                Accès à l&apos;appartement sur le même créneau — supplément de 50&nbsp;USD
              </span>
            </span>
          </label>
        </div>
      )}

      {resourceTypeCode !== 'apartment' && (
        <div className="card">
          <h2>Type d&apos;événement</h2>
          <div className="option-grid">
            {eventTypes.map((et) => (
              <button
                key={et}
                type="button"
                className={`option-btn ${eventType === et ? 'selected' : ''}`}
                onClick={() => setEventType(et)}
              >
                {EVENT_TYPE_LABELS[et]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2>Type de client</h2>
        <div className="option-grid">
          {(Object.keys(CUSTOMER_CATEGORY_LABELS) as CustomerCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              className={`option-btn ${customerCategory === cat ? 'selected' : ''}`}
              onClick={() => setCustomerCategory(cat)}
            >
              <span className="option-btn__label">{CUSTOMER_CATEGORY_LABELS[cat]}</span>
            </button>
          ))}
        </div>
        {customerCategory === 'entreprise' && (
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label htmlFor="companyName">Nom de l&apos;entreprise *</label>
            <input
              id="companyName"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Raison sociale"
            />
          </div>
        )}
      </div>

      <div className="card">
        <h2>Choisir une date</h2>
        {isOvernightType && (
          <p style={{ fontSize: '0.875rem', color: 'var(--marneza-muted)', marginBottom: '1rem' }}>
            Ce créneau s&apos;étend sur deux dates : début le soir, fin le lendemain matin.
          </p>
        )}
        <MonthCalendar
          slug={resource.slug}
          bookingTypeCode={bookingTypeCode}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
        {isOvernightType && selectedDate && endDate && (
          <div className="date-range-summary">
            <div>
              <span className="date-range-summary__label">Début</span>
              <strong>{formatYmdFr(selectedDate)}</strong>
            </div>
            <span className="date-range-summary__arrow">→</span>
            <div>
              <span className="date-range-summary__label">Fin</span>
              <input
                type="date"
                className="date-range-summary__input"
                value={endDate}
                min={addDaysYmd(selectedDate, 1)}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {isHourType && selectedDate && (
        <div className="card">
          <h2>Heure de début</h2>
          <div className="option-grid">
            {HOUR_SLOTS.map((h) => (
              <button
                key={h}
                type="button"
                className={`option-btn ${startHour === h ? 'selected' : ''}`}
                onClick={() => setStartHour(h)}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2>Vos coordonnées</h2>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="firstName">Prénom *</label>
            <input
              id="firstName"
              required
              value={customer.firstName}
              onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="lastName">Nom *</label>
            <input
              id="lastName"
              required
              value={customer.lastName}
              onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })}
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="email">Email *</label>
          <input
            id="email"
            type="email"
            required
            value={customer.email}
            onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label htmlFor="phone">Téléphone</label>
          <input
            id="phone"
            type="tel"
            placeholder="+243 …"
            value={customer.phone}
            onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label htmlFor="promoCode">Code promo (optionnel)</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              id="promoCode"
              type="text"
              placeholder="Ex. MARNEZA20"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setPromoApplied(promoCode.trim() || null);
                setError(null);
              }}
            >
              Appliquer
            </button>
          </div>
          {quote?.promoDiscount != null && quote.promoDiscount > 0 && (
            <p style={{ fontSize: '0.85rem', color: 'var(--marneza-success, #2d6a4f)', marginTop: '0.35rem' }}>
              Réduction de {quote.promoDiscount} {quote.currency} appliquée
            </p>
          )}
        </div>
        <div className="form-group">
          <label htmlFor="notes">Notes (optionnel)</label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Demandes particulières…"
          />
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={loading || !selectedDate} style={{ width: '100%' }}>
        {loading ? 'Réservation en cours…' : 'Réserver maintenant'}
      </button>
      <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--marneza-muted)', marginTop: '0.75rem' }}>
      Votre créneau sera réservé pendant 15 minutes le temps de la validation de votre demande.
      </p>
    </form>
  );
}
