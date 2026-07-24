'use client';

import { useEffect, useState } from 'react';
import type { EmailTemplate } from '@/types/api';
import { adminSaveEmailTemplate } from '@/lib/api-client';
import { RichTextEditor } from './RichTextEditor';

const VARIABLES = [
  '{{firstName}}',
  '{{reference}}',
  '{{resource}}',
  '{{period}}',
  '{{amount}}',
  '{{currency}}',
  '{{paymentBlock}}',
  '{{feeLines}}',
  '{{clientLink}}',
];

type Props = {
  template: EmailTemplate;
  onClose: () => void;
  onSaved: () => void;
};

export function TemplateEditModal({ template, onClose, onSaved }: Props) {
  const [subject, setSubject] = useState(template.subject);
  const [bodyHtml, setBodyHtml] = useState(template.bodyHtml);
  const [useRichEditor, setUseRichEditor] = useState(template.useRichEditor !== false);
  const [bodyText, setBodyText] = useState(template.bodyText ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSubject(template.subject);
    setBodyHtml(template.bodyHtml);
    setUseRichEditor(template.useRichEditor !== false);
    setBodyText(template.bodyText ?? '');
  }, [template]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await adminSaveEmailTemplate({
        code: template.code,
        name: template.name,
        subject,
        bodyHtml: useRichEditor ? bodyHtml : `<pre>${bodyText}</pre>`,
        bodyText: useRichEditor ? undefined : bodyText,
        useRichEditor,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  }

  function insertVar(v: string) {
    if (useRichEditor) {
      setBodyHtml((prev) => prev + v);
    } else {
      setBodyText((prev) => prev + v);
    }
  }

  return (
    <div className="admin-modal-overlay" role="dialog" aria-modal="true">
      <div className="admin-modal admin-modal--wide">
        <header className="admin-modal__header">
          <div>
            <h2>Personnaliser le message</h2>
            <p className="admin-modal__subtitle">{template.name}</p>
          </div>
          <button type="button" className="admin-modal__close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </header>

        {error && <div className="error-banner">{error}</div>}

        <label className="admin-modal__field">
          Objet de l&apos;email
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>

        <div className="admin-modal__vars">
          {VARIABLES.map((v) => (
            <button key={v} type="button" className="btn btn-sm btn-outline" onClick={() => insertVar(v)}>
              {v}
            </button>
          ))}
        </div>

        <label className="admin-modal__checkbox">
          <input
            type="checkbox"
            checked={useRichEditor}
            onChange={(e) => setUseRichEditor(e.target.checked)}
          />
          Éditeur enrichi (gras, italique, police…)
        </label>

        {useRichEditor ? (
          <RichTextEditor value={bodyHtml} onChange={setBodyHtml} placeholder="Corps du message…" />
        ) : (
          <textarea
            rows={8}
            className="admin-modal__textarea"
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder="Texte simple…"
          />
        )}

        <footer className="admin-modal__footer">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
            Annuler
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </footer>
      </div>
    </div>
  );
}
