'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { authMe, getAdminToken } from '@/lib/auth';

type Props = { children: React.ReactNode };

export function AdminAuthGate({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(pathname === '/admin/login');

  useEffect(() => {
    if (pathname === '/admin/login') {
      setReady(true);
      return;
    }

    const token = getAdminToken();
    if (!token) {
      router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    authMe()
      .then(() => setReady(true))
      .catch(() => {
        router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
      });
  }, [pathname, router]);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <main className="container page-main">
        <p style={{ color: 'var(--marneza-muted)' }}>Vérification de la session…</p>
      </main>
    );
  }

  return <>{children}</>;
}
