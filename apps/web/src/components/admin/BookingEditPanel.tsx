'use client';

import { useState } from 'react';
import type { Booking, BookingFeeLine } from '@/types/api';
import { guestFullName } from '@/lib/guest-identity';
import { adminModifyBooking } from '@/lib/api-client';
import { formatDateTime } from './admin-utils';

type FeeDraft = { label: string; amount: string };

type Props = {
  booking: Booking;
  onSaved: () => void;
  onClose: () => void;
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function feeDraftsFromBooking(booking: Booking): FeeDraft[] {
  const lines = booking.feeLines ?? [];
  if (lines.length === 0) return [{ label: '', amount: '' }];
  return lines.map((l) => ({ label: l.label, amount: String(Number(l.amount)) }));
}

export function BookingEditPanel({ booking, onSaved, onClose }: Props) {
  const [startAt, setStartAt] = useState(toLocalInput(booking.startAt));
  const [endAt, setEndAt] = useState(toLocalInput(booking.endAt));
  const [notes, setNotes] = useState(booking.notes ?? '');
  const [priceNote, setPriceNote] = useState(booking.priceNote ?? '');
  const [feeDrafts, setFeeDrafts] = useState<FeeDraft[]>(() => feeDraftsFromBooking(booking));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseAmount = Number(booking.quotedAmount ?? booking.totalAmount);
  const feesTotal = feeDrafts.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const previewTotal = baseAmount + feesTotal;

  function updateFee(index: number, patch: Partial<FeeDraft>) {
    setFeeDrafts((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function addFeeLine() {
    setFeeDrafts((prev) => [...prev, { label: '', amount: '' }]);
  }

  function removeFeeLine(index: number) {
    setFeeDrafts((prev) => (prev.length <= 1 ? [{ label: '', amount: '' }] : prev.filter((_, i) => i !== index)));
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      const feeLines: BookingFeeLine[] = feeDrafts
        .filter((f) => f.label.trim() && Number(f.amount) > 0)
        .map((f) => ({ label: f.label.trim(), amount: Number(f.amount) }));

      await adminModifyBooking(booking.id, {
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        notes: notes.trim() || undefined,
        priceNote: priceNote.trim() || undefined,
        feeLines,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur enregistrement');
    } finally {
      setLoading(false);
    }
  }

  return (
    <tr className="admin-edit-row">
      <td colSpan={8}>
        <div className="admin-edit-panel">
          <div className="admin-edit-panel__header">
            <h3>Modifier la réservation</h3>
            <p>
              {guestFullName(booking)} — {booking.resource.name}
            </p>
            <p className="admin-edit-panel__hint">
              Créneau actuel : {formatDateTime(booking.startAt)} → {formatDateTime(booking.endAt)}
            </p>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div className="admin-edit-panel__grid">
            <label>
              Début
              <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            </label>
            <label>
              Fin
              <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
            </label>
            <label className="admin-edit-panel__full">
              Note client (visible sur facture)
              <input
                type="text"
                value={priceNote}
                onChange={(e) => setPriceNote(e.target.value)}
                placeholder="Ex. modification de créneau, supplément équipement…"
              />
            </label>
            <label className="admin-edit-panel__full">
              Remarques du client
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Demandes particulières saisies à la réservation…"
              />
            </label>
          </div>

          <div className="admin-edit-panel__fees">
            <div className="admin-edit-panel__fees-header">
              <h4>Frais additionnels (facture)</h4>
              <button type="button" className="btn btn-sm btn-outline" onClick={addFeeLine}>
                + Ajouter une ligne
              </button>
            </div>
            {feeDrafts.map((fee, index) => (
              <div key={index} className="admin-fee-line">
                <input
                  type="text"
                  placeholder="Libellé (ex. modification, équipement)"
                  value={fee.label}
                  onChange={(e) => updateFee(index, { label: e.target.value })}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Montant"
                  value={fee.amount}
                  onChange={(e) => updateFee(index, { amount: e.target.value })}
                />
                <span>{booking.currency}</span>
                <button type="button" className="btn btn-sm btn-outline" onClick={() => removeFeeLine(index)}>
                  ×
                </button>
              </div>
            ))}
            <p className="admin-edit-panel__total">
              Tarif de base : <strong>{baseAmount} {booking.currency}</strong>
              {feesTotal > 0 && (
                <> · Frais : <strong>+{feesTotal} {booking.currency}</strong></>
              )}
              {' · '}
              Total facture : <strong>{previewTotal} {booking.currency}</strong>
            </p>
          </div>

          {booking.invoiceSentAt && (
            <p className="admin-edit-panel__warn">
              Une facture a déjà été envoyée. Après modification, renvoyez la facture au client.
            </p>
          )}

          <div className="admin-edit-panel__actions">
            <button type="button" className="btn btn-primary" disabled={loading} onClick={handleSave}>
              {loading ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </button>
            <button type="button" className="btn btn-outline" disabled={loading} onClick={onClose}>
              Annuler
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}
