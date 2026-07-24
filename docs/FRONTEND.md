# Frontend — réservation (Sprint 6)

## Alignement visuel Odoo

L'app reprend le thème **marneza.odoo.com** (Odoo nano-1) :

| Élément | Valeur |
|---------|--------|
| Orange primaire | `#e33a07` |
| Header / Footer | `#0d0d0d` |
| Liens nav | `#fb8f6f` |
| Police corps | Inter |
| Police titres / boutons | Manrope |
| Boutons | Pill (`border-radius: 10rem`) |

Tokens : `apps/web/src/lib/marneza-theme.ts`

## Pages

| URL | Composant | Rôle |
|-----|-----------|------|
| `/` | `app/page.tsx` | Liste des 3 espaces |
| `/book/[slug]` | `BookingWizard.tsx` | Calendrier + formulaire |
| `/book/[slug]/confirm/[id]` | `ConfirmClient.tsx` | Récap + timer 15 min |

## Flux client

```
/book/espace-polyvalent
  → choix type + date + coordonnées
  → POST /api/bookings
  → /book/.../confirm/:id (timer)
```

## Lancer

```bash
npm run dev:web   # port 3000
npm run dev:api   # port 4000 (requis)
```

Variable : `NEXT_PUBLIC_API_URL=http://localhost:4000` (défaut)
