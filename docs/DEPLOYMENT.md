# Déploiement — Production (VPS IONOS)

## Domaine cible

- **App** : `https://reserve.marneza.com`
- **Odoo** : `https://marneza.odoo.com`

Tout (Next.js + API Express + MySQL) tourne sur le **VPS IONOS**.  
L’hébergement web FTP/FileZilla seul ne convient pas à Next.js (besoin de Node.js).

```
Navigateur → DNS reserve.marneza.com → Nginx (HTTPS)
                 ├─ /      → Next.js  :3000
                 └─ /api   → Express  :4000
                                  ├─ MySQL
                                  └─ SMTP IONOS
```

## Prérequis VPS

- Ubuntu (ou Debian) à jour
- Node.js **20+**
- MySQL / MariaDB
- Nginx
- PM2 (`npm i -g pm2`)
- Certificat SSL (Let’s Encrypt / certbot)

## DNS

`reserve.marneza.com` → adresse IP publique du VPS (enregistrement A).

## Variables production

Fichier `.env` à la racine du monorepo (même schéma que `.env.example`) :

```env
NODE_ENV=production
APP_URL=https://reserve.marneza.com
API_URL=https://reserve.marneza.com
DATABASE_URL=mysql://USER:PASSWORD@127.0.0.1:3306/marneza_reservation
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=<long-random-string>
JWT_EXPIRES_IN=7d
REQUIRE_AUTH=true
CORS_ORIGINS=https://reserve.marneza.com,https://marneza.odoo.com

ADMIN_EMAIL=admin@marneza.com
ADMIN_PASSWORD=<mot-de-passe-initial-fort>
ADMIN_NOTIFICATION_EMAIL=app@marneza.com

MAIL_ENABLED=true
MAIL_MODE=smtp
SMTP_HOST=smtp.ionos.fr
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=app@marneza.com
SMTP_PASS=<secret>
SMTP_FROM=Marneza <app@marneza.com>
```

> `ADMIN_PASSWORD` ne s’applique qu’à la **création** du compte au seed.  
> Un re-seed **n’écrase pas** un mot de passe déjà modifié via Mon compte ou reset e-mail.

## Installation (une fois)

```bash
# Sur le VPS
git clone <repo> /var/www/marneza-reservation
cd /var/www/marneza-reservation
cp .env.example .env   # puis éditer
npm install

# Base
mysql -e "CREATE DATABASE marneza_reservation CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
npm run db:generate
npm run db:migrate
npm run db:seed        # crée le compte admin initial

# Build front
npm run build --workspace=apps/web
```

## Processus (PM2)

Exemple `ecosystem.config.cjs` à la racine :

```js
module.exports = {
  apps: [
    {
      name: 'marneza-api',
      cwd: './apps/api',
      script: 'src/index.js',
      instances: 1,
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'marneza-web',
      cwd: './apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      env: { NODE_ENV: 'production' },
    },
  ],
};
```

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Vérifier : `curl http://127.0.0.1:4000/api/health`

## Nginx (reverse proxy)

```nginx
server {
  listen 80;
  server_name reserve.marneza.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name reserve.marneza.com;

  # ssl_certificate / etc. (certbot)

  location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Ensuite : `sudo certbot --nginx -d reserve.marneza.com`

Le front Next.js proxifie aussi `/api` en interne ([next.config.js](../apps/web/next.config.js)) ; Nginx peut router `/api` directement vers Express (recommandé en prod).

## Compte admin — première connexion & récupération

1. Ouvrir `https://reserve.marneza.com/admin/login`
2. Se connecter avec `ADMIN_EMAIL` / `ADMIN_PASSWORD` (valeurs du seed initial)
3. Menu utilisateur → **Mon compte** : modifier e-mail et/ou mot de passe
4. Si oubli :
   - **Mot de passe oublié** → code à 6 chiffres par SMTP (15 min) → nouveau mot de passe
   - **Identifiant oublié** → e-mail de connexion **ou** `ADMIN_NOTIFICATION_EMAIL` → code → révélation de l’identifiant

## Lien Odoo /shop

Sur chaque fiche produit, bouton :

```
https://reserve.marneza.com/book/espace-polyvalent
```

## Checklist avant mise en prod

- [ ] `REQUIRE_AUTH=true`
- [ ] `JWT_SECRET` fort (aléatoire long)
- [ ] Migrations Prisma appliquées (`npm run db:migrate`)
- [ ] Seed exécuté une fois
- [ ] SMTP IONOS testé (réception d’un code de récupération)
- [ ] HTTPS activé
- [ ] Backups MySQL planifiés
- [ ] `odoo_product_id` renseignés si sync Odoo

## Mises à jour

```bash
cd /var/www/marneza-reservation
git pull
npm install
npm run db:migrate
npm run build --workspace=apps/web
pm2 restart marneza-api marneza-web
```
