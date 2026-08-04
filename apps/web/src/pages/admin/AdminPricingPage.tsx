import { AdminPricing } from '@/components/admin/AdminPricing';
import { AdminPromoCodes } from '@/components/admin/AdminPromoCodes';

export function AdminPricingPage() {
  return (
    <main className="container-wide page-main admin-page">
      <h1 className="page-title">Tarifs &amp; promos</h1>
      <p className="page-subtitle">
        Tarifs personnel / entreprise, codes promo et vitrine.
      </p>
      <AdminPricing />
      <AdminPromoCodes />
    </main>
  );
}
