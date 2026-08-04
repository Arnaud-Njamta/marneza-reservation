import { MARNEZA, NAV_LINKS, ODOO_SITE } from '@/lib/marneza-theme';

type Props = {
  activeOdooPath?: string;
};

function IconCart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <circle cx="9" cy="20" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none" />
      <path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.1h8.4a1.5 1.5 0 0 0 1.5-1.2L21 8H7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path
        d="M22 16.92v2.5a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.58 4.18 2 2 0 0 1 4.56 2h2.5a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SiteHeader({ activeOdooPath }: Props) {
  return (
    <header className="site-header">
      <div className="container-wide site-header__inner">
        <a href={ODOO_SITE} className="site-header__logo">
          <img src={MARNEZA.logo} alt="Marneza" width={120} height={40} />
        </a>

        <nav aria-label="Navigation principale">
          <ul className="site-header__nav">
            {NAV_LINKS.map((item) => {
              const isActive = activeOdooPath
                ? item.href.endsWith(activeOdooPath)
                : item.label === 'Accueil';
              return (
                <li key={item.label}>
                  <a href={item.href} className={isActive ? 'active' : undefined}>
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="site-header__actions">
          <div className="site-header__icons">
            <a
              href={`${ODOO_SITE}/shop/cart`}
              className="site-header__icon-btn"
              title="Panier"
              aria-label="Panier eCommerce"
            >
              <IconCart />
            </a>
            <a
              href={`${ODOO_SITE}/website/search`}
              className="site-header__icon-btn"
              title="Rechercher"
              aria-label="Rechercher"
            >
              <IconSearch />
            </a>
          </div>

          <a href={`tel:${MARNEZA.phone.replace(/\s/g, '')}`} className="site-header__phone">
            <IconPhone />
            <span>{MARNEZA.phone}</span>
          </a>

          <a href={`${ODOO_SITE}/web/login`} className="site-header__login">
            Se connecter
          </a>

          <a href={`${ODOO_SITE}/contactus`} className="btn btn-primary site-header__cta">
            Contactez-nous
          </a>
        </div>
      </div>
    </header>
  );
}
