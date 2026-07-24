# Marneza Reservation

Application de réservation de salles et appartements — **reserve.marneza.com**

Connectée à Odoo ([marneza.odoo.com/shop](https://marneza.odoo.com/shop)) pour produits, clients et facturation.

## Stack

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 15 |
| Backend | Node.js + Express |
| BDD | MySQL / MariaDB (XAMPP) |
| ORM | Prisma |
| Cache | Redis 7 |
| Sync Odoo | Phase 2 (BullMQ) |

## Démarrage rapide (XAMPP)

```bash
# 1. Copier la config
copy .env.example .env

# 2. XAMPP : démarrer Apache + MySQL dans le panneau de contrôle

# 3. Créer la base (phpMyAdmin → SQL, ou fichier prisma/scripts/create-database-mysql.sql)
#    CREATE DATABASE marneza_reservation CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 4. Installer + base de données
npm install
npm run db:setup:xampp

# 5. Lancer l'API (port 4000)
npm run dev:api

# 6. Lancer le frontend (port 3000)
npm run dev:web
```

**Connexion par défaut** dans `.env` :
`mysql://root@localhost:3306/marneza_reservation`  
Si `root` a un mot de passe XAMPP : `mysql://root:VOTRE_MDP@localhost:3306/marneza_reservation`

Redis est optionnel en dev. Pour Redis via Docker : `npm run docker:up`.

## URLs locales

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API Health | http://localhost:4000/api/health |
| API Docs (OpenAPI) | http://localhost:4000/api/docs |
| Prisma Studio | `npm run db:studio` |

## Documentation

| Fichier | Contenu |
|---------|---------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Vue d'ensemble système |
| [docs/API_MANUAL.md](docs/API_MANUAL.md) | **Manuel API complet** (ligne par ligne) |
| [docs/API_ROUTES.md](docs/API_ROUTES.md) | Carte routes ↔ appelants |
| [docs/DATABASE.md](docs/DATABASE.md) | Schéma + règles métier |
| [docs/ODOO_SYNC.md](docs/ODOO_SYNC.md) | Mapping Odoo (phase 2) |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production |
| [docs/FLOWS/](docs/FLOWS/) | Flux métier détaillés |

## Ressources réservables

| Slug | Type |
|------|------|
| `espace-polyvalent` | Salle — heure, journée, soirée, full day |
| `salle-conference` | Conférence — mêmes créneaux |
| `appartement` | Jour 08h–18h, Nuit 18h–08h |

## Structure

```
marneza-reservation/
├── apps/api/     # Backend Express
├── apps/web/     # Frontend Next.js
├── docs/         # Documentation architecture
└── docker-compose.yml
```
