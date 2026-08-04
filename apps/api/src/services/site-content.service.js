/**
 * Contenu vitrine page d’accueil — system_settings + ressources.
 *
 * @module services/site-content.service
 */

const prisma = require('../config/database');

const HOME_KEYS = {
  eyebrow: 'home_eyebrow',
  title: 'home_title',
  subtitle: 'home_subtitle',
  intro: 'home_intro',
};

const HOME_DEFAULTS = {
  eyebrow: 'Réservation en ligne',
  title: 'Réservez votre événement',
  subtitle:
    'Depuis notre boutique, choisissez votre espace puis réservez vos dates ici. Rapide, simple et sécurisé.',
  intro:
    'Parcours recommandé : commencez par la boutique Salle de fête, puis cliquez sur « Réserver en ligne » sur la fiche produit.',
};

async function getHomeTexts() {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: Object.values(HOME_KEYS) } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    eyebrow: map[HOME_KEYS.eyebrow] || HOME_DEFAULTS.eyebrow,
    title: map[HOME_KEYS.title] || HOME_DEFAULTS.title,
    subtitle: map[HOME_KEYS.subtitle] || HOME_DEFAULTS.subtitle,
    intro: map[HOME_KEYS.intro] || HOME_DEFAULTS.intro,
  };
}

async function updateHomeTexts(partial = {}) {
  const updates = {};
  for (const field of Object.keys(HOME_KEYS)) {
    if (partial[field] !== undefined && partial[field] !== null) {
      updates[field] = String(partial[field]).trim();
    }
  }
  if (Object.keys(updates).length === 0) {
    const err = new Error('Aucun texte à enregistrer');
    err.statusCode = 400;
    throw err;
  }

  await Promise.all(
    Object.entries(updates).map(([field, value]) =>
      prisma.systemSetting.upsert({
        where: { key: HOME_KEYS[field] },
        update: { value },
        create: { key: HOME_KEYS[field], value },
      })
    )
  );

  return getHomeTexts();
}

async function ensureHomeDefaults() {
  let created = 0;
  for (const [field, key] of Object.entries(HOME_KEYS)) {
    const existing = await prisma.systemSetting.findUnique({ where: { key } });
    if (!existing) {
      await prisma.systemSetting.create({ data: { key, value: HOME_DEFAULTS[field] } });
      created += 1;
    }
  }
  return { created };
}

async function listResourcesForAdmin() {
  return prisma.resource.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      tagline: true,
      showcaseFromAmount: true,
      showcaseCurrency: true,
      isActive: true,
    },
  });
}

async function updateResourceShowcase(id, body = {}) {
  const existing = await prisma.resource.findUnique({ where: { id } });
  if (!existing) {
    const err = new Error('Espace introuvable');
    err.statusCode = 404;
    throw err;
  }

  const data = {};
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.description !== undefined) {
    data.description = body.description == null ? null : String(body.description).trim();
  }
  if (body.tagline !== undefined) {
    data.tagline = body.tagline == null || body.tagline === '' ? null : String(body.tagline).trim();
  }
  if (body.showcaseCurrency !== undefined) {
    data.showcaseCurrency = String(body.showcaseCurrency || 'USD').trim() || 'USD';
  }
  if (body.showcaseFromAmount !== undefined) {
    if (body.showcaseFromAmount === null || body.showcaseFromAmount === '') {
      data.showcaseFromAmount = null;
    } else {
      const n = Number(body.showcaseFromAmount);
      if (!Number.isFinite(n) || n < 0) {
        const err = new Error('Prix « à partir de » invalide');
        err.statusCode = 400;
        throw err;
      }
      data.showcaseFromAmount = n;
    }
  }
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

  if (Object.keys(data).length === 0) {
    const err = new Error('Aucune modification');
    err.statusCode = 400;
    throw err;
  }

  return prisma.resource.update({
    where: { id },
    data,
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      tagline: true,
      showcaseFromAmount: true,
      showcaseCurrency: true,
      isActive: true,
    },
  });
}

/** Bundle public pour la page d’accueil */
async function getPublicHome() {
  const [home, resources] = await Promise.all([
    getHomeTexts(),
    prisma.resource.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        resourceType: { include: { bookingTypes: true } },
        pricingRules: { include: { bookingType: true } },
      },
    }),
  ]);
  return { home, resources };
}

module.exports = {
  HOME_KEYS,
  HOME_DEFAULTS,
  getHomeTexts,
  updateHomeTexts,
  ensureHomeDefaults,
  listResourcesForAdmin,
  updateResourceShowcase,
  getPublicHome,
};
