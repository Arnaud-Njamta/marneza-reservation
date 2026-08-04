/**
 * Édition vitrine page d’accueil — textes + cartes espaces.
 * @route /admin/home
 */

import { useCallback, useEffect, useState } from 'react';
import {
  adminGetSiteHome,
  adminSaveSiteHome,
  adminUpdateShowcaseResource,
} from '@/lib/api-client';
import type { HomeTexts, ShowcaseResource } from '@/types/api';

type ResourceDraft = {
  name: string;
  tagline: string;
  description: string;
  showcaseFromAmount: string;
  showcaseCurrency: string;
  saving: boolean;
  saved: boolean;
  error: string | null;
};

export function AdminHomeContent() {
  const [home, setHome] = useState<HomeTexts>({
    eyebrow: '',
    title: '',
    subtitle: '',
    intro: '',
  });
  const [resources, setResources] = useState<ShowcaseResource[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ResourceDraft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [homeSaving, setHomeSaving] = useState(false);
  const [homeSaved, setHomeSaved] = useState(false);
  const [homeError, setHomeError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminGetSiteHome();
      setHome(data.home);
      setResources(data.resources);
      const next: Record<string, ResourceDraft> = {};
      for (const r of data.resources) {
        next[r.id] = {
          name: r.name,
          tagline: r.tagline ?? '',
          description: r.description ?? '',
          showcaseFromAmount:
            r.showcaseFromAmount != null ? String(Number(r.showcaseFromAmount)) : '',
          showcaseCurrency: r.showcaseCurrency || 'USD',
          saving: false,
          saved: false,
          error: null,
        };
      }
      setDrafts(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveHome() {
    setHomeSaving(true);
    setHomeError(null);
    setHomeSaved(false);
    try {
      const updated = await adminSaveSiteHome(home);
      setHome(updated);
      setHomeSaved(true);
    } catch (err) {
      setHomeError(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setHomeSaving(false);
    }
  }

  function patchDraft(id: string, patch: Partial<ResourceDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch, saved: false, error: null },
    }));
  }

  async function saveResource(r: ShowcaseResource) {
    const draft = drafts[r.id];
    if (!draft) return;

    let showcaseFromAmount: number | null = null;
    if (draft.showcaseFromAmount.trim() !== '') {
      const n = Number(draft.showcaseFromAmount);
      if (!Number.isFinite(n) || n < 0) {
        patchDraft(r.id, { error: 'Prix « à partir de » invalide' });
        return;
      }
      showcaseFromAmount = n;
    }

    patchDraft(r.id, { saving: true, error: null });
    try {
      const updated = await adminUpdateShowcaseResource(r.id, {
        name: draft.name.trim(),
        tagline: draft.tagline.trim() || null,
        description: draft.description.trim() || null,
        showcaseFromAmount,
        showcaseCurrency: draft.showcaseCurrency.trim() || 'USD',
      });
      setResources((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
      patchDraft(r.id, { saving: false, saved: true });
    } catch (err) {
      patchDraft(r.id, {
        saving: false,
        error: err instanceof Error ? err.message : 'Erreur',
      });
    }
  }

  if (loading) return <p>Chargement…</p>;
  if (error) return <div className="error-banner">{error}</div>;

  return (
    <div className="admin-home-content">
      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Textes de la page d&apos;accueil</h2>
        <p className="page-subtitle" style={{ marginTop: 0 }}>
          Ces textes s&apos;affichent en haut de{' '}
          <a href="/" target="_blank" rel="noreferrer">
            la page publique
          </a>
          .
        </p>
        <label className="form-group">
          <span>Sur-titre</span>
          <input
            type="text"
            value={home.eyebrow}
            onChange={(e) => {
              setHomeSaved(false);
              setHome((h) => ({ ...h, eyebrow: e.target.value }));
            }}
          />
        </label>
        <label className="form-group">
          <span>Titre</span>
          <input
            type="text"
            value={home.title}
            onChange={(e) => {
              setHomeSaved(false);
              setHome((h) => ({ ...h, title: e.target.value }));
            }}
          />
        </label>
        <label className="form-group">
          <span>Sous-titre</span>
          <textarea
            rows={3}
            value={home.subtitle}
            onChange={(e) => {
              setHomeSaved(false);
              setHome((h) => ({ ...h, subtitle: e.target.value }));
            }}
          />
        </label>
        <label className="form-group">
          <span>Encadré parcours recommandé</span>
          <textarea
            rows={3}
            value={home.intro}
            onChange={(e) => {
              setHomeSaved(false);
              setHome((h) => ({ ...h, intro: e.target.value }));
            }}
          />
        </label>
        {homeError && <div className="error-banner">{homeError}</div>}
        {homeSaved && <div className="success-banner">Textes enregistrés.</div>}
        <button type="button" className="btn btn-primary" disabled={homeSaving} onClick={saveHome}>
          {homeSaving ? 'Enregistrement…' : 'Enregistrer les textes'}
        </button>
      </section>

      <h2>Espaces (cartes d&apos;accueil)</h2>
      <p className="page-subtitle">
        Nom, phrase courte, et prix « à partir de » affiché sur l&apos;accueil (indépendant des
        tarifs de réservation).
      </p>

      {resources.map((r) => {
        const d = drafts[r.id];
        if (!d) return null;
        return (
          <section key={r.id} className="card" style={{ marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 0.75rem', color: 'var(--marneza-muted)', fontSize: '0.85rem' }}>
              Slug : <code>{r.slug}</code>
            </p>
            <label className="form-group">
              <span>Nom affiché</span>
              <input
                type="text"
                value={d.name}
                onChange={(e) => patchDraft(r.id, { name: e.target.value })}
              />
            </label>
            <label className="form-group">
              <span>Phrase sous le nom (accueil)</span>
              <input
                type="text"
                value={d.tagline}
                placeholder="Ex. Fêtes, mariages, cérémonies"
                onChange={(e) => patchDraft(r.id, { tagline: e.target.value })}
              />
            </label>
            <label className="form-group">
              <span>Description longue (fiche / détail)</span>
              <textarea
                rows={3}
                value={d.description}
                onChange={(e) => patchDraft(r.id, { description: e.target.value })}
              />
            </label>
            <div className="admin-home-content__price-row">
              <label className="form-group">
                <span>À partir de</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={d.showcaseFromAmount}
                  placeholder="Ex. 1500"
                  onChange={(e) => patchDraft(r.id, { showcaseFromAmount: e.target.value })}
                />
              </label>
              <label className="form-group">
                <span>Devise</span>
                <input
                  type="text"
                  value={d.showcaseCurrency}
                  onChange={(e) => patchDraft(r.id, { showcaseCurrency: e.target.value })}
                />
              </label>
            </div>
            {d.error && <div className="error-banner">{d.error}</div>}
            {d.saved && <div className="success-banner">Espace enregistré.</div>}
            <button
              type="button"
              className="btn btn-primary"
              disabled={d.saving}
              onClick={() => saveResource(r)}
            >
              {d.saving ? 'Enregistrement…' : 'Enregistrer cet espace'}
            </button>
          </section>
        );
      })}
    </div>
  );
}
