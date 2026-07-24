/**
 * Conditions de location — liste publique + CRUD admin.
 *
 * @module services/rental-terms.service
 */

const prisma = require('../config/database');

const DEFAULT_TERMS = [
  'Le créneau est réservé 15 minutes le temps de confirmer votre demande.',
  'Le paiement définitif intervient après validation par notre équipe.',
  'Toute annulation est soumise aux conditions générales de location Marneza.',
  "Les équipements et l'espace doivent être restitués dans l'état initial.",
];

/** Conditions actives pour le client (ordre d'affichage). */
async function listActive() {
  return prisma.rentalTerm.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

/** Toutes les conditions (admin). */
async function listAll() {
  return prisma.rentalTerm.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

async function create({ body, sortOrder, isActive = true }) {
  const text = String(body ?? '').trim();
  if (!text) {
    const err = new Error('Le texte de la condition est requis');
    err.statusCode = 400;
    throw err;
  }

  let order = sortOrder;
  if (order == null || !Number.isFinite(Number(order))) {
    const agg = await prisma.rentalTerm.aggregate({ _max: { sortOrder: true } });
    order = (agg._max.sortOrder ?? -1) + 1;
  }

  return prisma.rentalTerm.create({
    data: {
      body: text,
      sortOrder: Number(order),
      isActive: Boolean(isActive),
    },
  });
}

async function update(id, data) {
  const existing = await prisma.rentalTerm.findUnique({ where: { id } });
  if (!existing) {
    const err = new Error('Condition introuvable');
    err.statusCode = 404;
    throw err;
  }

  const payload = {};
  if (data.body !== undefined) {
    const text = String(data.body).trim();
    if (!text) {
      const err = new Error('Le texte de la condition est requis');
      err.statusCode = 400;
      throw err;
    }
    payload.body = text;
  }
  if (data.sortOrder !== undefined) payload.sortOrder = Number(data.sortOrder);
  if (data.isActive !== undefined) payload.isActive = Boolean(data.isActive);

  return prisma.rentalTerm.update({ where: { id }, data: payload });
}

async function remove(id) {
  const existing = await prisma.rentalTerm.findUnique({ where: { id } });
  if (!existing) {
    const err = new Error('Condition introuvable');
    err.statusCode = 404;
    throw err;
  }
  await prisma.rentalTerm.delete({ where: { id } });
  return { ok: true };
}

/** Remplace l’ordre d’une liste d’ids (admin drag / boutons haut-bas). */
async function reorder(orderedIds) {
  if (!Array.isArray(orderedIds) || !orderedIds.length) {
    const err = new Error('Liste d\'ids requise');
    err.statusCode = 400;
    throw err;
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.rentalTerm.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  return listAll();
}

/** Seed idempotent des conditions par défaut si table vide. */
async function ensureDefaults() {
  const count = await prisma.rentalTerm.count();
  if (count > 0) return { seeded: false, count };

  await prisma.rentalTerm.createMany({
    data: DEFAULT_TERMS.map((body, sortOrder) => ({
      body,
      sortOrder,
      isActive: true,
    })),
  });

  return { seeded: true, count: DEFAULT_TERMS.length };
}

module.exports = {
  listActive,
  listAll,
  create,
  update,
  remove,
  reorder,
  ensureDefaults,
  DEFAULT_TERMS,
};
