# API Marneza Reservation

Backend Express + Prisma + MySQL pour le système de réservation Marneza.

## Documentation

| Document | Contenu |
|----------|---------|
| **[docs/API_MANUAL.md](../../docs/API_MANUAL.md)** | **Manuel complet** — chaîne d'appels ligne par ligne, comme un livre |
| [docs/API_ROUTES.md](../../docs/API_ROUTES.md) | Index rapide des routes |
| [docs/DATABASE.md](../../docs/DATABASE.md) | Schéma Prisma |
| [docs/FLOWS/](../../docs/FLOWS/) | Flux métier détaillés |

## Démarrage

```bash
# Depuis la racine du monorepo
npm run dev:api
```

- Health : http://localhost:4000/api/health
- Swagger : http://localhost:4000/api/docs

## Structure `src/`

```
src/
├── index.js              ← Point d'entrée (L14 load-env, L54 listen, L61 jobs)
├── app.js                ← Express + middlewares (L20-31)
├── config/               ← env, database, load-env
├── routes/               ← Déclaration HTTP (URL → controller)
│   ├── index.js          ← Agrégateur /api/*
│   ├── bookings.routes.js
│   └── admin/
├── controllers/          ← Couche HTTP (req/res → service)
├── services/             ← Logique métier
│   └── booking.service.js  ← CŒUR (590 lignes)
├── middlewares/          ← auth JWT, token client, erreurs
├── jobs/                 ← Tâches planifiées
└── utils/                ← Helpers (dates, intervals, URLs)
```

## Pattern de code

```
Route (routes/*.js)
  → Controller (controllers/*.js)     — parse req, res.json({ data })
    → Service (services/*.js)         — règles métier
      → Prisma (config/database.js)   — MySQL
```

## Fichier le plus important

`services/booking.service.js` — voir index des fonctions dans le header du fichier et dans [API_MANUAL.md §6](../../docs/API_MANUAL.md#6-service-réservations-bookingservicejs).
