import Link from 'next/link';
import { PriceDisplay } from '@/components/booking/PriceDisplay';
import { getResources } from '@/lib/api-client';
import { getResourceMinPrice, ODOO_SHOP_URL } from '@/lib/odoo-shop';

const FALLBACK = [
  { slug: 'espace-polyvalent', name: 'Espace Polyvalent', desc: 'Fêtes, mariages, cérémonies' },
  { slug: 'salle-conference', name: 'Salle de Conférence', desc: 'Séminaires et réunions' },
  { slug: 'appartement', name: 'Appartement Marneza', desc: 'Location jour ou nuit' },
];

export default async function HomePage() {
  let cards = FALLBACK.map((r) => ({ ...r, minPrice: null as ReturnType<typeof getResourceMinPrice> }));

  try {
    const resources = await getResources();
    if (resources.length) {
      cards = resources.map((r) => {
        const fallback = FALLBACK.find((f) => f.slug === r.slug);
        return {
          slug: r.slug,
          name: r.name,
          desc: fallback?.desc ?? (r.description ?? ''),
          minPrice: getResourceMinPrice(r),
        };
      });
    }
  } catch {
    // Accueil dégradé sans API : libellés sans prix figés.
  }

  return (
    <main className="container page-main">
      <p className="page-eyebrow">Réservation en ligne</p>
      <h1 className="page-title">Réservez votre événement</h1>
      <p className="page-subtitle">
        Depuis notre boutique, choisissez votre espace puis réservez vos dates ici. Rapide, simple
        et sécurisé.
      </p>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <p style={{ margin: 0 }}>
          <strong>Parcours recommandé :</strong> commencez par la{' '}
          <a href={ODOO_SHOP_URL}>boutique Salle de fête</a>, puis cliquez sur{' '}
          <strong>Réserver en ligne</strong> sur la fiche produit.
        </p>
      </div>

      <p style={{ fontSize: '0.875rem', color: 'var(--marneza-muted)', marginBottom: '0.75rem' }}>
        Accès direct (si vous connaissez déjà l&apos;espace) :
      </p>

      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {cards.map((r) => (
          <li key={r.slug}>
            <Link href={`/book/${r.slug}`} className="card resource-card">
              <strong style={{ fontSize: '1.1rem', fontFamily: 'var(--font-manrope)' }}>
                {r.name}
              </strong>
              <br />
              <span style={{ color: 'var(--marneza-muted)', fontSize: '0.9rem' }}>
                {r.desc}
                {r.minPrice && (
                  <>
                    {' — à partir de '}
                    <PriceDisplay
                      amount={r.minPrice.amount}
                      currency={r.minPrice.currency}
                      compareAtAmount={r.minPrice.compareAtAmount}
                      promoLabel={r.minPrice.promoLabel}
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
