import { AdminRentalTerms } from '@/components/admin/AdminRentalTerms';

export default function AdminTermsPage() {
  return (
    <main className="container-wide page-main admin-page">
      <h1 className="page-title">Conditions de location</h1>
      <p className="page-subtitle">
        Ces points sont affichés au client lorsqu&apos;il confirme sa réservation.
      </p>
      <AdminRentalTerms />
    </main>
  );
}
