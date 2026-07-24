# Lien Odoo Shop → App réservation (Option A)

## Principe

| Odoo (boutique) | App (réservation) |
|-----------------|-------------------|
| **Quel** espace (produit) | **Quand** (date + calendrier) |
| Prix affiché « à partir de » / promo | **Tarif exact** selon le créneau |
| Vitrine, menu Salle de fête | Anti double-réservation, hold 15 min |
| Facture finale (sync admin) | Type d'événement, coordonnées |

**Un produit Odoo = une ressource.** Le client ne re-choisit pas la salle dans l'app.

## URLs de réservation

| Produit Odoo | URL app (production) | URL avec contexte Odoo |
|--------------|----------------------|-------------------------|
| ESPACE POLYVALENT | `https://reserve.marneza.com/book/espace-polyvalent` | `…/book/espace-polyvalent?from=odoo` |
| Salle de conférence | `https://reserve.marneza.com/book/salle-conference` | `…?from=odoo` |
| Appartement | `https://reserve.marneza.com/book/appartement` | `…?from=odoo` |

En local : `http://localhost:3000/book/espace-polyvalent?from=odoo`

Le paramètre `?from=odoo` affiche le fil d'Ariane boutique → produit → dates.

## Configuration Odoo (à faire sur marneza.odoo.com)

### 1. Fiche produit ESPACE POLYVALENT

1. **Site** → **eCommerce** → ouvrir **ESPACE POLYVALENT**
2. **Modifier** la page produit
3. Remplacer ou compléter « Ajouter au panier » par un bouton principal :

**Texte :** `Réserver en ligne`  
**Lien :** `https://reserve.marneza.com/book/espace-polyvalent?from=odoo`

En local (tests) : `http://localhost:3000/book/espace-polyvalent?from=odoo`

### 2. Masquer la location Odoo native

Sur chaque produit réservable :

- Désactiver ou masquer le bloc **« Période de location »** (module Rental)
- Ne pas utiliser **« Ajouter au panier »** pour ces produits — il contourne le calendrier

Sans module custom (Odoo Online), options :

- Retirer le produit du type « location » si possible
- Masquer le widget rental via CSS personnalisé du thème
- Remplacer le bouton panier par le lien externe uniquement

### 3. Prix sur la boutique

Afficher sur Odoo un prix **indicatif** (ex. promo 1200 $ ou « à partir de 150 $ »).

Le **montant exact** est calculé dans l'app selon le type choisi :

| Type | ESPACE POLYVALENT (seed) |
|------|--------------------------|
| Heure | 150 USD |
| Journée | 800 USD |
| Soirée | 1025 USD |
| Full day | 1260 USD |

Mettre à jour les tarifs dans `apps/api/prisma/seed.js` ou en base (`pricing_rules`).

### 4. Bloc HTML (bouton personnalisé)

```html
<a href="https://reserve.marneza.com/book/espace-polyvalent?from=odoo"
   class="btn btn-primary btn-lg"
   style="width:100%; margin-top:1rem;">
  Réserver en ligne
</a>
<p class="text-muted small mt-2">
  Choisissez ensuite votre créneau et la date sur notre calendrier.
  Le tarif final dépend du type de location sélectionné.
</p>
```

### 5. Appartement (quand prêt)

Créer le produit Odoo → lien :

`https://reserve.marneza.com/book/appartement?from=odoo`

### 6. Publier

**Publier** chaque fiche produit après modification.

## Mapping produit ↔ ressource (base de données)

```sql
-- ID produit visible dans l'URL Odoo : .../shop/serv1-esp-espace-polyvalent-17
UPDATE resources SET odoo_product_id = 17 WHERE slug = 'espace-polyvalent';
```

Ou via seed : `apps/api/prisma/seed.js` puis `npm run db:seed`.

## Parcours client

```
marneza.odoo.com/shop
    → ESPACE POLYVALENT (prix promo affiché)
    → [Réserver en ligne]
    → reserve.marneza.com/book/espace-polyvalent?from=odoo
    → Type de location + date + coordonnées
    → Confirmation (hold 15 min)
    → Admin confirme → sync commande Odoo
```

## Menu « Salle de fête »

Le menu pointe vers `/shop`. Les produits redirigent vers l'app — pas besoin d'une page intermédiaire.

## Fichiers app concernés

| Fichier | Rôle |
|---------|------|
| `apps/web/src/lib/odoo-shop.ts` | URLs Odoo, prix min, détection `from=odoo` |
| `apps/web/src/app/book/[slug]/page.tsx` | Fil d'Ariane + bannière contexte Odoo |
| `apps/web/src/components/booking/BookingWizard.tsx` | Tarifs par créneau, pas de re-sélection salle |
