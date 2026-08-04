/**
 * Seed initial — 3 ressources Marneza + types de location + tarifs placeholder
 *
 * Exécution : npm run db:seed (depuis apps/api)
 * Documentation : docs/DATABASE.md
 */

const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../src/services/auth.service');

const prisma = new PrismaClient();

const HALL_BOOKING_TYPES = [
  {
    code: 'hour',
    name: "Location à l'heure",
    defaultStartTime: '08:00',
    defaultEndTime: '16:00',
    spansOvernight: false,
  },
  {
    code: 'day',
    name: 'Location journée',
    defaultStartTime: '08:00',
    defaultEndTime: '15:00',
    spansOvernight: false,
  },
  {
    code: 'evening',
    name: 'Location soirée',
    defaultStartTime: '18:00',
    defaultEndTime: '07:00',
    spansOvernight: true,
  },
  {
    code: 'full_day',
    name: 'Location full day',
    defaultStartTime: '08:00',
    defaultEndTime: '07:00',
    spansOvernight: true,
  },
];

const APARTMENT_BOOKING_TYPES = [
  {
    code: 'apt_day',
    name: 'Location jour (08h – 18h)',
    defaultStartTime: '08:00',
    defaultEndTime: '18:00',
    spansOvernight: false,
  },
  {
    code: 'apt_night',
    name: 'Location nuit (18h – 08h)',
    defaultStartTime: '18:00',
    defaultEndTime: '08:00',
    spansOvernight: true,
  },
];

const RESOURCES = [
  {
    slug: 'espace-polyvalent',
    name: 'Espace Polyvalent',
    description:
      'Salle polyvalente pour fêtes, mariages et cérémonies. Location à l\'heure, journée, soirée ou full day.',
    resourceTypeCode: 'hall',
    odooProductId: 17, // ESPACE POLYVALENT — marneza.odoo.com/shop/...-17
    pricing: { hour: 150, day: 800, evening: 1025, full_day: 1260 },
    tagline: 'Fêtes, mariages, cérémonies',
    showcaseFromAmount: 1500,
  },
  {
    slug: 'salle-conference',
    name: 'Salle de Conférence',
    description:
      'Salle modulable pour séminaires, formations et réunions professionnelles. À partir de 70 $ / heure.',
    resourceTypeCode: 'conference',
    odooProductId: null,
    pricing: { hour: 70, day: 350, evening: 450, full_day: 550 },
    tagline: 'Séminaires et réunions',
    showcaseFromAmount: 70,
  },
  {
    slug: 'appartement',
    name: 'Appartement Marneza',
    description:
      'Appartement indépendant à Kinshasa — location à la nuit (18h à 08h) ou à la journée (08h à 18h). À partir de 50 $ / nuit.',
    resourceTypeCode: 'apartment',
    odooProductId: null,
    pricing: { apt_day: 50, apt_night: 50 },
    pricingPromo: { apt_night: { compareAtAmount: null, promoLabel: null } },
    tagline: 'Location jour ou nuit',
    showcaseFromAmount: 50,
  },
];

async function main() {
  console.log('🌱 Seed Marneza Reservation...\n');

  // ─── Resource types ─────────────────────────────────────────
  const hallType = await prisma.resourceType.upsert({
    where: { code: 'hall' },
    update: {},
    create: { code: 'hall', name: 'Salle polyvalente' },
  });

  const conferenceType = await prisma.resourceType.upsert({
    where: { code: 'conference' },
    update: {},
    create: { code: 'conference', name: 'Salle de conférence' },
  });

  const apartmentType = await prisma.resourceType.upsert({
    where: { code: 'apartment' },
    update: {},
    create: { code: 'apartment', name: 'Appartement' },
  });

  const typeMap = {
    hall: hallType,
    conference: conferenceType,
    apartment: apartmentType,
  };

  // ─── Booking types ──────────────────────────────────────────
  const bookingTypeRecords = {};

  for (const bt of HALL_BOOKING_TYPES) {
    const record = await prisma.bookingType.upsert({
      where: { code: bt.code },
      update: {},
      create: { ...bt, resourceTypeId: hallType.id },
    });
    bookingTypeRecords[bt.code] = record;

    // Conference partage les mêmes types horaires
    await prisma.bookingType.upsert({
      where: { code: `conf_${bt.code}` },
      update: {},
      create: {
        code: `conf_${bt.code}`,
        name: bt.name,
        defaultStartTime: bt.defaultStartTime,
        defaultEndTime: bt.defaultEndTime,
        spansOvernight: bt.spansOvernight,
        resourceTypeId: conferenceType.id,
      },
    });
    bookingTypeRecords[`conf_${bt.code}`] = await prisma.bookingType.findUnique({
      where: { code: `conf_${bt.code}` },
    });
  }

  for (const bt of APARTMENT_BOOKING_TYPES) {
    const record = await prisma.bookingType.upsert({
      where: { code: bt.code },
      update: {},
      create: { ...bt, resourceTypeId: apartmentType.id },
    });
    bookingTypeRecords[bt.code] = record;
  }

  // ─── Resources + pricing ────────────────────────────────────
  for (const res of RESOURCES) {
    const resourceType = typeMap[res.resourceTypeCode];

    const resource = await prisma.resource.upsert({
      where: { slug: res.slug },
      update: {
        name: res.name,
        description: res.description,
        odooProductId: res.odooProductId,
        tagline: res.tagline ?? null,
        showcaseFromAmount: res.showcaseFromAmount ?? null,
        showcaseCurrency: res.showcaseCurrency ?? 'USD',
      },
      create: {
        slug: res.slug,
        name: res.name,
        description: res.description,
        resourceTypeId: resourceType.id,
        odooProductId: res.odooProductId,
        timezone: 'Africa/Kinshasa',
        tagline: res.tagline ?? null,
        showcaseFromAmount: res.showcaseFromAmount ?? null,
        showcaseCurrency: res.showcaseCurrency ?? 'USD',
      },
    });

    console.log(`  ✓ Resource: ${resource.name} (/${resource.slug})`);

    // Pricing rules
    const promoMeta = res.pricingPromo ?? {};

    for (const [typeCode, amount] of Object.entries(res.pricing)) {
      let bookingTypeId;

      if (res.resourceTypeCode === 'apartment') {
        bookingTypeId = bookingTypeRecords[typeCode].id;
      } else if (res.resourceTypeCode === 'conference') {
        bookingTypeId = bookingTypeRecords[`conf_${typeCode}`].id;
      } else {
        bookingTypeId = bookingTypeRecords[typeCode].id;
      }

      const promo = promoMeta[typeCode] ?? {};

      await prisma.pricingRule.upsert({
        where: {
          resourceId_bookingTypeId: {
            resourceId: resource.id,
            bookingTypeId,
          },
        },
        update: {
          amount,
          compareAtAmount: promo.compareAtAmount ?? null,
          promoLabel: promo.promoLabel ?? null,
        },
        create: {
          resourceId: resource.id,
          bookingTypeId,
          amount,
          compareAtAmount: promo.compareAtAmount ?? null,
          promoLabel: promo.promoLabel ?? null,
          currency: 'USD',
        },
      });
    }
  }

  // ─── System settings ────────────────────────────────────────
  const settings = [
    { key: 'booking_hold_minutes', value: '15' },
    { key: 'default_timezone', value: 'Africa/Kinshasa' },
    { key: 'default_currency', value: 'USD' },
    { key: 'payment_bank_name', value: process.env.PAYMENT_BANK_NAME || 'Banque à configurer' },
    { key: 'payment_bank_account', value: process.env.PAYMENT_BANK_ACCOUNT || 'IBAN / compte à configurer' },
    { key: 'payment_bank_holder', value: process.env.PAYMENT_BANK_HOLDER || 'Marneza' },
    {
      key: 'payment_mobile_money',
      value: process.env.PAYMENT_MOBILE_MONEY || 'Orange Money / M-Pesa / Airtel — numéro à configurer',
    },
    {
      key: 'payment_reference_help',
      value:
        process.env.PAYMENT_REFERENCE_HELP ||
        'Indiquez votre nom et la référence de réservation dans le libellé du paiement.',
    },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  // ─── Roles admin ──────────────────────────────────────────────
  const roleRecords = {};
  for (const role of [
    { code: 'admin', name: 'Administrateur' },
    { code: 'manager', name: 'Manager' },
    { code: 'staff', name: 'Staff' },
  ]) {
    roleRecords[role.code] = await prisma.role.upsert({
      where: { code: role.code },
      update: {},
      create: role,
    });
  }

  // ─── Compte admin initial ─────────────────────────────────────
  // Mot de passe ADMIN_PASSWORD uniquement à la création — un re-seed
  // n'écrase jamais un hash modifié via « Mon compte » / reset SMTP.
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@marneza.com').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Marneza2026!';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  let adminUser;
  if (existingAdmin) {
    adminUser = await prisma.user.update({
      where: { id: existingAdmin.id },
      data: { isActive: true },
    });
    console.log(`  ✓ Admin: ${adminEmail} (existant — mot de passe conservé)`);
  } else {
    const passwordHash = await hashPassword(adminPassword);
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        firstName: 'Admin',
        lastName: 'Marneza',
        isActive: true,
      },
    });
    console.log(`  ✓ Admin: ${adminEmail} (créé — mot de passe depuis ADMIN_PASSWORD)`);
  }

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: roleRecords.admin.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: roleRecords.admin.id,
    },
  });

  // ─── Conditions de location ─────────────────────────────────
  const termsResult = await require('../src/services/rental-terms.service').ensureDefaults();
  if (termsResult.seeded) {
    console.log(`  ✓ Conditions de location: ${termsResult.count} créées`);
  } else {
    console.log(`  ✓ Conditions de location: déjà présentes (${termsResult.count})`);
  }

  console.log('\n✅ Seed terminé.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
