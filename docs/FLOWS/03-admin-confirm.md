# Flux 03 — Confirmation admin (phase 1 sans paiement)

## Déclencheur

Admin clique « Confirmer » dans le dashboard (ou appel API direct)

## Chaîne d'appels

# Chaîne d'appels (mise à jour S7+S9)

```
POST /api/admin/bookings/:id/confirm
└── admin.controller.confirmBooking()
    ├── BookingService.confirm()
    └── runSyncOdooJob() → odoo.sync.service (async)
        └── Si ODOO_SYNC_ENABLED=false → log skipped
        └── Si true → res.partner + sale.order via JSON-RPC
```

## Phase 2

Après confirm → enqueue `sync-odoo.job.js`

## Auth

JWT admin requis en production (`REQUIRE_AUTH=true`)
