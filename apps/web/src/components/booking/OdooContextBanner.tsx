import { PriceDisplay } from './PriceDisplay';
import type { DisplayPrice } from '@/lib/odoo-shop';

type Props = {
  resourceName: string;
  minPrice: DisplayPrice | null;
};

/** Rappel option A : l'espace est déjà choisi sur Odoo, le tarif exact suit le créneau. */
export function OdooContextBanner({ resourceName, minPrice }: Props) {
  return (
    <div className="odoo-context-banner" role="status">
      <p>
        Vous réservez <strong>{resourceName}</strong> — espace sélectionné sur notre boutique.
      </p>
      {minPrice && (
        <p className="odoo-context-banner__hint">
          Tarifs à partir de{' '}
          <PriceDisplay
            amount={minPrice.amount}
            currency={minPrice.currency}
            compareAtAmount={minPrice.compareAtAmount}
            promoLabel={minPrice.promoLabel}
            size="sm"
          />
          . Le montant exact s&apos;affiche selon le type de location choisi ci-dessous.
        </p>
      )}
    </div>
  );
}
