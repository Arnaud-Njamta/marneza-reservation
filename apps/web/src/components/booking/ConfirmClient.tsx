import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { Booking, RentalTerm } from '@/types/api';
import { cancelBooking, claimPayment, getBooking, getRentalTerms, submitBooking } from '@/lib/api-client';
import { saveBookingToken } from '@/lib/booking-access';
import {
  clientStatusMessage,
  statusLabel,
} from '@/lib/booking-status';
import { BookingStatusStepper } from './BookingStatusStepper';
import { PriceDisplay } from './PriceDisplay';

const FALLBACK_RENTAL_TERMS = [
  'Le créneau est réservé 15 minutes le temps de confirmer votre demande.',
  'Le paiement définitif intervient après validation par notre équipe.',
  'Toute annulation est soumise aux conditions générales de location Marneza.',
  "Les équipements et l'espace doivent être restitués dans l'état initial.",
];

type Props = {
  bookingId: string;
};

const POLL_MS = 3000;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Africa/Kinshasa',
  });
}

export function ConfirmClient({ bookingId }: Props) {
  const [searchParams] = useSearchParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [rentalTerms, setRentalTerms] = useState<string[]>(FALLBACK_RENTAL_TERMS);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofMsg, setProofMsg] = useState<string | null>(null);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      saveBookingToken(bookingId, tokenFromUrl);
    }
  }, [bookingId, searchParams]);

  useEffect(() => {
    let cancelled = false;
    getRentalTerms()
      .then((rows: RentalTerm[]) => {
        if (cancelled) return;
        const bodies = rows.map((r) => r.body).filter(Boolean);
        if (bodies.length) setRentalTerms(bodies);
      })
      .catch(() => {
        /* garde le fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const data = await getBooking(bookingId);
        if (!cancelled) {
          setBooking(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Réservation introuvable';
          setError(msg);
        }
      }
    }

    refresh();
    const poll = setInterval(refresh, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [bookingId]);

  useEffect(() => {
    if (!booking?.expiresAt || booking.status !== 'created') {
      setSecondsLeft(null);
      return;
    }

    const tick = () => {
      const left = Math.max(
        0,
        Math.floor((new Date(booking.expiresAt!).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(left);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [booking?.expiresAt, booking?.status]);

  async function handleCancel() {
    setActionLoading('cancel');
    try {
      const data = await cancelBooking(bookingId);
      setBooking(data);
    } catch {
      setError('Impossible d\'annuler');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSubmit() {
    if (!termsAccepted) {
      setError('Veuillez accepter les conditions de location.');
      return;
    }
    setActionLoading('submit');
    try {
      const data = await submitBooking(bookingId, true);
      setBooking(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'envoi');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleClaimPayment() {
    const attachedProof = proofFile;
    setActionLoading('claim');
    setError(null);
    setProofMsg(null);
    try {
      const data = await claimPayment(bookingId, attachedProof);
      setBooking(data);
      setProofFile(null);
      setProofMsg(
        attachedProof
          ? 'Paiement signalé avec preuve — un email de confirmation vous a été envoyé.'
          : 'Paiement signalé — un email de confirmation vous a été envoyé.'
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setActionLoading(null);
    }
  }

  if (error && !booking) {
    return <div className="error-banner">{error}</div>;
  }

  if (!booking) {
    return <p>Chargement…</p>;
  }

  const holdActive =
    booking.status === 'created' &&
    Boolean(booking.expiresAt) &&
    secondsLeft !== null &&
    secondsLeft > 0;

  const minutes = secondsLeft !== null ? Math.floor(secondsLeft / 60) : 0;
  const seconds = secondsLeft !== null ? secondsLeft % 60 : 0;
  const priceChanged =
    booking.quotedAmount != null &&
    Number(booking.quotedAmount) !== Number(booking.totalAmount);

  const message = clientStatusMessage(booking);

  return (
    <div className="confirm-page">
      <BookingStatusStepper status={booking.status} />

      <div className="card confirm-status-card">
        <div className="confirm-status-card__header">
          <span className="confirm-status-card__eyebrow">Statut actuel</span>
          <strong>{statusLabel(booking.status)}</strong>
        </div>
        <p className="confirm-status-card__message">{message}</p>
      </div>

      {holdActive && (
        <div className={`timer ${secondsLeft! < 120 ? 'urgent' : ''}`}>
          Créneau réservé — expire dans {String(minutes).padStart(2, '0')}:
          {String(seconds).padStart(2, '0')}
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <h2>Récapitulatif</h2>
        <p><strong>{booking.resource.name}</strong></p>
        <p>{booking.bookingType.name}</p>
        <p>Du {formatDate(booking.startAt)}</p>
        <p>au {formatDate(booking.endAt)}</p>
        <div style={{ marginTop: '1rem' }}>
          <PriceDisplay
            amount={Number(booking.totalAmount)}
            currency={booking.currency}
            compareAtAmount={priceChanged ? Number(booking.quotedAmount) : undefined}
            promoLabel={priceChanged ? 'Tarif ajusté' : undefined}
          />
          {(booking.feeLines?.length ?? 0) > 0 && (
            <ul className="invoice-fee-lines">
              <li>
                Tarif de base : {Number(booking.quotedAmount ?? booking.totalAmount)} {booking.currency}
              </li>
              {booking.feeLines!.map((line, i) => (
                <li key={line.id ?? i}>
                  + {line.label} : {Number(line.amount)} {booking.currency}
                </li>
              ))}
            </ul>
          )}
        </div>
        {booking.status === 'paid' && booking.accessTokenExpiresAt && (
          <p className="confirm-link-expiry">
            Votre lien de suivi reste actif jusqu&apos;au{' '}
            {new Date(booking.accessTokenExpiresAt).toLocaleString('fr-FR', {
              dateStyle: 'long',
              timeStyle: 'short',
              timeZone: 'Africa/Kinshasa',
            })}
            .
          </p>
        )}
      </div>

      {booking.status === 'created' && holdActive && (
        <div className="card">
          <h2>Conditions de location</h2>
          <ul className="terms-list">
            {rentalTerms.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <label className="terms-checkbox">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            <span>J&apos;accepte les conditions de location et confirme ma demande de réservation.</span>
          </label>
        </div>
      )}

      {booking.status === 'processing' && booking.invoiceSentAt && !booking.paymentClaimedAt && (
        <div className="card payment-proof-card">
          <h2>Preuve de paiement <span className="payment-proof-card__optional">(recommandée)</span></h2>
          <p className="page-subtitle" style={{ marginTop: 0 }}>
            Chargez une capture ou un PDF de votre virement / mobile money (max 8&nbsp;Mo),
            puis cliquez sur «&nbsp;J&apos;ai effectué le paiement&nbsp;». Ce n&apos;est pas obligatoire.
          </p>
          <div className="payment-proof-card__row">
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
            />
            {proofFile && (
              <span className="payment-proof-card__current">
                Fichier prêt : <strong>{proofFile.name}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {(booking.paymentClaimedAt || booking.paymentProofName) && booking.status === 'processing' && (
        <div className="card payment-proof-card">
          {proofMsg && <div className="success-banner">{proofMsg}</div>}
          {booking.paymentProofName && (
            <p className="payment-proof-card__current">
              Preuve jointe : <strong>{booking.paymentProofName}</strong>
            </p>
          )}
        </div>
      )}

      {booking.status === 'paid' && (
        <div className="card">
          <h2>Paiement réglé</h2>
          <p>Votre paiement a été confirmé. Un email de confirmation vous a été envoyé.</p>
        </div>
      )}

      <div className="confirm-actions">
        {booking.status === 'created' && holdActive && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={actionLoading !== null || !termsAccepted}
            onClick={handleSubmit}
          >
            {actionLoading === 'submit' ? 'Envoi…' : 'Confirmer ma réservation (15 min)'}
          </button>
        )}

        {booking.status === 'processing' && booking.invoiceSentAt && !booking.paymentClaimedAt && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={actionLoading !== null}
            onClick={handleClaimPayment}
          >
            {actionLoading === 'claim' ? 'Envoi…' : "J'ai effectué le paiement"}
          </button>
        )}

        {holdActive && (
          <button
            type="button"
            className="btn btn-outline"
            disabled={actionLoading !== null}
            onClick={handleCancel}
          >
            Annuler
          </button>
        )}

        <Link to="/" className="btn btn-outline">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
