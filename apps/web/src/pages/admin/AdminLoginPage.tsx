import { Link } from 'react-router-dom';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { MARNEZA } from '@/lib/marneza-theme';

export function AdminLoginPage() {
  return (
    <div className="admin-login-shell">
      <main className="admin-login-shell__main">
        <Link to="/" className="admin-login-shell__logo">
          <img src={MARNEZA.logo} alt="Marneza" width={140} height={48} />
        </Link>
        <p className="page-eyebrow">Administration</p>
        <h1 className="page-title">Connexion</h1>
        <p className="page-subtitle">Accès réservé à l&apos;équipe Marneza.</p>
        <AdminLoginForm />
      </main>
    </div>
  );
}
