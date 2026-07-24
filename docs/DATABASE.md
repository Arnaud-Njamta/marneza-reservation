# Base de données — Schéma et règles métier

ORM : Prisma — `apps/api/prisma/schema.prisma`

## Ressources (3 au lancement)

| slug | resource_type | Types de location |
|------|---------------|-------------------|
| `espace-polyvalent` | hall | hour, day, evening, full_day |
| `salle-conference` | conference | conf_hour, conf_day, conf_evening, conf_full_day |
| `appartement` | apartment | apt_day, apt_night |

Le frontend envoie `hour`, `day`, etc. — l'API résout `conf_*` pour la conférence.

## Règles horaires

### Salles (hall + conference)

| Code | Intervalle |
|------|------------|
| hour | Créneau 1h dans 08h00–16h00 |
| day | 08h00 → 15h00 |
| evening | 18h00 J → 07h00 J+1 |
| full_day | 08h00 J → 07h00 J+1 |

### Appartement

| Code | Intervalle |
|------|------------|
| apt_day | 08h00 → 18h00 |
| apt_night | 18h00 J → 08h00 J+1 |

## Calcul intervalles

Service : `apps/api/src/services/slot-calculator.service.js`

Fuseau : `Africa/Kinshasa` (UTC+2)

## Anti-conflit

Service : `apps/api/src/services/availability.service.js`

```sql
-- Logique équivalente
WHERE resource_id = :id
  AND status IN ('pending', 'confirmed')
  AND start_at < :new_end
  AND end_at > :new_start
```

## Hold 15 min (Option C)

- `bookings.expires_at` = now() + 15 min pour status `pending`
- Job `expire-pending` libère les créneaux expirés

## Configuration MySQL (XAMPP)

| Paramètre | Valeur |
|-----------|--------|
| Hôte | `localhost` |
| Port | `3306` |
| Utilisateur | `root` (défaut XAMPP) |
| Base | `marneza_reservation` |
| Charset | `utf8mb4` |

```env
DATABASE_URL=mysql://root@localhost:3306/marneza_reservation
```

```bash
npm run db:migrate    # applique les tables
npm run db:seed       # données initiales Marneza
```

## Seed

```bash
npm run db:seed
```

Crée les 3 ressources, types de location et tarifs placeholder.

## Prisma Studio

```bash
npm run db:studio
```
