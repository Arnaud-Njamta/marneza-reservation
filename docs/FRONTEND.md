# Frontend — réservation (React + Vite)

## Stack

| Outil | Rôle |
|-------|------|
| React 19 | UI |
| Vite 6 | Build → fichiers statiques (`dist/`) |
| React Router 7 | Routes `/`, `/book/:slug`, `/admin/*` |

Alignement visuel Odoo : `src/lib/marneza-theme.ts`, `src/globals.css`

## Pages

| URL | Composant |
|-----|-----------|
| `/` | `pages/HomePage.tsx` |
| `/book/:slug` | `pages/BookPage.tsx` + `BookingWizard` |
| `/book/:slug/confirm/:id` | `pages/ConfirmPage.tsx` |
| `/admin/login` | `pages/admin/AdminLoginPage.tsx` |
| `/admin` | `pages/admin/AdminPage.tsx` |
| `/admin/calendar` | `pages/admin/AdminCalendarPage.tsx` |
| `/admin/pricing` | `pages/admin/AdminPricingPage.tsx` |
| `/admin/terms` | `pages/admin/AdminTermsPage.tsx` |
| `/admin/account` | `pages/admin/AdminAccountPage.tsx` |

## Lancer en dev

```bash
npm run dev:api   # port 4000
npm run dev:web   # port 3000
```

Variable : `VITE_API_URL=http://localhost:4000` (`apps/web/.env.development`)

## Build production (FileZilla)

```bash
npm run build --workspace=apps/web
```

Uploader `apps/web/dist/` sur l’hébergement web IONOS. Le fichier `public/.htaccess` gère le routage SPA (Apache).

Variable build : `VITE_API_URL=https://marneza.blconcept-yala.com` (`apps/web/.env.production`)
— même modèle que Yaya (`VITE_API_URL=https://yaya.blconcept-yala.com`).
