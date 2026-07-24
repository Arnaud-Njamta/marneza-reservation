import Image from 'next/image';
import Link from 'next/link';
import { AdminAccessLink } from '@/components/layout/AdminAccessLink';
import { MARNEZA, NAV_LINKS, ODOO_SITE } from '@/lib/marneza-theme';

type Props = {
  /** Mettre en surbrillance un lien menu Odoo */
  activeOdooPath?: string;
};

export function SiteHeader({ activeOdooPath }: Props) {
  return (
    <header className="site-header">
      <div className="container-wide site-header__inner">
        <Link href={ODOO_SITE} className="site-header__logo">
          <Image
            src={MARNEZA.logo}
            alt="Marneza"
            width={120}
            height={40}
            priority
            unoptimized
          />
        </Link>

        <nav aria-label="Navigation principale">
          <ul className="site-header__nav">
            {NAV_LINKS.map((item) => {
              const isActive = activeOdooPath && item.href.endsWith(activeOdooPath);
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
          <a href={`tel:${MARNEZA.phone.replace(/\s/g, '')}`} className="site-header__phone">
            {MARNEZA.phone}
          </a>
          <AdminAccessLink />
          <a href={`${ODOO_SITE}/web/login`} className="site-header__login">
            Se connecter
          </a>
          <a href={`${ODOO_SITE}/contactus`} className="btn btn-primary">
            Contactez-nous
          </a>
        </div>
      </div>
    </header>
  );
}
