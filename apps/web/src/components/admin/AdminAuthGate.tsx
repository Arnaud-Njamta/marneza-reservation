import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authMe, getAdminToken } from '@/lib/auth';

type Props = { children: React.ReactNode };

export function AdminAuthGate({ children }: Props) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      navigate(`/admin/login?next=${encodeURIComponent(pathname)}`, { replace: true });
      return;
    }

    authMe()
      .then(() => setReady(true))
      .catch(() => {
        navigate(`/admin/login?next=${encodeURIComponent(pathname)}`, { replace: true });
      });
  }, [pathname, navigate]);

  if (!ready) {
    return (
      <main className="container page-main">
        <p style={{ color: 'var(--marneza-muted)' }}>Vérification de la session…</p>
      </main>
    );
  }

  return <>{children}</>;
}
