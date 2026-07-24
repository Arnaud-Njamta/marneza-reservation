# Flux 05 — Vérification disponibilité

## Déclencheur

Calendrier frontend charge les dates du mois

## Chaîne d'appels

```
GET /api/resources/:slug/availability?from=2026-08-01&to=2026-08-31&booking_type=full_day

└── AvailabilityService.getAvailability()
    ├── slot-calculator.service.js → computeInterval() par jour
    ├── prisma.booking.findMany (pending + confirmed)
    ├── prisma.blockedPeriod.findMany
    └── intervalsOverlap() → available / unavailable
```

## Service cœur conflit

`apps/api/src/services/availability.service.js`

## Utilisé aussi par

`BookingService.createPending()` → `assertNoConflict()` avant insert
