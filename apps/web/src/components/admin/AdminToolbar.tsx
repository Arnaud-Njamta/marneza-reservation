'use client';

import { Link, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { getAdminUser, logoutAdmin } from '@/lib/auth';
import type { AuthUser } from '@/types/api';
import { formatLastSync, useAdminRefresh } from '@/components/admin/AdminRefreshContext';

const TABS = [
  { href: '/admin', label: 'Réservations' },
  { href: '/admin/calendar', label: 'Calendrier' },
  { href: '/admin/pricing', label: 'Tarifs' },
  { href: '/admin/terms', label: 'Conditions' },
];

function initials(user: AuthUser) {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}

export function AdminToolbar() {
  const { pathname } = useLocation();
  const { lastUpdatedAt, isRefreshing, refreshNow } = useAdminRefresh();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(getAdminUser());
  }, [pathname]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', onClickOutside);
      return () => document.removeEventListener('mousedown', onClickOutside);
    }
  }, [menuOpen]);

  if (pathname === '/admin/login') {
    return null;
  }

  return (
    <div className="admin-toolbar">
      <div className="container-wide admin-toolbar__inner">
        <div className="admin-toolbar__brand">
          <span className="admin-toolbar__badge">Admin</span>
          <span className="admin-toolbar__title">Marneza</span>
        </div>

        <nav className="admin-toolbar__tabs" aria-label="Navigation admin">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                to={tab.href}
                className={`admin-toolbar__tab ${active ? 'active' : ''}`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className={`admin-sync-btn ${isRefreshing ? 'is-syncing' : ''}`}
          onClick={() => refreshNow({ silent: true })}
          title="Actualiser les données"
        >
          <span className="admin-sync-btn__icon" aria-hidden="true">↻</span>
          <span className="admin-sync-btn__label">
            {isRefreshing ? 'Sync…' : formatLastSync(lastUpdatedAt) ?? 'Sync auto'}
          </span>
        </button>

        <div className="admin-toolbar__actions" ref={menuRef}>
          <button
            type="button"
            className="admin-user-trigger"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <span className="admin-user-trigger__avatar">
              {user ? initials(user) : '…'}
            </span>
            <span className="admin-user-trigger__info">
              <span className="admin-user-trigger__name">
                {user ? `${user.firstName} ${user.lastName}` : 'Compte'}
              </span>
              <span className="admin-user-trigger__role">Équipe Marneza</span>
            </span>
            <span className={`admin-user-trigger__chevron ${menuOpen ? 'open' : ''}`} aria-hidden="true">
              ▾
            </span>
          </button>

          {menuOpen && (
            <div className="admin-user-menu" role="menu">
              {user && (
                <div className="admin-user-menu__header">
                  <span className="admin-user-menu__avatar">{initials(user)}</span>
                  <div>
                    <strong>
                      {user.firstName} {user.lastName}
                    </strong>
                    <span>{user.email}</span>
                  </div>
                </div>
              )}
              <div className="admin-user-menu__divider" />
              <Link
                to="/admin/account"
                className="admin-user-menu__item"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                Mon compte
              </Link>
              <Link to="/" className="admin-user-menu__item" role="menuitem" onClick={() => setMenuOpen(false)}>
                Voir le site public
              </Link>
              <button
                type="button"
                className="admin-user-menu__item admin-user-menu__item--danger"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  logoutAdmin();
                }}
              >
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
