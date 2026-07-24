'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  adminCreateRentalTerm,
  adminDeleteRentalTerm,
  adminListRentalTerms,
  adminReorderRentalTerms,
  adminUpdateRentalTerm,
} from '@/lib/api-client';
import type { RentalTerm } from '@/types/api';

export function AdminRentalTerms() {
  const [terms, setTerms] = useState<RentalTerm[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newBody, setNewBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await adminListRentalTerms();
      setTerms(list);
      const next: Record<string, string> = {};
      list.forEach((t) => {
        next[t.id] = t.body;
      });
      setDrafts(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    setError(null);
    try {
      await adminCreateRentalTerm({ body: newBody });
      setNewBody('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur création');
    }
  }

  async function handleSave(term: RentalTerm) {
    setSavingId(term.id);
    setError(null);
    try {
      await adminUpdateRentalTerm(term.id, { body: drafts[term.id] ?? term.body });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur enregistrement');
    } finally {
      setSavingId(null);
    }
  }

  async function handleToggle(term: RentalTerm) {
    setSavingId(term.id);
    try {
      await adminUpdateRentalTerm(term.id, { isActive: !term.isActive });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(term: RentalTerm) {
    if (!window.confirm('Supprimer cette condition ?')) return;
    setSavingId(term.id);
    try {
      await adminDeleteRentalTerm(term.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur suppression');
    } finally {
      setSavingId(null);
    }
  }

  async function move(term: RentalTerm, direction: -1 | 1) {
    const index = terms.findIndex((t) => t.id === term.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= terms.length) return;
    const next = [...terms];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    setTerms(next);
    try {
      await adminReorderRentalTerms(next.map((t) => t.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur ordre');
      await load();
    }
  }

  return (
    <section className="card">
      <h2>Conditions de location</h2>
      <p style={{ color: 'var(--marneza-muted)', fontSize: '0.9rem' }}>
        Texte affiché au client avant confirmation de la réservation (page de confirmation).
      </p>

      {error && <div className="error-banner">{error}</div>}

      <div className="admin-promo__create" style={{ marginTop: '1rem' }}>
        <label style={{ flex: 1 }}>
          Nouvelle condition
          <textarea
            rows={2}
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="Ex. Une caution peut être demandée selon l'événement."
            style={{ width: '100%', marginTop: '0.35rem' }}
          />
        </label>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!newBody.trim()}
          onClick={handleCreate}
        >
          Ajouter
        </button>
      </div>

      {loading ? (
        <p>Chargement…</p>
      ) : terms.length === 0 ? (
        <p style={{ color: 'var(--marneza-muted)' }}>Aucune condition. Ajoutez-en ci-dessus.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '1.25rem', display: 'grid', gap: '0.75rem' }}>
          {terms.map((term, index) => (
            <li
              key={term.id}
              className="card"
              style={{
                margin: 0,
                opacity: term.isActive ? 1 : 0.55,
                borderStyle: term.isActive ? undefined : 'dashed',
              }}
            >
              <textarea
                rows={2}
                value={drafts[term.id] ?? ''}
                onChange={(e) => setDrafts((d) => ({ ...d, [term.id]: e.target.value }))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.65rem' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  disabled={index === 0}
                  onClick={() => move(term, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  disabled={index === terms.length - 1}
                  onClick={() => move(term, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  disabled={savingId === term.id || (drafts[term.id] ?? '') === term.body}
                  onClick={() => handleSave(term)}
                >
                  {savingId === term.id ? '…' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  disabled={savingId === term.id}
                  onClick={() => handleToggle(term)}
                >
                  {term.isActive ? 'Masquer' : 'Afficher'}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  disabled={savingId === term.id}
                  onClick={() => handleDelete(term)}
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
