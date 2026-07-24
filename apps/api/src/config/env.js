/**
 * Configuration centralisée — variables d'environnement
 *
 * @module config/env
 * @see ../../.env.example
 */

require('./load-env');

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPort: parseInt(process.env.API_PORT || '4000', 10),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:4000',
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  bookingHoldMinutes: parseInt(process.env.BOOKING_HOLD_MINUTES || '15', 10),
  bookingLinkExpireHours: parseInt(process.env.BOOKING_LINK_EXPIRE_HOURS || '24', 10),
  apartmentAddonAmount: parseFloat(process.env.APARTMENT_ADDON_AMOUNT || '50'),
  apartmentSlug: process.env.APARTMENT_SLUG || 'appartement',
  defaultTimezone: process.env.DEFAULT_TIMEZONE || 'Africa/Kinshasa',
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'USD',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  requireAuth: process.env.REQUIRE_AUTH === 'true',
  adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL,
  payment: {
    bankName: process.env.PAYMENT_BANK_NAME || 'À configurer',
    bankAccount: process.env.PAYMENT_BANK_ACCOUNT || 'À configurer',
    bankHolder: process.env.PAYMENT_BANK_HOLDER || 'Marneza',
    mobileMoney: process.env.PAYMENT_MOBILE_MONEY || 'Orange Money / M-Pesa / Airtel — numéro à configurer',
    referenceHelp:
      process.env.PAYMENT_REFERENCE_HELP ||
      'Indiquez votre nom complet et la référence de réservation dans le libellé du paiement.',
  },
  mail: {
    enabled: process.env.MAIL_ENABLED === 'true',
    // preview = Ethereal (console) | mailtrap = API Mailtrap | smtp = serveur SMTP
    mode: process.env.MAIL_MODE || 'smtp',
    from: process.env.SMTP_FROM || 'Marneza <no-reply@marneza.com>',
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    mailtrap: {
      token: process.env.MAILTRAP_TOKEN || '',
      senderEmail: process.env.MAILTRAP_SENDER_EMAIL || 'hello@demomailtrap.co',
      senderName: process.env.MAILTRAP_SENDER_NAME || 'Marneza',
      useSandbox: process.env.MAILTRAP_USE_SANDBOX === 'true',
      inboxId: process.env.MAILTRAP_INBOX_ID
        ? parseInt(process.env.MAILTRAP_INBOX_ID, 10)
        : undefined,
    },
  },
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  odoo: {
    url: process.env.ODOO_URL,
    db: process.env.ODOO_DB,
    username: process.env.ODOO_USERNAME,
    apiKey: process.env.ODOO_API_KEY,
    syncEnabled: process.env.ODOO_SYNC_ENABLED === 'true',
  },
};

module.exports = env;
