/**
 * Service ressources — lecture des espaces réservables.
 *
 * @module services/resource.service
 * @calledBy controllers/resources.controller.js
 * @db resources, resource_types, booking_types
 */

const prisma = require('../config/database');

async function listActive() {
  return prisma.resource.findMany({
    where: { isActive: true },
    include: {
      resourceType: {
        include: { bookingTypes: true },
      },
      pricingRules: { include: { bookingType: true } },
    },
    orderBy: { name: 'asc' },
  });
}

async function getBySlug(slug) {
  const resource = await prisma.resource.findUnique({
    where: { slug },
    include: {
      resourceType: { include: { bookingTypes: true } },
      media: { orderBy: { sortOrder: 'asc' } },
      pricingRules: { include: { bookingType: true } },
    },
  });

  if (!resource || !resource.isActive) {
    const err = new Error('Ressource introuvable');
    err.statusCode = 404;
    throw err;
  }

  return resource;
}

module.exports = { listActive, getBySlug };
