/**
 * Design tokens extraits de marneza.odoo.com (thème Odoo nano-1)
 * @see docs/FRONTEND.md
 */

export const ODOO_SITE = 'https://marneza.odoo.com';

export const MARNEZA = {
  colors: {
    primary: '#e33a07',
    primaryHover: '#ca3406',
    navLink: '#fb8f6f',
    dark: '#0d0d0d',
    body: '#212529',
    bodyBg: '#ffffff',
    footerLink: '#fb8f6f',
    border: '#dee2e6',
    muted: '#6c757d',
    cardBg: '#ffffff',
    selectedBg: '#fff4f0',
  },
  fonts: {
    body: 'var(--font-inter), "Inter", sans-serif',
    heading: 'var(--font-manrope), "Manrope", sans-serif',
  },
  logo: 'https://marneza.odoo.com/web/image/website/1/logo/Marneza?unique=922ae7c',
  phone: '+243 999 973 910',
  email: 'hello@marneza.com',
  address: "87 Av Maringa, Quartier Matanga Commune de Kasa Vubu, direction Asosa Kinshsa, RDC",
};

export const NAV_LINKS = [
  { label: 'Accueil', href: `${ODOO_SITE}/` },
  { label: 'Galerie', href: `${ODOO_SITE}/galerie` },
  { label: 'Salle de fête', href: `${ODOO_SITE}/shop` },
  { label: 'Nos Événements', href: `${ODOO_SITE}/nos-evenements` },
  { label: 'RDV Visite', href: `${ODOO_SITE}/rdv-visite` },
] as const;
