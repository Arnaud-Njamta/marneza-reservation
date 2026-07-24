'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAdminToken } from '@/lib/auth';

export function AdminAccessLink() {
  const pathname = usePathname();
  const [href, setHref] = useState('/admin/login');

  useEffect(() => {
    setHref(getAdminToken() ? '/admin' : '/admin/login');
  }, []);

  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <Link href={href} className="site-header__pro" title="Espace professionnel">
      <svg
        className="site-header__pro-icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <span className="site-header__pro-label">Espace pro</span>
    </Link>
  );
}
