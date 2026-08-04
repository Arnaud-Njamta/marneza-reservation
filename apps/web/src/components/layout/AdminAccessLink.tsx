import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getAdminToken } from '@/lib/auth';

/** Accès admin — icône discrète alignée sur panier / recherche du site Odoo */
export function AdminAccessLink() {
  const { pathname } = useLocation();
  const [to, setTo] = useState('/admin/login');

  useEffect(() => {
    setTo(getAdminToken() ? '/admin' : '/admin/login');
  }, []);

  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <Link to={to} className="site-header__icon-btn" title="Espace professionnel" aria-label="Espace professionnel">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </Link>
  );
}
