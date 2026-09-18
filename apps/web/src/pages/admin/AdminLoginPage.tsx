import { Link } from 'react-router-dom';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { MARNEZA } from '@/lib/marneza-theme';

export function AdminLoginPage() {
  return (
    <div className="admin-login-shell">
      <aside className="admin-login-shell__brand" aria-hidden="false">
        <div className="admin-login-shell__brand-inner">
          <Link to="/" className="admin-login-shell__logo admin-login-shell__logo--light">
            <img src={MARNEZA.logo} alt="Marneza" width={160} height={54} />
          </Link>
          <p className="admin-login-shell__eyebrow">Espace professionnel</p>
          <h1 className="admin-login-shell__headline">Administration Marneza</h1>
          <p className="admin-login-shell__lead">
            Gérez les réservations, tarifs et confirmations de paiement en un seul endroit.
          </p>
        </div>
        <div className="admin-login-shell__glow" aria-hidden="true" />
      </aside>

      <main className="admin-login-shell__panel">
        <div className="admin-login-shell__panel-inner">
          <Link to="/" className="admin-login-shell__logo admin-login-shell__logo--mobile">
            <img src={MARNEZA.logo} alt="Marneza" width={132} height={44} />
          </Link>
          <p className="admin-login-shell__panel-eyebrow">Connexion</p>
          <h2 className="admin-login-shell__panel-title">Accéder à l&apos;admin</h2>
          <p className="admin-login-shell__panel-sub">
            Identifiants réservés à l&apos;équipe Marneza.
          </p>
          <AdminLoginForm />
          <p className="admin-login-shell__footnote">
            <Link to="/">← Retour au site de réservation</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
