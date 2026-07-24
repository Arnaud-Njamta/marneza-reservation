# Conception — Synthèses, templates, promos, tarifs, export

> Document de référence pour les nouvelles fonctionnalités admin (juillet 2026).

## Vue d'ensemble

| Fonctionnalité | Table BDD | Page admin |
|----------------|-----------|------------|
| Synthèse réservations (mois / 3 / 6 / 12) | `reminder_configs` | Dashboard + `/admin/settings` |
| Textes personnalisables (gras, italique…) | `email_templates` | Modal éditeur riche |
| Référence « synthèse » | `bookings.referenceNumber` + `reference_sequences` | Colonne tableau |
| Email « synthèse de réservation » | template `reservation_summary` | Paramètres |
| Codes promo | `promo_codes` | `/admin/pricing` |
| Tarifs personnel / entreprise | `pricing_rules.amountPersonnel` + `amountEntreprise` | `/admin/pricing` |
| Export Excel | — (génération à la volée) | Bouton dashboard |

---

## 1. Synthèse des réservations (remplace/étend les alertes J-3)

### Comportement

- L'admin définit des **profils de synthèse** en base (`reminder_configs`).
- Chaque profil a :
  - **Horizon** : mois en cours (`0`), +3, +6, +12 mois
  - **Filtres** : statuts (`paid`, `processing`, …), espaces (tous ou sélection)
  - **Affichage dashboard** : oui/non
  - **Email automatique** : oui/non + template associé

### UI dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ Synthèse des réservations          [Configurer ⚙] [Exporter] │
│ [Mois en cours] [3 mois] [6 mois] [12 mois]  ← onglets      │
├─────────────────────────────────────────────────────────────┤
│ 12 réservations · 4 espaces · 18 400 USD                    │
│ ┌──────────┬──────────┬─────────┬──────────┬────────────┐ │
│ │ Réf.     │ Client   │ Espace  │ Créneau  │ Montant    │ │
│ └──────────┴──────────┴─────────┴──────────┴────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

Bouton **Configurer** → popup moderne (voir §2).

Les alertes J-3 / J-1 / J-0 **restent** pour l'urgence opérationnelle ; la synthèse couvre la vision à moyen terme.

---

## 2. Éditeur de texte admin (popup)

### Accès

- Icône ⚙ sur chaque synthèse ou depuis Paramètres
- Liste des templates : synthèse email, rappel J-3, synthèse de réservation (ex-facture)

### Modal

```
┌──────────────────────────────────────────────────┐
│  Personnaliser le message                    ✕   │
├──────────────────────────────────────────────────┤
│  Objet : [Synthèse Marneza — {{resource}}]     │
│  ┌────────────────────────────────────────────┐  │
│  │ B  I  U  │ Arial ▾ │ 14px ▾ │ {{client}} │  │
│  ├────────────────────────────────────────────┤  │
│  │ Bonjour {{firstName}},                     │  │
│  │ Votre synthèse de réservation…             │  │
│  └────────────────────────────────────────────┘  │
│  Variables : {{reference}} {{amount}} {{period}} │
│  ☐ Utiliser le texte par défaut (sans mise forme)│
│                    [Annuler]  [Enregistrer]      │
└──────────────────────────────────────────────────┘
```

Stockage : HTML dans `email_templates.bodyHtml`. Si « texte par défaut » coché → le système utilise le gabarit codé mais avec `subject` personnalisé.

---

## 3. Référence réservation (ex « facture »)

### Format

```
JJ-MM-AAAA-NNNN-XXXX
```

Exemple : `17-07-2026-0042-KXFM`

| Partie | Description |
|--------|-------------|
| `17-07-2026` | Date de création (jour-mois-année) |
| `0042` | Incrément du jour (4 chiffres, unique par jour) |
| `KXFM` | 4 lettres majuscules aléatoires (unicité globale) |

Généré à la création (`createPending`). Affiché partout : admin, emails, export Excel, paiement.

### Renommage

| Avant | Après |
|-------|-------|
| Facture Marneza | Synthèse de réservation Marneza |
| Envoyer facture | Envoyer synthèse |
| `invoiceSentAt` | conservé en BDD (sémantique interne) |

---

## 4. Codes promo

### Table `promo_codes`

| Champ | Exemple |
|-------|---------|
| `code` | `MARNEZA20` (généré ou saisi) |
| `discountAmount` | `50` (USD, montant fixe) |
| `validFrom` / `validTo` | période validité |
| `maxUses` | `100` ou null = illimité |

### Flux client

1. Formulaire réservation → champ « Code promo »
2. `POST /api/pricing/validate-promo` → montant réduit affiché
3. À la création → `promoCodeId` + `promoDiscount` sur la booking

### Flux admin

- Bouton « Générer un code » sur `/admin/pricing`
- Choix montant réduction, validité, nombre d'utilisations

---

## 5. Tarifs personnel / entreprise

### Schéma

`pricing_rules` :
- `amountPersonnel` — tarif par défaut particulier
- `amountEntreprise` — tarif par défaut entreprise
- `amount` conservé temporairement (= personnel, migration)

`getQuote()` choisit selon `customerCategory`.

---

## 6. Export Excel

### Endpoint

```
GET /api/admin/bookings/export?from=2026-07-01&to=2026-07-31&status=paid
```

### Colonnes

| Colonne | Source |
|---------|--------|
| Référence | `referenceNumber` |
| Client | prénom + nom |
| Email | customer.email |
| Téléphone | customer.phone |
| Espace | resource.name |
| Type | bookingType.name |
| Début / Fin | startAt, endAt |
| Durée (h) | calculée |
| Catégorie | personnel / entreprise |
| Montant | totalAmount |
| Statut | status |
| Remarques | notes |

Format : `.xlsx` (bibliothèque `exceljs`).

---

## Fichiers créés / modifiés

| Fichier | Rôle |
|---------|------|
| `prisma/schema.prisma` | Nouveaux modèles |
| `services/reference.service.js` | Génération référence |
| `services/promo.service.js` | Codes promo |
| `services/synthesis.service.js` | Synthèse par horizon |
| `services/export.service.js` | Excel |
| `services/template.service.js` | Templates email |
| `routes/admin/settings.routes.js` | Config + templates |
| `components/admin/AdminSynthesis.tsx` | UI synthèse |
| `components/admin/RichTextEditor.tsx` | Éditeur popup |
| `components/admin/AdminPromoCodes.tsx` | Gestion promos |

---

## Phases de déploiement

1. **Phase A** — Schéma + référence + renommage synthèse email
2. **Phase B** — Tarifs dual + codes promo + champ client
3. **Phase C** — Synthèse configurable + éditeur templates
4. **Phase D** — Export Excel
