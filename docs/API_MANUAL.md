# Manuel API Marneza Reservation

> **Document de référence complet** — à lire comme un livre.  
> Public cible : développeur qui ne connaît pas le projet mais doit savoir **exactement** quel fichier, quelle ligne, quel appel.

**Version API :** 0.1.0  
**Base URL dev :** `http://localhost:4000`  
**Base URL prod :** `https://reserve.marneza.com`  
**Documentation interactive :** `GET /api/docs` (Swagger UI)

---

## Table des matières

1. [Comment démarrer](#1-comment-démarrer)
2. [Anatomie d'une requête HTTP](#2-anatomie-dune-requête-http)
3. [Carte des fichiers (index ligne par ligne)](#3-carte-des-fichiers-index-ligne-par-ligne)
4. [Routes publiques — chaîne d'appels détaillée](#4-routes-publiques--chaîne-dappels-détaillée)
5. [Routes admin — chaîne d'appels détaillée](#5-routes-admin--chaîne-dappels-détaillée)
6. [Service réservations (`booking.service.js`)](#6-service-réservations-bookingservicejs)
7. [Emails (`mail.service.js`)](#7-emails-mailservicejs)
8. [Jobs en arrière-plan](#8-jobs-en-arrière-plan)
9. [Sécurité (JWT admin + token client)](#9-sécurité-jwt-admin--token-client)
10. [Format des réponses et erreurs](#10-format-des-réponses-et-erreurs)
11. [Correspondance Frontend ↔ API](#11-correspondance-frontend--api)

---

## 1. Comment démarrer

### 1.1 Lancer l'API

```bash
# Depuis la racine du monorepo
npm run dev:api
```

| Étape | Fichier | Ligne | Action |
|-------|---------|-------|--------|
| 1 | `apps/api/src/index.js` | 14 | Charge `.env` via `load-env.js` |
| 2 | `apps/api/src/index.js` | 16 | Importe `app.js` (Express configuré) |
| 3 | `apps/api/src/index.js` | 54 | `app.listen(4000)` — serveur HTTP |
| 4 | `apps/api/src/index.js` | 61 | Job expiration créneaux (2 min) |
| 5 | `apps/api/src/index.js` | 64-65 | Job rappels J-3/J-1/J (1 h) |

### 1.2 Vérifier que l'API répond

```http
GET http://localhost:4000/api/health
```

Réponse :

```json
{ "status": "ok", "service": "marneza-reservation-api", "version": "0.1.0" }
```

**Chaîne :** `routes/index.js:34` → handler inline → `res.json(...)`

---

## 2. Anatomie d'une requête HTTP

Chaque requête suit **toujours** ce pipeline :

```
Client (navigateur / api-client.ts)
    │
    ▼
Express app.js
    │  L20 helmet() — en-têtes sécurité
    │  L21 cors() — origines autorisées (.env CORS_ORIGINS)
    │  L22 express.json() — parse body JSON
    ▼
routes/index.js  (/api/*)
    │
    ▼
routes/*.routes.js  (déclaration HTTP + middlewares)
    │
    ▼
controllers/*.js  (extrait req, appelle service, res.json)
    │
    ▼
services/*.js  (logique métier)
    │
    ▼
Prisma → MySQL (XAMPP)
    │
    ▼ (si erreur)
middlewares/error.middleware.js:8  → JSON { error: { code, message } }
```

### Pattern obligatoire dans chaque contrôleur

```javascript
async function maRoute(req, res, next) {
  try {
    const result = await monService.action(req.params, req.body);
    res.json({ data: result });      // succès → toujours { data: ... }
  } catch (err) {
    next(err);                        // erreur → error.middleware.js
  }
}
```

---

## 3. Carte des fichiers (index ligne par ligne)

Chemin racine API : `apps/api/src/`

### 3.1 Point d'entrée et configuration

| Fichier | Lignes | Rôle |
|---------|--------|------|
| `index.js` | 1-66 | Démarre Express + jobs cron |
| `app.js` | 1-33 | Middlewares globaux + montage `/api` |
| `config/load-env.js` | 1-15 | Charge `../../.env` (racine monorepo) |
| `config/env.js` | 1-61 | Variables d'environnement typées |
| `config/database.js` | 1-12 | Instance Prisma Client singleton |

### 3.2 Routes (déclaration HTTP)

| Fichier | Lignes | Préfixe URL |
|---------|--------|-------------|
| `routes/index.js` | 1-38 | `/api` |
| `routes/auth.routes.js` | 1-17 | `/api/auth` |
| `routes/resources.routes.js` | 1-30 | `/api/resources` |
| `routes/availability.routes.js` | 1-19 | `/api/resources/:slug/availability` |
| `routes/bookings.routes.js` | 1-44 | `/api/bookings` |
| `routes/pricing.routes.js` | 1-18 | `/api/pricing` |
| `routes/admin/bookings.routes.js` | 1-27 | `/api/admin/bookings` |
| `routes/admin/index.routes.js` | 1-27 | `/api/admin` (stats, calendar) |
| `routes/admin/pricing.routes.js` | 1-14 | `/api/admin/pricing` |

### 3.3 Contrôleurs (couche HTTP)

| Fichier | Lignes | Exporte |
|---------|--------|---------|
| `controllers/index.js` | 1-191 | Routes publiques (resources, bookings, pricing) |
| `controllers/admin.controller.js` | 1-266 | Routes admin |
| `controllers/auth.controller.js` | 1-28 | Login admin |

### 3.4 Services (logique métier)

| Fichier | Lignes | Responsabilité |
|---------|--------|----------------|
| `services/booking.service.js` | 1-590 | **Cœur** — workflow réservation |
| `services/availability.service.js` | 1-175 | Calendrier + anti-conflit |
| `services/slot-calculator.service.js` | 1-91 | Calcul startAt/endAt |
| `services/pricing.service.js` | 1-48 | Devis tarifaire |
| `services/mail.service.js` | 1-436 | Emails SMTP/Mailtrap |
| `services/resource.service.js` | 1-36 | Espaces réservables |
| `services/admin-calendar.service.js` | 1-89 | Calendrier admin |
| `services/admin-pricing.service.js` | 1-65 | Tarifs admin |
| `services/auth.service.js` | 1-92 | JWT admin |

### 3.5 Middlewares

| Fichier | Lignes | Usage |
|---------|--------|-------|
| `middlewares/auth.middleware.js` | 1-40 | JWT Bearer sur routes `/api/admin/*` |
| `middlewares/booking-access.middleware.js` | 1-35 | Token client sur routes `/api/bookings/:id/*` |
| `middlewares/error.middleware.js` | 1-24 | Gestion erreurs JSON |

### 3.6 Jobs (tâches planifiées)

| Fichier | Lignes | Schedule |
|---------|--------|----------|
| `jobs/expire-pending.job.js` | 1-30 | Toutes les 2 min — annule hold expiré |
| `jobs/booking-reminders.job.js` | 1-50 | Toutes les 1 h — emails J-3, J-1, J |
| `jobs/sync-odoo.job.js` | 1-14 | À la confirmation paiement (async) |

---

## 4. Routes publiques — chaîne d'appels détaillée

### 4.1 `POST /api/bookings` — Créer une réservation (hold 15 min)

**Frontend :** `apps/web/src/lib/api-client.ts:141-161` → `createBooking()`  
**Composant :** `apps/web/src/components/booking/BookingWizard.tsx:104-119`

| # | Fichier | Ligne(s) | Code / action |
|---|---------|----------|---------------|
| 1 | `routes/bookings.routes.js` | 23 | `router.post('/', ctrl.createBooking)` |
| 2 | `controllers/index.js` | 98-104 | `bookingService.createPending(req.body)` |
| 3 | `services/booking.service.js` | 81-213 | Validation → conflit → prix → client → INSERT |
| 3a | | 100-109 | Valide `customerCategory` (personnel/entreprise) |
| 3b | | 112-121 | Charge ressource par slug |
| 3c | | 136-141 | `slotCalculator.computeInterval()` — dates |
| 3d | | 145-149 | `availabilityService.assertNoConflict()` — 409 si pris |
| 3e | | 153-157 | `pricingService.getQuote()` — montant |
| 3f | | 159 | `expiresAt = now + 15 min` |
| 3g | | 163-206 | Upsert customer + INSERT booking status=`created` |
| 3h | | 203 | Génère `accessToken` (64 hex aléatoires) |
| 4 | `services/mail.service.js` | L213 sendClientBookingCreatedEmail | Email client avec lien sécurisé |
| 5 | `controllers/index.js` | 101 | `res.status(201).json({ data: booking })` |

**Body JSON attendu :**

```json
{
  "resourceSlug": "espace-polyvalent",
  "bookingTypeCode": "day",
  "date": "2026-07-20",
  "endDate": "2026-07-21",
  "startHour": "08:00",
  "eventType": "wedding",
  "customerCategory": "personnel",
  "companyName": null,
  "customer": {
    "email": "client@example.com",
    "phone": "+243...",
    "firstName": "Jean",
    "lastName": "Dupont"
  },
  "notes": "Optionnel"
}
```

---

### 4.2 `GET /api/bookings/:id` — Lire une réservation (page suivi)

**Frontend :** `api-client.ts:165-167` → `getBooking(id)`  
**Composant :** `ConfirmClient.tsx:56` (poll toutes les 3 s)

| # | Fichier | Ligne(s) | Action |
|---|---------|----------|--------|
| 1 | `routes/bookings.routes.js` | 31 | Middleware `requireBookingAccess` |
| 2 | `middlewares/booking-access.middleware.js` | 18-32 | Vérifie token query/header |
| 3 | `services/booking.service.js` | 220-248 | `assertAccessToken()` — voir §9 |
| 4 | `controllers/index.js` | 107-114 | `getById()` puis retire `accessToken` de la réponse |
| 5 | | 111 | `res.json({ data: safe })` — token jamais renvoyé au client après création |

**Token requis :** `?token=...` ou header `X-Booking-Token`

---

### 4.3 `POST /api/bookings/:id/submit` — Client confirme (conditions OK)

**Frontend :** `api-client.ts:175-179` → `submitBooking(id, true)`

| # | Fichier | Ligne(s) | Action |
|---|---------|----------|--------|
| 1 | `routes/bookings.routes.js` | 41 | `requireBookingAccess` + `ctrl.submitBooking` |
| 2 | `controllers/index.js` | 126-135 | Lit `termsAccepted` du body |
| 3 | `services/booking.service.js` | 283-324 | `submitByClient()` |
| 3a | | 267-271 | Erreur 400 si termsAccepted=false |
| 3b | | 273-277 | Erreur 400 si status ≠ `created` |
| 3c | | 279-283 | Erreur 400 si hold expiré |
| 3d | | 285-293 | UPDATE status=`processing`, `termsAcceptedAt=now` |
| 4 | `mail.service.js` | sendAdminNewBookingEmail | Notif admin |
| 5 | `mail.service.js` | sendClientSubmitConfirmedEmail | Email client + lien |

---

### 4.4 `POST /api/bookings/:id/claim-payment` — Client signale virement

**Frontend :** `api-client.ts:183-185`

| # | Fichier | Ligne(s) | Action |
|---|---------|----------|--------|
| 1 | `routes/bookings.routes.js` | 42 | Middleware + controller |
| 2 | `controllers/index.js` | 138-144 | `claimPaymentByClient(id)` |
| 3 | `services/booking.service.js` | 346-394 | |
| 3a | | 326-330 | Status doit être `processing` |
| 3b | | 332-336 | Facture doit être envoyée (`invoiceSentAt`) |
| 3c | | 338-342 | UPDATE `paymentClaimedAt=now` — **ne passe PAS en payé** |
| 4 | `mail.service.js` | sendAdminPaymentClaimedEmail | Admin vérifie son compte |

---

### 4.5 `POST /api/bookings/:id/cancel` — Annuler

| # | Fichier | Ligne(s) | Action |
|---|---------|----------|--------|
| 1 | `routes/bookings.routes.js` | 40 | |
| 2 | `controllers/index.js` | 104-110 | |
| 3 | `services/booking.service.js` | 243-258 | Status → `cancelled`, libère créneau |

---

### 4.6 `GET /api/resources/:slug/availability` — Calendrier disponibilités

**Frontend :** `api-client.ts:110-116` → `MonthCalendar.tsx`

| # | Fichier | Ligne(s) | Action |
|---|---------|----------|--------|
| 1 | `routes/index.js` | 24 | Montage sous `/resources/:slug/availability` |
| 2 | `controllers/index.js` | 38-50 | Query: `from`, `to`, `booking_type` |
| 3 | `services/availability.service.js` | getAvailability | Retourne `{ available: [], unavailable: [] }` |

---

### 4.7 `GET /api/pricing/quote` — Devis prix

**Frontend :** `api-client.ts:121-131` → `BookingWizard.tsx:70`

| # | Fichier | Ligne(s) | Action |
|---|---------|----------|--------|
| 1 | `controllers/index.js` | 55-80 | Résout bookingType + appelle pricing |
| 2 | `services/pricing.service.js` | getQuote | Lit `pricing_rules` en BDD |

---

### 4.8 `POST /api/auth/login` — Connexion admin

**Frontend :** `apps/web/src/lib/auth.ts`

| # | Fichier | Ligne(s) | Action |
|---|---------|----------|--------|
| 1 | `routes/auth.routes.js` | 14 | `auth.login` |
| 2 | `controllers/auth.controller.js` | login | |
| 3 | `services/auth.service.js` | login | bcrypt + JWT 7 jours |

---

## 5. Routes admin — chaîne d'appels détaillée

> **Toutes** les routes `/api/admin/*` passent par `middlewares/auth.middleware.js:10`  
> Header requis : `Authorization: Bearer <jwt>`

### 5.1 `GET /api/admin/bookings` — Liste réservations

**Frontend :** `api-client.ts:196-198` → `AdminDashboard.tsx:75`

| # | Fichier | Ligne(s) | Action |
|---|---------|----------|--------|
| 1 | `routes/admin/bookings.routes.js` | 13 | `router.use(auth)` puis L15 |
| 2 | `controllers/admin.controller.js` | 35-53 | Prisma findMany + feeLines |
| 3 | | 49 | Retire `accessToken` de chaque booking |

Query optionnelle : `?status=processing`

---

### 5.2 `POST /api/admin/bookings/:id/send-invoice` — Envoyer facture

**Frontend :** `api-client.ts:207-208`

| # | Fichier | Ligne(s) | Action |
|---|---------|----------|--------|
| 1 | `routes/admin/bookings.routes.js` | 18 | |
| 2 | `controllers/admin.controller.js` | 77-83 | |
| 3 | `services/booking.service.js` | 326-344 | Status=`processing` requis |
| 4 | `services/booking.service.js` | 333 | UPDATE `invoiceSentAt=now` |
| 5 | `services/mail.service.js` | L305 sendClientInvoiceEmail | Facture + virement + **lien client** |

---

### 5.3 `POST /api/admin/bookings/:id/confirm-payment` — Confirmer paiement reçu

**Frontend :** `api-client.ts:212-213`

| # | Fichier | Ligne(s) | Action |
|---|---------|----------|--------|
| 1 | `routes/admin/bookings.routes.js` | 19 | |
| 2 | `controllers/admin.controller.js` | 89-98 | |
| 3 | `services/booking.service.js` | 397-441 | Transaction Prisma |
| 3a | | 407-414 | UPDATE status=`paid`, `accessTokenExpiresAt=now+24h` |
| 3b | | 417-426 | INSERT table `payments` provider=`manual` |
| 4 | `jobs/sync-odoo.job.js` | runSyncOdooJob | Async si ODOO_SYNC_ENABLED |
| 5 | `mail.service.js` | sendClientPaymentConfirmedEmail | Client notifié + lien (24h restantes) |

---

### 5.4 `PATCH /api/admin/bookings/:id` — Modifier créneau + frais

**Frontend :** `api-client.ts:246-259` → `BookingEditPanel.tsx`

| # | Fichier | Ligne(s) | Action |
|---|---------|----------|--------|
| 1 | `routes/admin/bookings.routes.js` | 24 | |
| 2 | `controllers/admin.controller.js` | 157-170 | Body: startAt, endAt, feeLines, notes |
| 3 | `services/booking.service.js` | 493-578 | modifyByAdmin() |
| 3a | | 486-493 | Vérifie conflit si dates changent |
| 3b | | 505-520 | Recrée `booking_fee_lines` |
| 3c | | 522 | Recalcule `totalAmount = quoted + frais` |

---

### 5.5 `GET /api/admin/bookings/:id/secure-link` — Lien client pour admin

**Frontend :** `api-client.ts:263-265` → bouton « Lien client »

| # | Fichier | Ligne(s) | Action |
|---|---------|----------|--------|
| 1 | `routes/admin/bookings.routes.js` | 25 | |
| 2 | `controllers/admin.controller.js` | 176-186 | |
| 3 | `utils/booking-url.js` | 7-8 | `{APP_URL}/book/{slug}/confirm/{id}?token={accessToken}` |

---

### 5.6 Autres routes admin (résumé)

| Route | Route L# | Controller L# | Service |
|-------|----------|---------------|---------|
| `GET /admin/stats` | index.routes:25 | admin:205-222 | Prisma count |
| `GET /admin/calendar` | index.routes:19 | admin:176-186 | admin-calendar.service |
| `GET /admin/bookings/upcoming` | bookings:16 | admin:193-199 | admin-calendar.getUpcoming |
| `PATCH /admin/bookings/:id/amount` | bookings:23 | admin:126-133 | booking.updateAmount |
| `PATCH /admin/bookings/:id/status` | bookings:22 | admin:112-119 | booking.updateStatus |
| `POST /admin/bookings/:id/refuse` | bookings:21 | admin:99-105 | booking.refuse |
| `POST /admin/bookings/:id/cancel` | bookings:20 | admin:87-93 | booking.cancel |
| `GET /admin/pricing` | pricing.routes | admin:228-234 | admin-pricing.listAll |
| `PATCH /admin/pricing/:id` | pricing.routes | admin:241-247 | admin-pricing.updateRule |

---

## 6. Service réservations (`booking.service.js`)

Fichier le plus important : **590 lignes**. Index des fonctions :

| Fonction | Lignes | Description |
|----------|--------|-------------|
| `bookingInclude()` | 56-64 | Relations Prisma à charger |
| `generateAccessToken()` | 66-68 | 32 bytes hex — lien sécurisé |
| `createPending(data)` | 81-213 | Création hold 15 min |
| `linkExpiryDate()` | 204-206 | now + BOOKING_LINK_EXPIRE_HOURS |
| `assertAccessToken(id, token)` | 208-249 | Vérifie token + expiration |
| `getById(id)` | 251-264 | Lecture avec relations |
| `cancel(id)` | 266-281 | Annulation |
| `submitByClient(id, opts)` | 283-324 | Client confirme → processing |
| `sendInvoiceByAdmin(id)` | 326-344 | Admin envoie facture |
| `claimPaymentByClient(id)` | 346-394 | Client signale paiement |
| `confirmPaymentByAdmin(id)` | 397-441 | Admin confirme → paid |
| `refuse(id)` | 416-429 | Refus admin |
| `updateStatus(id, status)` | 431-461 | Changement statut manuel |
| `updateAmount(id, data)` | 463-491 | Ajustement tarif |
| `modifyByAdmin(id, data)` | 493-578 | Modification complète |
| `markAsProcessingFromEmail(id)` | 580-594 | Lien email admin review |

### Machine à états (statuts booking)

```
created ──submit──► processing ──confirmPayment──► paid ──► fulfilled
   │                    │                              │
   │                    ├──sendInvoice──► (email)     │
   │                    ├──claimPayment──► (signal)   │
   │                    │                              │
   └──cancel/expire──► cancelled              refuse ─► refused
```

| Statut | Signification | Créneau bloqué ? |
|--------|---------------|------------------|
| `created` | Hold 15 min, en attente confirmation client | Oui |
| `processing` | Demande confirmée, en attente paiement | Oui |
| `paid` | Paiement confirmé par admin | Oui |
| `fulfilled` | Prestation réalisée | Oui |
| `cancelled` | Annulée | Non |
| `refused` | Refusée par admin | Non |

---

## 7. Emails (`mail.service.js`)

| Fonction | Ligne ~ | Déclenché par | Destinataire |
|----------|---------|---------------|--------------|
| `sendClientBookingCreatedEmail` | 213 | createPending | Client — lien + 15 min |
| `sendClientSubmitConfirmedEmail` | 246 | submitByClient | Client — lien suivi |
| `sendAdminNewBookingEmail` | 157 | submitByClient | Admin |
| `sendClientInvoiceEmail` | 305 | sendInvoiceByAdmin | Client — facture + virement |
| `sendAdminPaymentClaimedEmail` | 361 | claimPaymentByClient | Admin |
| `sendClientPaymentConfirmedEmail` | 385 | confirmPaymentByAdmin | Client — lien (expire 24h) |
| `sendBookingReminderEmails` | 422 | job reminders | Admin + Client |

Configuration : `.env` → `MAIL_ENABLED`, `SMTP_*`, `ADMIN_NOTIFICATION_EMAIL`

---

## 8. Jobs en arrière-plan

### 8.1 Expiration hold (`expire-pending.job.js`)

| Ligne | Action |
|-------|--------|
| 15-20 | `UPDATE bookings SET status='cancelled' WHERE status='created' AND expiresAt < now()` |
| Planifié | `index.js:61` — toutes les **2 minutes** |

### 8.2 Rappels (`booking-reminders.job.js`)

| Ligne | Action |
|-------|--------|
| 22-48 | Pour chaque booking `paid`, calcule J-3, J-1, jour-J |
| Planifié | `index.js:64-65` — toutes les **1 heure** |

---

## 9. Sécurité (JWT admin + token client)

### 9.1 Admin — JWT Bearer

```
Fichier : middlewares/auth.middleware.js
Ligne 17 : Lit header Authorization: Bearer <token>
Ligne 26 : authService.verifyToken(token)
Ligne 27 : req.user = utilisateur connecté
```

Si `REQUIRE_AUTH=false` (dev) : middleware laisse passer sans token.

### 9.2 Client — Token par réservation

```
Fichier : middlewares/booking-access.middleware.js
Ligne 9-15  : Extrait token (query ?token=, header X-Booking-Token, body)
Ligne 26-27 : bookingService.assertAccessToken(id, token)

Fichier : services/booking.service.js
Ligne 220-248 : assertAccessToken — Bloque si cancelled/refused
Ligne 244-248 : Bloque si accessTokenExpiresAt < now (24h après paiement)
Ligne 250+ : Comparaison timing-safe du token
```

**Le token n'est jamais exposé dans les listes admin** (`admin.controller.js:49`).

---

## 10. Format des réponses et erreurs

### Succès

```json
{ "data": { ... } }
```

HTTP 201 pour création (`POST /api/bookings`).

### Erreur

```json
{
  "error": {
    "code": "SLOT_CONFLICT",
    "message": "Ce créneau est déjà réservé..."
  }
}
```

| HTTP | code | Origine typique |
|------|------|-----------------|
| 400 | — | Validation métier (`err.statusCode = 400`) |
| 401 | UNAUTHORIZED | JWT admin manquant |
| 403 | — | Token client invalide/expiré |
| 404 | — | Ressource/booking introuvable |
| 409 | SLOT_CONFLICT | availability.service.js:70 |
| 409 | SLOT_BLOCKED | availability.service.js:77 |
| 500 | INTERNAL_ERROR | Erreur non gérée |

Gestion centralisée : `middlewares/error.middleware.js:8-21`

---

## 11. Correspondance Frontend ↔ API

Fichier unique côté web : `apps/web/src/lib/api-client.ts`

| Fonction frontend | Ligne | Route API |
|-------------------|-------|-----------|
| `getResource(slug)` | 100 | GET /api/resources/:slug |
| `getAvailability(...)` | 110 | GET /api/resources/:slug/availability |
| `getQuote(...)` | 121 | GET /api/pricing/quote |
| `createBooking(data)` | 141 | POST /api/bookings |
| `getBooking(id)` | 165 | GET /api/bookings/:id |
| `submitBooking(id)` | 175 | POST /api/bookings/:id/submit |
| `claimPayment(id)` | 183 | POST /api/bookings/:id/claim-payment |
| `cancelBooking(id)` | 170 | POST /api/bookings/:id/cancel |
| `adminListBookings()` | 196 | GET /api/admin/bookings |
| `adminSendInvoice(id)` | 207 | POST /api/admin/bookings/:id/send-invoice |
| `adminConfirmPayment(id)` | 212 | POST /api/admin/bookings/:id/confirm-payment |
| `adminModifyBooking(id)` | 246 | PATCH /api/admin/bookings/:id |
| `adminGetSecureLink(id)` | 263 | GET /api/admin/bookings/:id/secure-link |
| `adminGetCalendar(...)` | 273 | GET /api/admin/calendar |
| `adminGetUpcoming()` | 268 | GET /api/admin/bookings/upcoming |

Proxy dev : `apps/web/next.config.js` rewrite `/api/*` → `localhost:4000/api/*`

---

## Annexe A — Schéma Prisma

Fichier : `apps/api/prisma/schema.prisma`  
Doc complémentaire : `docs/DATABASE.md`

Table centrale : `bookings` (modèle `Booking`, ligne ~128)

---

## Annexe B — Flux métier détaillés

| Flux | Document |
|------|----------|
| Création réservation | `docs/FLOWS/01-create-booking.md` |
| Expiration 15 min | `docs/FLOWS/02-hold-expiration.md` |
| Workflow admin | `docs/FLOWS/03-admin-confirm.md` |
| Sync Odoo | `docs/FLOWS/04-sync-odoo.md` |
| Disponibilités | `docs/FLOWS/05-availability-check.md` |

---

## Annexe C — Variables `.env` essentielles

| Variable | Fichier lu | Ligne env.js | Usage |
|----------|------------|--------------|-------|
| `DATABASE_URL` | config/env.js | 15 | MySQL XAMPP |
| `API_PORT` | config/env.js | 12 | Port 4000 |
| `JWT_SECRET` | config/env.js | 20 | Tokens admin |
| `BOOKING_HOLD_MINUTES` | config/env.js | 17 | Hold 15 min |
| `BOOKING_LINK_EXPIRE_HOURS` | config/env.js | 18 | Expiration lien après payé |
| `MAIL_ENABLED` | config/env.js | 34 | Emails on/off |
| `ADMIN_NOTIFICATION_EMAIL` | config/env.js | 23 | Destinataire admin |

---

*Dernière mise à jour : juillet 2026 — généré pour Marneza Reservation v0.1.0*
