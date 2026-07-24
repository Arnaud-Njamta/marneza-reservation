import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { MARNEZA } from '@/lib/marneza-theme';

export default function AdminLoginPage() {
  return (
    <div className="admin-login-shell">
      <main className="admin-login-shell__main">
        <Link href="/" className="admin-login-shell__logo">
          <Image
            src={MARNEZA.logo}
            alt="Marneza"
            width={140}
            height={48}
            priority
            unoptimized
          />
        </Link>
        <p className="page-eyebrow">Administration</p>
        <h1 className="page-title">Connexion</h1>
        <p className="page-subtitle">Accès réservé à l&apos;équipe Marneza.</p>
        <Suspense fallback={<p>Chargement…</p>}>
          <AdminLoginForm />
        </Suspense>
      </main>
    </div>
  );
}
