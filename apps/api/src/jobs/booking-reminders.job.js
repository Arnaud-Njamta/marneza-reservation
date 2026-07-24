/**
 * Job : rappels réservation J-3, J-1 et jour-J (1 email client, une seule fois).
 *
 * @module jobs/booking-reminders.job
 * @schedule Toutes les heures
 *
 * Anti-spam :
 * - Un seul email par type (J-3 / J-1 / jour-J) → destinataire = client
 * - Le flag reminded*At est posé AVANT l'envoi (claim) → pas de renvoi si Mailtrap échoue
 * - L'admin voit les alertes dans le dashboard (AdminUpcomingAlerts), pas par email
 */

const prisma = require('../config/database');
const mailService = require('../services/mail.service');
const { ymdInTimezone, daysBetweenYmd } = require('../utils/dates');

const REMINDER_KINDS = [
  { days: 3, field: 'reminded3DaysAt', kind: '3days' },
  { days: 1, field: 'reminded1DayAt', kind: '1day' },
  { days: 0, field: 'remindedTodayAt', kind: 'today' },
];

function bookingInclude() {
  return { resource: true, bookingType: true, customer: true };
}

async function sendBookingReminders() {
  const todayYmd = ymdInTimezone(new Date());
  let sent = 0;

  const bookings = await prisma.booking.findMany({
    where: { status: 'paid' },
    include: bookingInclude(),
  });

  for (const booking of bookings) {
    const startYmd = ymdInTimezone(booking.startAt);
    const diff = daysBetweenYmd(todayYmd, startYmd);

    // Passé ou trop loin → ignore
    if (diff < 0 || diff > 3) continue;

    for (const rule of REMINDER_KINDS) {
      if (diff !== rule.days) continue;

      // Claim atomique : si déjà rappelé, count = 0 → on ne renvoie jamais
      const claimed = await prisma.booking.updateMany({
        where: {
          id: booking.id,
          [rule.field]: null,
        },
        data: { [rule.field]: new Date() },
      });

      if (claimed.count === 0) continue;

      try {
        await mailService.sendBookingReminderEmails(booking, rule.kind);
        sent += 1;
        console.log(`[reminders] ${rule.kind} → ${booking.referenceNumber || booking.id}`);
      } catch (err) {
        // Flag déjà posé : pas de spam horaire. Log seulement.
        console.error(
          `[reminders] Échec envoi ${rule.kind} ${booking.referenceNumber || booking.id}`,
          err?.message || err
        );
      }
    }
  }

  if (sent > 0) {
    console.log(`[reminders] ${sent} rappel(s) client envoyé(s)`);
  }

  return sent;
}

module.exports = { sendBookingReminders };
