# Déploiement — Production

## Architecture (React + API)

```text
Front React (build statique)  →  FileZilla / hébergement web IONOS
API Express + MySQL         →  VPS IONOS (PM2 + Nginx)
```

| Composant | Hébergement | Build |
|-----------|-------------|--------|
| Frontend | Hébergement web IONOS (FTP) | `npm run build --workspace=apps/web` → `apps/web/dist/` |
| API | VPS `/var/www/marneza-reservation` | PM2 `marneza-api` |

## Domaine cible (même modèle que Yaya)

| App | Domaine | Dossier FileZilla |
|-----|---------|-------------------|
| Collecte taxes | `https://yaya.blconcept-yala.com` | `/yaya` |
| Réservation Marneza | `https://marneza.blconcept-yala.com` | `/Marneza` |

Front et API partagent le **même domaine** : le navigateur appelle `/api/...` sur ce domaine ; Nginx (ou le reverse proxy IONOS/VPS) route `/api` vers le backend Node.

## Variables frontend (build)

Fichier `apps/web/.env.production` :

```env
VITE_API_URL=https://marneza.blconcept-yala.com
```

En local : `apps/web/.env.development` → `VITE_API_URL=http://localhost:4000`

## Variables API (VPS)

Fichier `.env` à la racine du monorepo sur le VPS :

```env
NODE_ENV=production
APP_URL=https://marneza.blconcept-yala.com
API_URL=https://marneza.blconcept-yala.com
DATABASE_URL=mysql://...
JWT_SECRET=...
REQUIRE_AUTH=true
CORS_ORIGINS=https://marneza.blconcept-yala.com,https://marneza.odoo.com
```

## DNS

Créer chez IONOS :

| Type | Nom | Valeur |
|------|-----|--------|
| A ou CNAME | `reserve` | IP VPS **ou** hébergement web IONOS |

**Option A — tout sur le VPS** (simple) : `reserve` → IP VPS, Nginx sert le front (`dist/`) + `/api`.

**Option B — front FileZilla** (comme Yaya) : `reserve` → hébergement web, API sur VPS avec Nginx `/api` ou `api.reserve.marneza.com`.

## Build front (local ou CI)

```bash
cd marneza-reservation
npm install
npm run build --workspace=apps/web
```

Contenu à uploader via **FileZilla** : tout le dossier `apps/web/dist/` (y compris `.htaccess` pour le routage SPA).

## Déploiement API (VPS)

```bash
cd /var/www/marneza-reservation
git pull
npm install
npm run db:migrate
pm2 start ecosystem.config.cjs   # marneza-api uniquement
pm2 save
```

## Nginx — API + front statique (option A, tout VPS)

```nginx
server {
  listen 443 ssl http2;
  server_name reserve.marneza.com;

  root /var/www/marneza-reservation/apps/web/dist;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

## Nginx — API seule (option B, front FileZilla)

Sur le VPS, proxy uniquement `/api` ; le front est sur l’hébergement web IONOS.

## Compte admin

1. `https://reserve.marneza.com/admin/login`
2. Identifiants du seed (`ADMIN_EMAIL` / `ADMIN_PASSWORD`)
3. **Mon compte** pour modifier e-mail / mot de passe
4. Récupération par code SMTP si oubli

## Coexistence avec d’autres apps (ex. collecte taxes)

Chaque app = **son port** sur le VPS :

| App | Port |
|-----|------|
| Marneza API | 4000 |
| Collecte taxes | 3001 (pas 3000) |

## Checklist

- [ ] `VITE_API_URL` correct au build
- [ ] `.htaccess` présent dans `dist/` (upload FTP)
- [ ] DNS `reserve.marneza.com` créé
- [ ] `CORS_ORIGINS` inclut l’URL du front
- [ ] HTTPS activé
- [ ] `pm2 delete marneza-web` si ancien front Node encore actif
