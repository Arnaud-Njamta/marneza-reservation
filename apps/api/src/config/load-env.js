/**
 * Charge le .env racine AVANT tout autre module (Prisma, Express…).
 *
 * @module config/load-env
 * @path  marneza-reservation/.env (4 niveaux : config → src → api → racine)
 */

const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../../../../.env');

const result = dotenv.config({ path: envPath });

if (result.error && process.env.NODE_ENV !== 'test') {
  console.warn(`[load-env] Fichier .env introuvable : ${envPath}`);
  console.warn('[load-env] Copiez .env.example vers .env à la racine du projet');
}

module.exports = envPath;
