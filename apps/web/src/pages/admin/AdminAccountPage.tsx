import { AdminAccountForm } from '@/components/admin/AdminAccountForm';

export function AdminAccountPage() {
  return (
    <main className="container-wide page-main">
      <p className="page-eyebrow">Administration</p>
      <h1 className="page-title">Mon compte</h1>
      <p className="page-subtitle">
        Gérez votre e-mail de connexion et votre mot de passe administrateur.
      </p>
      <AdminAccountForm />
    </main>
  );
}
