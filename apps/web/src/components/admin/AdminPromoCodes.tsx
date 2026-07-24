'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminCreatePromoCode, adminListPromoCodes, adminUpdatePromoCode } from '@/lib/api-client';
import type { PromoCode } from '@/types/api';

export function AdminPromoCodes() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [discount, setDiscount] = useState('20');
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCodes(await adminListPromoCodes());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    setLastCreated(null);
    try {
      const promo = await adminCreatePromoCode({
        discountAmount: Number(discount),
        label: label || undefined,
      });
      setLastCreated(promo.code);
      setDiscount('20');
      setLabel('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur création');
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(promo: PromoCode) {
    await adminUpdatePromoCode(promo.id, { isActive: !promo.isActive });
    await load();
  }

  return (
    <section className="admin-promo card" style={{ marginTop: '2rem' }}>
      <h2>Codes promo</h2>
      <p style={{ color: 'var(--marneza-muted)', fontSize: '0.9rem' }}>
        Générez un code que le client saisit à la réservation — réduction en montant fixe (USD).
      </p>

      {error && <div className="error-banner">{error}</div>}
      {lastCreated && (
        <div className="admin-promo__created">
          Code créé : <strong>{lastCreated}</strong>
        </div>
      )}

      <div className="admin-promo__create">
        <label>
          Réduction (USD)
          <input type="number" min="1" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </label>
        <label>
          Libellé (optionnel)
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. Promo été" />
        </label>
        <button type="button" className="btn btn-primary" disabled={creating} onClick={handleCreate}>
          {creating ? 'Génération…' : 'Générer un code'}
        </button>
      </div>

      {loading ? (
        <p>Chargement…</p>
      ) : codes.length === 0 ? (
        <p style={{ color: 'var(--marneza-muted)' }}>Aucun code promo.</p>
      ) : (
        <table className="admin-table" style={{ marginTop: '1rem' }}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Réduction</th>
              <th>Utilisations</th>
              <th>Actif</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((p) => (
              <tr key={p.id}>
                <td><code>{p.code}</code></td>
                <td>{Number(p.discountAmount)} {p.currency}</td>
                <td>{p.usedCount}{p.maxUses != null ? ` / ${p.maxUses}` : ''}</td>
                <td>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => toggleActive(p)}>
                    {p.isActive ? 'Désactiver' : 'Activer'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
