type Props = {
  amount: number;
  currency: string;
  compareAtAmount?: number | null;
  promoLabel?: string | null;
  size?: 'sm' | 'md' | 'lg';
};

/** Affichage prix vitrine avec promo optionnelle (prix barré). */
export function PriceDisplay({ amount, currency, compareAtAmount, promoLabel, size = 'md' }: Props) {
  const hasPromo = compareAtAmount != null && compareAtAmount > amount;
  const sizeClass = size === 'sm' ? 'price-display--sm' : size === 'lg' ? 'price-display--lg' : '';

  return (
    <span className={`price-display ${sizeClass}`}>
      {hasPromo && (
        <span className="price-display__compare">
          {compareAtAmount} {currency}
        </span>
      )}
      <span className="price-tag">{amount} {currency}</span>
      {hasPromo && promoLabel && <span className="price-display__promo">{promoLabel}</span>}
    </span>
  );
}
