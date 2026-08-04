import { AdminHomeContent } from '@/components/admin/AdminHomeContent';

export function AdminHomePage() {
  return (
    <main className="container-wide page-main admin-page">
      <h1 className="page-title">Accueil &amp; vitrine</h1>
      <p className="page-subtitle">
        Modifiez les textes de la page d&apos;accueil et le « à partir de » de chaque espace, sans
        toucher au code.
      </p>
      <AdminHomeContent />
    </main>
  );
}
