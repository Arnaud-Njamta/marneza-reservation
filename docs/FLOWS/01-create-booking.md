# Flux 01 — Création réservation (hold 15 min)

## Déclencheur

Client clique « Continuer » sur `reserve.marneza.com/book/:slug`

## Chaîne d'appels

```
1. web/src/app/book/[slug]/page.tsx
   └── api-client.ts → createBooking()

2. POST /api/bookings
   └── routes/bookings.routes.js
       └── controllers/index.js → createBooking()
           └── services/booking.service.js → createPending()

3. booking.service.js
   ├── resource.service (implicite via prisma)
   ├── slot-calculator.service.js → computeInterval()
   ├── availability.service.js → assertNoConflict()
   ├── pricing.service.js → getQuote()
   └── prisma.booking.create({ status: 'pending', expiresAt: +15min })

4. Réponse 201 → redirect /book/:slug/confirm/:id
```

## Body POST /api/bookings

```json
{
  "resourceSlug": "espace-polyvalent",
  "bookingTypeCode": "full_day",
  "date": "2026-08-15",
  "eventType": "wedding",
  "customer": {
    "email": "client@example.com",
    "phone": "+243999999999",
    "firstName": "Jean",
    "lastName": "Dupont"
  }
}
```

## Erreurs

| HTTP | Code | Cause |
|------|------|-------|
| 409 | SLOT_CONFLICT | Créneau déjà pris |
| 400 | — | Type ou date invalide |

## Suite

→ [02-hold-expiration.md](02-hold-expiration.md) si abandon
→ [03-admin-confirm.md](03-admin-confirm.md) si validation
