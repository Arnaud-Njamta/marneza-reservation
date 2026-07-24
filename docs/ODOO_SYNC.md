# Sync Odoo — Phase 2

## Objectif

Quand une réservation passe à `confirmed` :

1. Créer ou retrouver `res.partner` (client)
2. Créer `sale.order` avec le produit Odoo lié
3. Stocker `odoo_sale_order_id` sur la booking
4. Logger dans `odoo_sync_log`

## Mapping

| App | Odoo |
|-----|------|
| `customers.odoo_partner_id` | `res.partner.id` |
| `resources.odoo_product_id` | `product.product.id` |
| `bookings.odoo_sale_order_id` | `sale.order.id` |

## Produits actuels

| Resource | Produit Odoo |
|----------|--------------|
| espace-polyvalent | ESPACE POLYVALENT (ID à renseigner dans seed) |
| salle-conference | À créer dans Odoo |
| appartement | À créer dans Odoo |

## Configuration

```env
ODOO_URL=https://marneza.odoo.com
ODOO_DB=marneza
ODOO_USERNAME=
ODOO_API_KEY=
ODOO_SYNC_ENABLED=true
```

## Fichiers

- `apps/api/src/services/odoo/odoo.client.js` — JSON-RPC
- `apps/api/src/services/odoo/odoo.sync.service.js` — logique sync
- `apps/api/src/jobs/sync-odoo.job.js` — job async

## Flux

Voir [FLOWS/04-sync-odoo.md](FLOWS/04-sync-odoo.md)
