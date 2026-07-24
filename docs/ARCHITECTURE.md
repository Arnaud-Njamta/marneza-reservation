# Architecture — Marneza Reservation

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│  marneza.odoo.com                                           │
│  ├── /shop          → Vitrine produits (ESPACE POLYVALENT…)  │
│  └── Bouton Réserver → reserve.marneza.com/book/:slug       │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  reserve.marneza.com (Next.js)                              │
│  └── api-client.ts → /api/*                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  API Express (Node.js) — port 4000                        │
│  ├── AvailabilityService  → anti-conflit intervalles        │
│  ├── BookingService       → hold 15 min (Option C)          │
│  └── OdooSyncService      → phase 2                         │
└──────────┬─────────────────────────────┬────────────────────┘
           │                             │
    ┌──────▼──────┐               ┌──────▼──────┐
    │ PostgreSQL  │               │   Redis     │
    │ (source de  │               │ (cache/jobs)│
    │  vérité     │               └─────────────┘
    │  dispo)     │
    └─────────────┘
           │
    ┌──────▼──────────────────────────┐
    │ Odoo Online (phase 2)           │
    │ res.partner, sale.order, invoice│
    └─────────────────────────────────┘
```

## Source de vérité

| Donnée | Système maître |
|--------|----------------|
| Disponibilités / conflits | **App** (PostgreSQL) |
| Produits / catalogue | **Odoo** (miroir en app) |
| Clients | **App** → sync Odoo |
| Facturation | **Odoo** (phase 2) |

## Règle anti-conflit

Deux réservations sur la même ressource sont incompatibles si leurs intervalles `[start_at, end_at)` se chevauchent.

Statuts bloquants : `pending` (hold 15 min) + `confirmed`.

## Documentation code

Chaque route Express documente : `@route`, `@calledBy`, `@calls`, `@db`, `@flow`.

Voir `docs/API_ROUTES.md` et `docs/FLOWS/`.
