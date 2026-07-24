/**
 * Client Odoo JSON-RPC.
 *
 * @module services/odoo/odoo.client
 * @see docs/ODOO_SYNC.md
 */

const env = require('../../config/env');

let uid = null;

async function authenticate() {
  if (uid) return uid;
  if (!env.odoo.url || !env.odoo.db || !env.odoo.username || !env.odoo.apiKey) {
    throw new Error('Configuration Odoo incomplète — voir .env');
  }

  const res = await fetch(`${env.odoo.url}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'common',
        method: 'authenticate',
        args: [env.odoo.db, env.odoo.username, env.odoo.apiKey, {}],
      },
      id: Date.now(),
    }),
  });

  const data = await res.json();
  if (!data.result) throw new Error('Authentification Odoo échouée');
  uid = data.result;
  return uid;
}

/**
 * Appel générique Odoo execute_kw.
 */
async function callOdoo(model, method, args = [], kwargs = {}) {
  if (!env.odoo.syncEnabled) {
    return { skipped: true, reason: 'ODOO_SYNC_ENABLED=false' };
  }

  const userId = await authenticate();

  const res = await fetch(`${env.odoo.url}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [env.odoo.db, userId, env.odoo.apiKey, model, method, args, kwargs],
      },
      id: Date.now(),
    }),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.data?.message || data.error.message || 'Erreur Odoo');
  }
  return data.result;
}

/** Recherche ou crée un enregistrement */
async function searchCreate(model, domain, values) {
  const existing = await callOdoo(model, 'search', [domain], { limit: 1 });
  if (existing?.length) return existing[0];
  return callOdoo(model, 'create', [values]);
}

module.exports = { callOdoo, searchCreate, authenticate };
