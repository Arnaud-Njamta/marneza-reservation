/**
 * Page réservation — charge la ressource côté serveur, formulaire côté client.
 *
 * @route /book/[slug]?from=odoo
 */

import { BookingBreadcrumb } from '@/components/booking/BookingBreadcrumb';
import { BookingWizard } from '@/components/booking/BookingWizard';
import { OdooContextBanner } from '@/components/booking/OdooContextBanner';
import { PriceDisplay } from '@/components/booking/PriceDisplay';
import { getResource } from '@/lib/api-client';
import { getResourceMinPrice, isFromOdoo } from '@/lib/odoo-shop';
import type { Resource } from '@/types/api';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
};

export default async function BookPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { from } = await searchParams;
  const fromOdoo = isFromOdoo(from);

  let resource: Resource;
  try {
    resource = await getResource(slug);
  } catch {
    notFound();
  }

  const minPrice = getResourceMinPrice(resource);

  return (
    <main className="container page-main">
      <BookingBreadcrumb resourceSlug={slug} resourceName={resource.name} fromOdoo={fromOdoo} />
      <p className="page-eyebrow">Réservation</p>
      <h1 className="page-title">{resource.name}</h1>
      {resource.description && <p className="page-subtitle">{resource.description}</p>}
      {fromOdoo && <OdooContextBanner resourceName={resource.name} minPrice={minPrice} />}
      {slug === 'appartement' && (
        <div className="apartment-intro card">
          <p style={{ margin: 0 }}>
            {minPrice ? (
              <>
                <strong>
                  À partir de{' '}
                  <PriceDisplay
                    amount={minPrice.amount}
                    currency={minPrice.currency}
                    compareAtAmount={minPrice.compareAtAmount}
                    promoLabel={minPrice.promoLabel}
                    size="sm"
                  />
                </strong>
              </>
            ) : (
              <strong>Tarifs selon le créneau</strong>
            )}{' '}
            — choisissez une nuit (18h → 08h) ou une journée (08h → 18h), puis sélectionnez votre date
            sur le calendrier.
          </p>
        </div>
      )}
      {slug === 'salle-conference' && (
        <div className="resource-intro card">
          <p style={{ margin: 0 }}>
            {minPrice ? (
              <>
                <strong>
                  À partir de{' '}
                  <PriceDisplay
                    amount={minPrice.amount}
                    currency={minPrice.currency}
                    compareAtAmount={minPrice.compareAtAmount}
                    promoLabel={minPrice.promoLabel}
                    size="sm"
                  />
                </strong>
              </>
            ) : (
              <strong>Tarifs selon le créneau</strong>
            )}{' '}
            — idéal pour séminaires et réunions. Choisissez votre créneau (heure, journée, soirée ou
            full day) puis votre date.
          </p>
        </div>
      )}
      {!fromOdoo && minPrice && slug !== 'appartement' && slug !== 'salle-conference' && (
        <p className="page-subtitle" style={{ marginTop: '-0.5rem' }}>
          À partir de{' '}
          <PriceDisplay
            amount={minPrice.amount}
            currency={minPrice.currency}
            compareAtAmount={minPrice.compareAtAmount}
            promoLabel={minPrice.promoLabel}
          />
        </p>
      )}
      <BookingWizard resource={resource} fromOdoo={fromOdoo} />
    </main>
  );
}
