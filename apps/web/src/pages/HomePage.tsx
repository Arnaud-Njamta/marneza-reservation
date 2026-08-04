import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PriceDisplay } from '@/components/booking/PriceDisplay';
import { getPublicHome } from '@/lib/api-client';
import { getResourceMinPrice, ODOO_SHOP_URL } from '@/lib/odoo-shop';
import type { HomeTexts, Resource } from '@/types/api';

const FALLBACK_HOME: HomeTexts = {
  eyebrow: 'Réservation en ligne',
  title: 'Réservez votre événement',
  subtitle:
    'Depuis notre boutique, choisissez votre espace puis réservez vos dates ici. Rapide, simple et sécurisé.',
  intro:
    'Parcours recommandé : commencez par la boutique Salle de fête, puis cliquez sur « Réserver en ligne » sur la fiche produit.',
};

type Card = {
  slug: string;
  name: string;
  tagline: string;
  fromAmount: number | null;
  fromCurrency: string;
  compareAtAmount?: number;
  promoLabel?: string;
};

function cardsFromResources(resources: Resource[]): Card[] {
  return resources.map((r) => {
    const showcase =
      r.showcaseFromAmount != null && Number.isFinite(Number(r.showcaseFromAmount))
        ? {
            amount: Number(r.showcaseFromAmount),
            currency: r.showcaseCurrency || 'USD',
          }
        : null;
    const computed = getResourceMinPrice(r);
    const from = showcase ?? computed;
    return {
      slug: r.slug,
      name: r.name,
      tagline: r.tagline || r.description || '',
      fromAmount: from?.amount ?? null,
      fromCurrency: from?.currency ?? 'USD',
      compareAtAmount: !showcase ? computed?.compareAtAmount : undefined,
      promoLabel: !showcase ? computed?.promoLabel : undefined,
    };
  });
}

export function HomePage() {
  const [home, setHome] = useState<HomeTexts>(FALLBACK_HOME);
  const [cards, setCards] = useState<Card[]>([]);

  useEffect(() => {
    getPublicHome()
      .then((data) => {
        if (data.home) setHome({ ...FALLBACK_HOME, ...data.home });
        if (data.resources?.length) setCards(cardsFromResources(data.resources));
      })
      .catch(() => {
        /* accueil dégradé */
      });
  }, []);

  return (
    <main className="container page-main">
      <p className="page-eyebrow">{home.eyebrow}</p>
      <h1 className="page-title">{home.title}</h1>
      <p className="page-subtitle">{home.subtitle}</p>

      {home.intro && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <p style={{ margin: 0 }}>
            {home.intro}{' '}
            <a href={ODOO_SHOP_URL}>Boutique</a>
          </p>
        </div>
      )}

      <p style={{ fontSize: '0.875rem', color: 'var(--marneza-muted)', marginBottom: '0.75rem' }}>
        Accès direct (si vous connaissez déjà l&apos;espace) :
      </p>

      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {cards.map((r) => (
          <li key={r.slug}>
            <Link to={`/book/${r.slug}`} className="card resource-card">
              <strong style={{ fontSize: '1.1rem', fontFamily: 'var(--font-manrope)' }}>
                {r.name}
              </strong>
              <br />
              <span style={{ color: 'var(--marneza-muted)', fontSize: '0.9rem' }}>
                {r.tagline}
                {r.fromAmount != null && (
                  <>
                    {' — à partir de '}
                    <PriceDisplay
                      amount={r.fromAmount}
                      currency={r.fromCurrency}
                      compareAtAmount={r.compareAtAmount}
                      promoLabel={r.promoLabel}
                      size="sm"
                    />
                  </>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
