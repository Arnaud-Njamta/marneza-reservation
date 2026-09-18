# CODEMAP — orientation passation BL Concept

Cartes rapides pour retrouver le code. Détail Word : `docs/passation/`.

## Marneza Reservation

| Zone | Chemin |
|------|--------|
| API entrée | `apps/api/src/index.js` → `app.js` → `routes/index.js` |
| Métier | `apps/api/src/services/` |
| BDD | `apps/api/prisma/schema.prisma` |
| Front routes | `apps/web/src/App.tsx` |
| Appels HTTP | `apps/web/src/lib/api-client.ts` |
| Prod API | VPS `/var/www/marneza-reservation` — PM2 `marneza-api` :4000 |
| Prod front | `booking.marneza.com` (FileZilla `dist/`) |

## Yaya / Collecte Taxes

| Zone | Chemin |
|------|--------|
| Monorepo | `c:\Dev\collecte-taxes-rdc\` |
| API entrée | `backend/src/index.ts` → `app.ts` → `modules/*` |
| Front | `frontend/src/App.tsx` |
| Mobile | `mobile/` (Expo — Android Studio) |
| SQL | `database/` |
| Prod API | `/var/www/backend` — PM2 `collecte-taxes-api` :3001 |
| Docs | `Documentation/` + `docs/passation/PASSATION_Yaya_*` |

## GEUTZ (site vitrine)

| Zone | Chemin |
|------|--------|
| Travail | `c:\Users\infos\Documents\Projets\geutz.com\public_html\` |
| Menu / footer | `partials/header.html`, `partials/footer.html` |
| Styles | `assets/css/style.css` |
| Accueil | `index.html` |
| Contact | `contact-us.html` + `send-contact.php` |
| Passation | `Documentation/PASSATION_Geutz_BL_Concept.docx` |

Les en-têtes de commentaires dans ces fichiers d’entrée répètent la même carte.
