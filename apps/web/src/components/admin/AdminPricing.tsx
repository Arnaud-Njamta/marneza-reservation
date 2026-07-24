'use client';

/**
 * Gestion des tarifs vitrine — prix, promos, périodes.
 *
 * @route /admin/pricing
 */

import { useCallback, useEffect, useState } from 'react';
import { adminListPricing, adminUpdatePricing } from '@/lib/api-client';
import type { AdminPricingRule } from '@/types/api';

type RowState = {
  amountPersonnel: string;
  amountEntreprise: string;
  amount: string;
  compareAtAmount: string;
  promoLabel: string;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  saving: boolean;
  saved: boolean;
  error: string | null;
};

function toDateInput(value: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function initRow(rule: AdminPricingRule): RowState {
  const personnel = rule.amountPersonnel ?? rule.amount;
  const entreprise = rule.amountEntreprise ?? rule.amount;
  return {
    amountPersonnel: String(Number(personnel)),
    amountEntreprise: String(Number(entreprise)),
    amount: String(Number(rule.amount)),
    compareAtAmount: rule.compareAtAmount != null ? String(Number(rule.compareAtAmount)) : '',
    promoLabel: rule.promoLabel ?? '',
    validFrom: toDateInput(rule.validFrom),
    validTo: toDateInput(rule.validTo),
    isActive: rule.isActive,
    saving: false,
    saved: false,
    error: null,
  };
}

export function AdminPricing() {
  const [rules, setRules] = useState<AdminPricingRule[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminListPricing();
      setRules(data);
      const next: Record<string, RowState> = {};
      for (const rule of data) {
        next[rule.id] = initRow(rule);
      }
      setRows(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function updateRow(id: string, patch: Partial<RowState>) {
    setRows((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch, saved: false, error: null },
    }));
  }

  async function saveRule(rule: AdminPricingRule) {
    const row = rows[rule.id];
    if (!row) return;

    const amountPersonnel = Number(row.amountPersonnel);
    const amountEntreprise = Number(row.amountEntreprise);
    if (!Number.isFinite(amountPersonnel) || amountPersonnel < 0) {
      updateRow(rule.id, { error: 'Prix personnel invalide' });
      return;
    }
    if (!Number.isFinite(amountEntreprise) || amountEntreprise < 0) {
      updateRow(rule.id, { error: 'Prix entreprise invalide' });
      return;
    }

    const compareAtAmount = row.compareAtAmount.trim() === '' ? null : Number(row.compareAtAmount);
    if (compareAtAmount != null && (!Number.isFinite(compareAtAmount) || compareAtAmount < 0)) {
      updateRow(rule.id, { error: 'Prix barré invalide' });
      return;
    }

    updateRow(rule.id, { saving: true, error: null });

    try {
      const updated = await adminUpdatePricing(rule.id, {
        amount: amountPersonnel,
        amountPersonnel,
        amountEntreprise,
        compareAtAmount,
        promoLabel: row.promoLabel.trim() || null,
        validFrom: row.validFrom || null,
        validTo: row.validTo || null,
        isActive: row.isActive,
      });

      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
      setRows((prev) => ({
        ...prev,
        [rule.id]: { ...initRow(updated), saving: false, saved: true },
      }));
    } catch (err) {
      updateRow(rule.id, {
        saving: false,
        error: err instanceof Error ? err.message : 'Échec enregistrement',
      });
    }
  }

  if (loading) return <p>Chargement des tarifs…</p>;
  if (error) return <div className="error-banner">{error}</div>;

  const grouped = rules.reduce<Record<string, AdminPricingRule[]>>((acc, rule) => {
    const key = rule.resource.slug;
    if (!acc[key]) acc[key] = [];
    acc[key].push(rule);
    return acc;
  }, {});

  return (
    <div>
      {Object.entries(grouped).map(([slug, resourceRules]) => (
        <section key={slug} className="admin-pricing-group">
          <h2 className="admin-pricing-group__title">{resourceRules[0].resource.name}</h2>
          <div className="admin-table-wrap">
            <table className="admin-table admin-pricing-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Personnel (USD)</th>
                  <th>Entreprise (USD)</th>
                  <th>Prix barré</th>
                  <th>Libellé promo</th>
                  <th>Début</th>
                  <th>Fin</th>
                  <th>Actif</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {resourceRules.map((rule) => {
                  const row = rows[rule.id];
                  if (!row) return null;

                  return (
                    <tr key={rule.id}>
                      <td>{rule.bookingType.name}</td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          className="admin-pricing-input"
                          value={row.amountPersonnel}
                          onChange={(e) => updateRow(rule.id, { amountPersonnel: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          className="admin-pricing-input"
                          value={row.amountEntreprise}
                          onChange={(e) => updateRow(rule.id, { amountEntreprise: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          placeholder="—"
                          className="admin-pricing-input"
                          value={row.compareAtAmount}
                          onChange={(e) => updateRow(rule.id, { compareAtAmount: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          placeholder="Ex. Promo été"
                          className="admin-pricing-input admin-pricing-input--wide"
                          value={row.promoLabel}
                          onChange={(e) => updateRow(rule.id, { promoLabel: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          className="admin-pricing-input"
                          value={row.validFrom}
                          onChange={(e) => updateRow(rule.id, { validFrom: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          className="admin-pricing-input"
                          value={row.validTo}
                          onChange={(e) => updateRow(rule.id, { validTo: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={row.isActive}
                          onChange={(e) => updateRow(rule.id, { isActive: e.target.checked })}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={row.saving}
                          onClick={() => saveRule(rule)}
                        >
                          {row.saving ? '…' : 'Enregistrer'}
                        </button>
                        {row.saved && (
                          <span className="admin-pricing-saved">Enregistré</span>
                        )}
                        {row.error && (
                          <span className="admin-pricing-error">{row.error}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
