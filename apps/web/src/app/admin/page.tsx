import { AdminDashboard } from '@/components/admin/AdminDashboard';

export default function AdminPage() {
  return (
    <main className="container-wide page-main admin-page">
      <h1 className="page-title">Gestion des réservations</h1>
      <AdminDashboard />
    </main>
  );
}
