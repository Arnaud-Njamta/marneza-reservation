'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  adminExportBookings,
  adminGetSynthesis,
  adminListEmailTemplates,
  adminListSynthesisConfigs,
} from '@/lib/api-client';
import type { EmailTemplate, ReminderConfig, SynthesisResult } from '@/types/api';
import { guestFullName } from '@/lib/guest-identity';
import { formatDateTime } from './admin-utils';
import { TemplateEditModal } from './TemplateEditModal';
import { AdminUpcomingAlerts } from './AdminUpcomingAlerts';
import { PaymentSettingsForm } from './PaymentSettingsForm';

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function AdminSynthesis() {
  const [configs, setConfigs] = useState<ReminderConfig[]>([]);
  const [activeHorizon, setActiveHorizon] = useState(0);
  const [synthesis, setSynthesis] = useState<SynthesisResult | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [exportFrom, setExportFrom] = useState(monthStartYmd());
  const [exportTo, setExportTo] = useState(todayYmd());
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setError(null);
    try {
      const [cfg, tpl] = await Promise.all([
        adminListSynthesisConfigs().catch(() => [] as ReminderConfig[]),
        adminListEmailTemplates().catch(() => [] as EmailTemplate[]),
      ]);
      const active = (cfg || []).filter((c) => c.isActive && c.showInDashboard);
      setConfigs(active);
      setTemplates(tpl || []);

      const horizon = activeHorizon;
      const match = active.find((c) => c.horizonMonths === horizon && c.isActive);
      const statusList = Array.isArray(match?.statuses) ? match.statuses : undefined;
      const statuses = statusList?.length ? statusList.join(',') : undefined;
      const data = await adminGetSynthesis({ horizonMonths: horizon, statuses });
      setSynthesis(data);
    } catch (e) {
      if (!opts?.silent) setError(e instanceof Error ? e.message : 'Erreur chargement synthèse');
      // Ne pas laisser la synthèse bloquer le reste de l'admin
      setSynthesis((prev) => prev ?? {
        horizonMonths: activeHorizon,
        from: '',
        to: '',
        count: 0,
        totalAmount: 0,
        currency: 'USD',
        byResource: {},
        bookings: [],
      });
    }
  }, [activeHorizon]);

  // Charge au montage / changement d'horizon — PAS de poll auto (trop lourd)
  useEffect(() => {
    void load();
  }, [load]);

  async function switchHorizon(months: number) {
    setActiveHorizon(months);
    try {
      const match = configs.find((c) => c.horizonMonths === months);
      const data = await adminGetSynthesis({
        horizonMonths: months,
        statuses: match?.statuses?.join(','),
      });
      setSynthesis(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await adminExportBookings({ from: exportFrom, to: exportTo });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export impossible');
    } finally {
      setExporting(false);
    }
  }

  const tabs =
    configs.length > 0
      ? configs
      : [
          { id: '0', name: 'Mois en cours', horizonMonths: 0 },
          { id: '3', name: '3 mois', horizonMonths: 3 },
          { id: '6', name: '6 mois', horizonMonths: 6 },
          { id: '12', name: '12 mois', horizonMonths: 12 },
        ];

  return (
    <>
      <AdminUpcomingAlerts />

      <section className="admin-synthesis">
        <div className="admin-synthesis__header">
          <div>
            <h2>Synthèse des réservations</h2>
            {synthesis && (
              <p className="admin-synthesis__summary">
                <strong>{synthesis.count}</strong> réservation(s) ·{' '}
                <strong>{synthesis.totalAmount.toLocaleString('fr-FR')}</strong> {synthesis.currency}
              </p>
            )}
          </div>
          <div className="admin-synthesis__actions">
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => setShowSettings((v) => !v)}
            >
              ⚙ Personnaliser les textes
            </button>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="admin-synthesis__tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id ?? tab.horizonMonths}
              type="button"
              className={`option-btn ${activeHorizon === tab.horizonMonths ? 'selected' : ''}`}
              onClick={() => switchHorizon(tab.horizonMonths)}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {showSettings && (
          <div className="admin-synthesis__settings">
            <p>Cliquez sur un modèle pour modifier le texte (gras, italique, variables…) :</p>
            <div className="admin-synthesis__template-list">
              {templates.map((t) => (
                <button
                  key={t.code}
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => setEditingTemplate(t)}
                >
                  ✎ {t.name}
                </button>
              ))}
            </div>
            <PaymentSettingsForm open={showSettings} />
          </div>
        )}

        <div className="admin-synthesis__export">
          <label>
            Export Excel — du
            <input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} />
          </label>
          <label>
            au
            <input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} />
          </label>
          <button type="button" className="btn btn-sm btn-primary" disabled={exporting} onClick={handleExport}>
            {exporting ? 'Export…' : 'Télécharger Excel'}
          </button>
        </div>

        {synthesis && synthesis.bookings.length > 0 && (
          <div className="admin-table-wrap admin-synthesis__table">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Réf.</th>
                  <th>Client</th>
                  <th>Espace</th>
                  <th>Créneau</th>
                  <th>Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {synthesis.bookings.map((b) => (
                  <tr key={b.id}>
                    <td><code className="admin-ref">{b.referenceNumber ?? '—'}</code></td>
                    <td>{guestFullName(b)}</td>
                    <td>{b.resource.name}</td>
                    <td>
                      {formatDateTime(b.startAt)}
                      <span className="admin-cell__meta">→ {formatDateTime(b.endAt)}</span>
                    </td>
                    <td>{Number(b.totalAmount)} {b.currency}</td>
                    <td>{b.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {synthesis?.count === 0 && (
          <p className="admin-synthesis__empty">Aucune réservation sur cette période.</p>
        )}
      </section>

      {editingTemplate && (
        <TemplateEditModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSaved={() => load({ silent: true })}
        />
      )}
    </>
  );
}
