'use client';

import { useEffect, useState } from 'react';
import { adminGetPaymentSettings, adminSavePaymentSettings } from '@/lib/api-client';
import type { PaymentSettings } from '@/types/api';

const EMPTY: PaymentSettings = {
  bankName: '',
  bankAccount: '',
  bankHolder: '',
  mobileMoney: '',
  referenceHelp: '',
};

type Props = {
  open?: boolean;
};

export function PaymentSettingsForm({ open = true }: Props) {
  const [form, setForm] = useState<PaymentSettings>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminGetPaymentSettings()
      .then((data) => {
        if (!cancelled) setForm(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur chargement');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  function setField<K extends keyof PaymentSettings>(key: K, value: PaymentSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const data = await adminSavePaymentSettings(form);
      setForm(data);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="admin-payment-settings">
      <h3 className="admin-payment-settings__title">Coordonnées de paiement</h3>
      <p className="admin-payment-settings__hint">
        Ces infos apparaissent dans l&apos;email de synthèse (variable{' '}
        <code>{'{{paymentBlock}}'}</code>).
      </p>

      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <p>Chargement…</p>
      ) : (
        <div className="admin-payment-settings__grid">
          <label>
            Banque
            <input
              type="text"
              value={form.bankName}
              onChange={(e) => setField('bankName', e.target.value)}
            />
          </label>
          <label>
            Titulaire
            <input
              type="text"
              value={form.bankHolder}
              onChange={(e) => setField('bankHolder', e.target.value)}
            />
          </label>
          <label className="admin-payment-settings__full">
            Compte / IBAN
            <input
              type="text"
              value={form.bankAccount}
              onChange={(e) => setField('bankAccount', e.target.value)}
            />
          </label>
          <label className="admin-payment-settings__full">
            Mobile money
            <input
              type="text"
              value={form.mobileMoney}
              onChange={(e) => setField('mobileMoney', e.target.value)}
            />
          </label>
          <label className="admin-payment-settings__full">
            Aide / libellé du virement
            <textarea
              rows={2}
              value={form.referenceHelp}
              onChange={(e) => setField('referenceHelp', e.target.value)}
            />
          </label>
        </div>
      )}

      <div className="admin-payment-settings__actions">
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={saving || loading}
          onClick={handleSave}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer le paiement'}
        </button>
        {saved && <span className="admin-payment-settings__ok">Enregistré</span>}
      </div>
    </div>
  );
}
