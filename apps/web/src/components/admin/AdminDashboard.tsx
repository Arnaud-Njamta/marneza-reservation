'use client';

/**
 * Dashboard admin — liste réservations + actions confirmer/annuler.
 *
 * @route   /admin
 * @calls   api-client → adminListBookings, adminConfirmBooking, adminCancelBooking, adminGetStats
 * @flow    docs/FLOWS/03-admin-confirm.md
 */

import { useCallback, useState, Fragment } from 'react';
import {
  adminCancelBooking,
  adminConfirmPayment,
  adminDeleteBooking,
  adminGetSecureLink,
  adminRefuseBooking,
  adminSendInvoice,
  adminGetStats,
  adminListBookings,
  adminUpdateBookingAmount,
  adminUpdateBookingStatus,
  openAdminPaymentProof,
} from '@/lib/api-client';
import type { AdminStats } from '@/types/api';
import { guestFullName } from '@/lib/guest-identity';
import {
  customerCategoryLabel,
  eventLabel,
  formatDateTime,
  paymentWorkflowFlags,
  statusClass,
  STATUS_LABELS,
  type Booking,
} from './admin-utils';
import { statusLabelShort } from '@/lib/booking-status';
import { BookingEditPanel } from './BookingEditPanel';
import { AdminSynthesis } from './AdminSynthesis';
import { copyToClipboard } from '@/lib/copy-to-clipboard';
import { useAdminAutoRefresh } from './AdminRefreshContext';

const FILTERS = [
  { value: '', label: 'Toutes' },
  { value: 'created', label: 'Créées' },
  { value: 'processing', label: 'En cours de traitement' },
  { value: 'paid', label: 'Payées' },
  { value: 'fulfilled', label: 'Réalisées' },
  { value: 'cancelled', label: 'Annulées' },
  { value: 'refused', label: 'Refusées' },
];

const STATUS_OPTIONS = [
  { value: 'created', label: 'Créée' },
  { value: 'processing', label: 'En cours de traitement' },
  { value: 'paid', label: 'Payé' },
  { value: 'fulfilled', label: 'Réalisé' },
  { value: 'cancelled', label: 'Annulé' },
  { value: 'refused', label: 'Refusé' },
];

export function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({});
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [priceNoteDrafts, setPriceNoteDrafts] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [linkCopiedId, setLinkCopiedId] = useState<string | null>(null);
  const [linkModalUrl, setLinkModalUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      if (!opts?.silent) setError(null);
      try {
        const [list, st] = await Promise.all([
          adminListBookings(filter || undefined),
          adminGetStats(),
        ]);
        setStats(st);
        setBookings((prevBookings) => {
          setStatusDrafts((drafts) => {
            const next = { ...drafts };
            list.forEach((b) => {
              const prev = prevBookings.find((x) => x.id === b.id);
              if (!prev || drafts[b.id] === prev.status) {
                next[b.id] = b.status;
              }
            });
            return next;
          });
          setAmountDrafts((drafts) => {
            const next = { ...drafts };
            list.forEach((b) => {
              const prev = prevBookings.find((x) => x.id === b.id);
              if (!prev || drafts[b.id] === String(Number(prev.totalAmount))) {
                next[b.id] = String(Number(b.totalAmount));
              }
            });
            return next;
          });
          setPriceNoteDrafts((drafts) => {
            const next = { ...drafts };
            list.forEach((b) => {
              const prev = prevBookings.find((x) => x.id === b.id);
              if (!prev || drafts[b.id] === (prev.priceNote ?? '')) {
                next[b.id] = b.priceNote ?? '';
              }
            });
            return next;
          });
          return list;
        });
      } catch (e) {
        if (!opts?.silent) {
          setError(e instanceof Error ? e.message : 'Erreur chargement');
        }
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [filter]
  );

  const refreshNow = useAdminAutoRefresh(load, [load]);

  async function handleSendInvoice(id: string) {
    setActionId(id);
    try {
      const result = await adminSendInvoice(id);
      await refreshNow({ silent: true });
      if (result && typeof result === 'object' && '_mailWarning' in result && result._mailWarning) {
        setError(String(result._mailWarning));
      } else {
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur envoi synthèse');
    } finally {
      setActionId(null);
    }
  }

  async function handleConfirmPayment(id: string) {
    if (!confirm('Confirmer que le paiement a bien été reçu sur votre compte ?')) return;
    setActionId(id);
    try {
      await adminConfirmPayment(id);
      await refreshNow({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur confirmation paiement');
    } finally {
      setActionId(null);
    }
  }

  async function handleRefuse(id: string) {
    if (!confirm('Refuser cette réservation ?')) return;
    setActionId(id);
    try {
      await adminRefuseBooking(id);
      await refreshNow({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur refus');
    } finally {
      setActionId(null);
    }
  }

  async function handleStatusUpdate(id: string) {
    const targetStatus = statusDrafts[id];
    if (!targetStatus) return;
    setActionId(id);
    try {
      await adminUpdateBookingStatus(id, targetStatus);
      await refreshNow({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur mise à jour statut');
    } finally {
      setActionId(null);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm('Annuler cette réservation ?')) return;
    setActionId(id);
    try {
      await adminCancelBooking(id);
      await refreshNow({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur annulation');
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        'Supprimer définitivement cette réservation ?\n\nCette action est irréversible (données + preuve de paiement).'
      )
    ) {
      return;
    }
    if (!confirm('Confirmez la suppression définitive.')) return;
    setActionId(id);
    try {
      await adminDeleteBooking(id);
      if (editingId === id) setEditingId(null);
      await refreshNow({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur suppression');
    } finally {
      setActionId(null);
    }
  }

  async function handleAmountUpdate(id: string) {
    const amount = Number(amountDrafts[id]);
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Montant invalide');
      return;
    }
    setActionId(id);
    try {
      await adminUpdateBookingAmount(id, {
        totalAmount: amount,
        priceNote: priceNoteDrafts[id] || undefined,
      });
      await refreshNow({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur mise à jour montant');
    } finally {
      setActionId(null);
    }
  }

  async function handleCopyLink(id: string) {
    try {
      const { url } = await adminGetSecureLink(id);
      const ok = await copyToClipboard(url);
      if (ok) {
        setLinkCopiedId(id);
        setTimeout(() => setLinkCopiedId(null), 2500);
      } else {
        setLinkModalUrl(url);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de récupérer le lien');
    }
  }

  return (
    <div>
      <AdminSynthesis />

      {linkModalUrl && (
        <div className="admin-link-modal">
          <div className="admin-link-modal__box">
            <h3>Lien client sécurisé</h3>
            <p>Copiez ce lien manuellement (Ctrl+C) :</p>
            <input type="text" readOnly value={linkModalUrl} className="admin-link-modal__input" onFocus={(e) => e.target.select()} />
            <button type="button" className="btn btn-primary" onClick={() => setLinkModalUrl(null)}>
              Fermer
            </button>
          </div>
        </div>
      )}
      {stats && (
        <div className="admin-stats">
          <div className="admin-stat-card">
            <span className="admin-stat-value">{stats.created}</span>
            <span className="admin-stat-label">Créées</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{stats.processing}</span>
            <span className="admin-stat-label">En cours</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{stats.paid}</span>
            <span className="admin-stat-label">Payées</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{stats.thisMonth}</span>
            <span className="admin-stat-label">Ce mois</span>
          </div>
        </div>
      )}

      <div className="admin-filters">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`option-btn ${filter === f.value ? 'selected' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <p style={{ color: 'var(--marneza-muted)' }}>Chargement…</p>}

      {!loading && bookings.length === 0 && (
        <p style={{ color: 'var(--marneza-muted)' }}>Aucune réservation.</p>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table admin-table--bookings">
          <thead>
            <tr>
              <th>Réf.</th>
              <th>Espace</th>
              <th>Client</th>
              <th>Créneau</th>
              <th>Montant</th>
              <th>Statut</th>
              <th>Suivi paiement</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => {
              const flags = paymentWorkflowFlags(b);
              const canEdit = !['cancelled', 'refused', 'fulfilled'].includes(b.status);
              const feeTotal = (b.feeLines ?? []).reduce((s, l) => s + Number(l.amount), 0);

              return (
                <Fragment key={b.id}>
              <tr className="admin-booking-row">
                <td className="admin-cell--ref">
                  <code className="admin-ref">{b.referenceNumber ?? '—'}</code>
                </td>
                <td className="admin-cell--space">
                  <strong>{b.resource.name}</strong>
                  <span className="admin-cell__meta">{b.bookingType.name}</span>
                  <span className="admin-cell__meta">{eventLabel(b.eventType)}</span>
                </td>
                <td className="admin-cell--client">
                  <strong>{guestFullName(b)}</strong>
                  <span className="admin-cell__meta">{b.guestEmail || b.customer.email}</span>
                  <span className="admin-cell__meta">{customerCategoryLabel(b.customerCategory)}</span>
                  {b.companyName && <span className="admin-cell__meta">{b.companyName}</span>}
                  {b.includesApartment && (
                    <span className="admin-flag admin-flag--info">+ Appartement</span>
                  )}
                  {b.notes?.trim() && (
                    <blockquote className="admin-cell__notes" title="Remarques saisies par le client">
                      {b.notes.trim()}
                    </blockquote>
                  )}
                </td>
                <td className="admin-cell--dates">
                  <span>{formatDateTime(b.startAt)}</span>
                  <span className="admin-cell__arrow">→</span>
                  <span>{formatDateTime(b.endAt)}</span>
                </td>
                <td className="admin-cell--amount">
                  {['created', 'processing'].includes(b.status) ? (
                    <div className="admin-price-edit">
                      <div className="admin-price-edit__row">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="admin-pricing-input"
                          value={amountDrafts[b.id] ?? ''}
                          onChange={(e) =>
                            setAmountDrafts((prev) => ({ ...prev, [b.id]: e.target.value }))
                          }
                        />
                        <span className="admin-price-edit__currency">{b.currency}</span>
                      </div>
                      <input
                        type="text"
                        className="admin-pricing-input"
                        placeholder="Note tarif"
                        value={priceNoteDrafts[b.id] ?? ''}
                        onChange={(e) =>
                          setPriceNoteDrafts((prev) => ({ ...prev, [b.id]: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        disabled={actionId === b.id}
                        onClick={() => handleAmountUpdate(b.id)}
                      >
                        Appliquer tarif
                      </button>
                    </div>
                  ) : (
                    <div className="admin-amount-display">
                      <strong>{Number(b.totalAmount)} {b.currency}</strong>
                      {feeTotal > 0 && (
                        <span className="admin-cell__meta">dont {feeTotal} {b.currency} de frais</span>
                      )}
                      {b.quotedAmount != null && Number(b.quotedAmount) !== Number(b.totalAmount) && (
                        <span className="admin-cell__meta">Initial : {Number(b.quotedAmount)}</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="admin-cell--status">
                  <span
                    className={`badge badge--status ${statusClass(b.status)}`}
                    title={STATUS_LABELS[b.status] ?? b.status}
                  >
                    {statusLabelShort(b.status)}
                  </span>
                  <select
                    className="admin-status-select"
                    value={statusDrafts[b.id] ?? b.status}
                    onChange={(e) =>
                      setStatusDrafts((prev) => ({ ...prev, [b.id]: e.target.value }))
                    }
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline admin-status-apply"
                    disabled={actionId === b.id || statusDrafts[b.id] === b.status}
                    onClick={() => handleStatusUpdate(b.id)}
                  >
                    Appliquer
                  </button>
                </td>
                <td className="admin-cell--workflow">
                  {flags.length > 0 ? (
                    <div className="admin-workflow-flags">
                      {flags.map((f) => (
                        <span key={f.key} className={`admin-flag admin-flag--${f.tone}`}>
                          {f.label}
                        </span>
                      ))}
                    </div>
                  ) : b.status === 'created' ? (
                    <span className="admin-flag admin-flag--neutral">Attente client</span>
                  ) : (
                    <span className="admin-cell__meta">—</span>
                  )}
                </td>
                <td className="admin-cell--actions">
                  <div className="admin-actions-grid">
                    {canEdit && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => setEditingId(editingId === b.id ? null : b.id)}
                      >
                        {editingId === b.id ? 'Fermer' : 'Modifier'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleCopyLink(b.id)}
                    >
                      {linkCopiedId === b.id ? 'Lien copié ✓' : 'Lien client'}
                    </button>
                    {b.status === 'processing' && (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={actionId === b.id}
                        onClick={() => handleSendInvoice(b.id)}
                      >
                        {b.invoiceSentAt ? 'Renvoyer synthèse' : 'Envoyer synthèse'}
                      </button>
                    )}
                    {b.paymentProofName && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        disabled={actionId === b.id}
                        onClick={async () => {
                          setActionId(b.id);
                          try {
                            await openAdminPaymentProof(b.id);
                          } catch (e) {
                            setError(e instanceof Error ? e.message : 'Preuve introuvable');
                          } finally {
                            setActionId(null);
                          }
                        }}
                      >
                        Voir preuve
                      </button>
                    )}
                    {b.status === 'processing' && b.paymentClaimedAt && (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={actionId === b.id}
                        onClick={() => handleConfirmPayment(b.id)}
                      >
                        Confirmer paiement
                      </button>
                    )}
                    {['created', 'processing', 'paid'].includes(b.status) && (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          disabled={actionId === b.id}
                          onClick={() => handleRefuse(b.id)}
                        >
                          Refuser
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          disabled={actionId === b.id}
                          onClick={() => handleCancel(b.id)}
                        >
                          Annuler
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline admin-btn-delete"
                      disabled={actionId === b.id}
                      onClick={() => handleDelete(b.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
              {editingId === b.id && (
                <BookingEditPanel
                  booking={b}
                  onSaved={() => refreshNow({ silent: true })}
                  onClose={() => setEditingId(null)}
                />
              )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
