# API Routes — Index rapide

> **Manuel complet (livre détaillé ligne par ligne) :** [API_MANUAL.md](./API_MANUAL.md)

Base URL : `http://localhost:4000` (dev) | `https://reserve.marneza.com` (prod)

## Public

| Méthode | Route | Route fichier (L#) | Controller (L#) | Service | Auth |
|---------|-------|-------------------|-------------------|---------|------|
| GET | `/api/health` | routes/index.js:34 | inline | — | Public |
| POST | `/api/auth/login` | auth.routes.js:14 | auth.controller | auth.service | Public |
| GET | `/api/auth/me` | auth.routes.js:15 | auth.controller | auth.service | JWT |
| GET | `/api/resources` | resources.routes.js:20 | index.js:18 | resource.service | Public |
| GET | `/api/resources/:slug` | resources.routes.js:28 | index.js:27 | resource.service | Public |
| GET | `/api/resources/:slug/availability` | availability.routes.js | index.js:38 | availability.service | Public |
| GET | `/api/pricing/quote` | pricing.routes.js | index.js:55 | pricing.service | Public |
| POST | `/api/bookings` | bookings.routes.js:23 | index.js:85 | booking.createPending | Public |
| GET | `/api/bookings/:id` | bookings.routes.js:31 | index.js:94 | booking.getById | Token client |
| POST | `/api/bookings/:id/submit` | bookings.routes.js:41 | index.js:113 | booking.submitByClient | Token client |
| POST | `/api/bookings/:id/claim-payment` | bookings.routes.js:42 | index.js:125 | booking.claimPaymentByClient | Token client |
| POST | `/api/bookings/:id/cancel` | bookings.routes.js:40 | index.js:104 | booking.cancel | Token client |
| GET | `/api/bookings/:id/admin-review` | bookings.routes.js:32 | index.js:134 | mail + booking | JWT email |

## Admin (JWT Bearer requis)

| Méthode | Route | Route fichier (L#) | Controller (L#) | Service |
|---------|-------|-------------------|-------------------|---------|
| GET | `/api/admin/bookings` | admin/bookings.routes.js:15 | admin:18 | Prisma |
| GET | `/api/admin/bookings/upcoming` | admin/bookings.routes.js:16 | admin:193 | admin-calendar |
| GET | `/api/admin/bookings/:id` | admin/bookings.routes.js:17 | admin:42 | Prisma |
| GET | `/api/admin/bookings/:id/secure-link` | admin/bookings.routes.js:25 | admin:159 | booking-url |
| POST | `/api/admin/bookings/:id/send-invoice` | admin/bookings.routes.js:18 | admin:60 | booking.sendInvoice |
| POST | `/api/admin/bookings/:id/confirm-payment` | admin/bookings.routes.js:19 | admin:72 | booking.confirmPayment |
| POST | `/api/admin/bookings/:id/cancel` | admin/bookings.routes.js:20 | admin:87 | booking.cancel |
| POST | `/api/admin/bookings/:id/refuse` | admin/bookings.routes.js:21 | admin:99 | booking.refuse |
| PATCH | `/api/admin/bookings/:id/status` | admin/bookings.routes.js:22 | admin:112 | booking.updateStatus |
| PATCH | `/api/admin/bookings/:id/amount` | admin/bookings.routes.js:23 | admin:126 | booking.updateAmount |
| PATCH | `/api/admin/bookings/:id` | admin/bookings.routes.js:24 | admin:140 | booking.modifyByAdmin |
| GET | `/api/admin/calendar` | admin/index.routes.js:19 | admin:176 | admin-calendar |
| GET | `/api/admin/stats` | admin/index.routes.js:25 | admin:205 | Prisma count |
| GET | `/api/admin/pricing` | admin/pricing.routes.js | admin:228 | admin-pricing |
| PATCH | `/api/admin/pricing/:id` | admin/pricing.routes.js | admin:241 | admin-pricing |

## Jobs (internes, pas HTTP)

| Job | Schedule | Fichier | Ligne clé |
|-----|----------|---------|-----------|
| expire-pending | 2 min | jobs/expire-pending.job.js:15 | created expiré → cancelled |
| booking-reminders | 1 h | jobs/booking-reminders.job.js:22 | J-3, J-1, jour-J |
| sync-odoo | on confirm | jobs/sync-odoo.job.js | Après paiement confirmé |

## OpenAPI

Documentation interactive : **GET /api/docs** (`app.js:25`)

## Codes erreur

| HTTP | code | Signification |
|------|------|---------------|
| 400 | — | Données invalides |
| 401 | UNAUTHORIZED | JWT admin manquant |
| 403 | — | Token client invalide/expiré |
| 404 | — | Introuvable |
| 409 | SLOT_CONFLICT | Créneau déjà pris |
| 409 | SLOT_BLOCKED | Maintenance / fermeture |

Gestion : `middlewares/error.middleware.js:8`
