import Link from 'next/link';
import { getOdooProductUrl, ODOO_SHOP_URL } from '@/lib/odoo-shop';

type Props = {
  resourceSlug: string;
  resourceName: string;
  fromOdoo: boolean;
};

export function BookingBreadcrumb({ resourceSlug, resourceName, fromOdoo }: Props) {
  if (fromOdoo) {
    return (
      <nav aria-label="Fil d'Ariane" className="booking-breadcrumb">
        <a href={ODOO_SHOP_URL}>Salle de fête</a>
        <span aria-hidden="true">›</span>
        <a href={getOdooProductUrl(resourceSlug)}>{resourceName}</a>
        <span aria-hidden="true">›</span>
        <span>Choisir vos dates</span>
      </nav>
    );
  }

  return (
    <p style={{ marginBottom: '0.5rem' }}>
      <Link href="/" style={{ fontSize: '0.875rem', color: 'var(--marneza-muted)' }}>
        ← Tous les espaces
      </Link>
    </p>
  );
}
