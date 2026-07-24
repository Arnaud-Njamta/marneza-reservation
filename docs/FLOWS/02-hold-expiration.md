# Flux 02 — Expiration hold 15 min (Option C)

## Déclencheur

Job `expire-pending.job.js` — toutes les 2 minutes

## Fichier

`apps/api/src/jobs/expire-pending.job.js`

## Règle

```
WHERE status = 'pending' AND expires_at < NOW()
→ status = 'cancelled'
```

## Effet

Le créneau redevient disponible dans `AvailabilityService`.

## Démarrage

Automatique au lancement API (`src/index.js` → setInterval 2 min).

Production : remplacer par cron BullMQ.
