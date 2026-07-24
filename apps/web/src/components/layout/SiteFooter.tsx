import { MARNEZA, ODOO_SITE } from '@/lib/marneza-theme';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container-wide site-footer__grid">
        <div>
          <h4>Au plus près de vous</h4>
          <p>
            Nous mettons à votre disposition des espaces élégants et modulables pour tous vos
            événements : mariages, anniversaires, séminaires et réceptions privées. Notre priorité
            est de vous offrir une expérience unique.
          </p>
          <a href={`${ODOO_SITE}/contactus`} className="btn btn-primary">
            Nous contacter
          </a>
        </div>

        <div className="site-footer__contact">
          <h4>Marneza M&apos;s Event</h4>
          <p>{MARNEZA.address}</p>
          <ul>
            <li>
              <a href={`tel:${MARNEZA.phone.replace(/\s/g, '')}`}>{MARNEZA.phone}</a>
            </li>
            <li>
              <a href={`mailto:${MARNEZA.email}`}>{MARNEZA.email}</a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
