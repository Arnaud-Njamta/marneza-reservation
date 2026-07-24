# Flux 04 — Sync Odoo (phase 2)

## Déclencheur

Réservation passe à `confirmed`

## Chaîne d'appels

```
BookingService.confirm()
└── jobs/sync-odoo.job.js
    └── services/odoo/odoo.sync.service.js
        ├── odoo.client.js → res.partner create/search
        ├── odoo.client.js → sale.order create
        └── odoo_sync_log (traçabilité)
```

## Mapping détaillé

Voir [../ODOO_SYNC.md](../ODOO_SYNC.md)

## Retry

3 tentatives automatiques en cas d'échec réseau.
