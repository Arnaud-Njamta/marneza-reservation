/**
 * Service email — SMTP IONOS (TLS), API Mailtrap ou preview Ethereal.
 *
 * @module services/mail.service
 * @see docs/API_MANUAL.md §7
 *
 * INDEX DES ENVOIS (lignes exactes) :
 * L157 sendAdminNewBookingEmail        — submitByClient → admin
 * L213 sendClientBookingCreatedEmail   — createPending → client (hold 15 min)
 * L246 sendClientSubmitConfirmedEmail  — submitByClient → client
 * L305 sendClientInvoiceEmail          — sendInvoiceByAdmin → client
 * L361 sendAdminPaymentClaimedEmail    — claimPaymentByClient → admin
 * L385 sendClientPaymentConfirmedEmail — confirmPaymentByAdmin → client
 * L422 sendBookingReminderEmails       — job J-3 / J-1 / jour-J
 */

const nodemailer = require('nodemailer');
const { MailtrapClient } = require('mailtrap');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { clientBookingUrl } = require('../utils/booking-url');

let transporter;
let transporterReady;
let mailtrapClient;

function isPreviewMode() {
  return env.mail.mode === 'preview';
}

function isMailtrapMode() {
  return env.mail.mode === 'mailtrap';
}

function isMailConfigured() {
  if (!env.mail.enabled) return false;
  if (isPreviewMode()) return true;
  if (isMailtrapMode()) return Boolean(env.mail.mailtrap.token);
  return Boolean(env.mail.host);
}

function getMailtrapClient() {
  if (!mailtrapClient) {
    const { token, useSandbox, inboxId } = env.mail.mailtrap;
    mailtrapClient = new MailtrapClient({
      token,
      sandbox: useSandbox,
      testInboxId: useSandbox ? inboxId : undefined,
    });
  }
  return mailtrapClient;
}

async function getPreviewTransporter() {
  if (transporter) return transporter;
  if (transporterReady) return transporterReady;

  transporterReady = (async () => {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    return transporter;
  })();

  return transporterReady;
}

function formatBookingPeriod(booking) {
  return `${new Date(booking.startAt).toLocaleString('fr-FR')} → ${new Date(booking.endAt).toLocaleString('fr-FR')}`;
}

/** Référence affichée (JJ-MM-AAAA-NNNN-XXXX) — jamais l'UUID technique */
function bookingRef(booking) {
  return booking.referenceNumber || String(booking.id).slice(0, 8).toUpperCase();
}

async function paymentInstructionsBlock() {
  const paymentSettings = require('./payment-settings.service');
  const { bankName, bankAccount, bankHolder, mobileMoney, referenceHelp } =
    await paymentSettings.getPaymentSettings();
  return {
    text: [
      '── Instructions de paiement ──',
      `Banque : ${bankName}`,
      `Titulaire : ${bankHolder}`,
      `Compte / IBAN : ${bankAccount}`,
      `Mobile money : ${mobileMoney}`,
      referenceHelp,
    ].join('\n'),
    html: `
      <h3>Instructions de paiement</h3>
      <ul>
        <li><strong>Banque :</strong> ${bankName}</li>
        <li><strong>Titulaire :</strong> ${bankHolder}</li>
        <li><strong>Compte / IBAN :</strong> ${bankAccount}</li>
        <li><strong>Mobile money :</strong> ${mobileMoney}</li>
      </ul>
      <p>${referenceHelp}</p>
    `,
  };
}

async function sendEmail({ to, subject, text, html }) {
  if (!isMailConfigured()) {
    console.log(`[mail] Désactivé — email non envoyé à ${to}`);
    return;
  }

  const recipient = to.trim();
  console.log(`[mail] Envoi → ${recipient} | ${subject}`);

  if (isMailtrapMode()) {
    const client = getMailtrapClient();
    const response = await client.send({
      from: {
        email: env.mail.mailtrap.senderEmail,
        name: env.mail.mailtrap.senderName,
      },
      to: [{ email: recipient }],
      subject,
      text,
      html,
      category: 'Marneza Reservation',
    });
    console.log('[mail] OK (Mailtrap API)', response);
    return;
  }

  if (isPreviewMode()) {
    const mailer = await getPreviewTransporter();
    const info = await mailer.sendMail({
      from: env.mail.from,
      to: recipient,
      subject,
      text,
      html,
    });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[mail] OK (preview) → ${recipient}`);
    if (previewUrl) console.log(`[mail] Aperçu : ${previewUrl}`);
    return;
  }

  // Port 587 + secure:false = STARTTLS (TLS), requis par IONOS
  const mailer = nodemailer.createTransport({
    host: env.mail.host,
    port: env.mail.port,
    secure: env.mail.secure,
    requireTLS: !env.mail.secure && env.mail.port === 587,
    auth: env.mail.user ? { user: env.mail.user, pass: env.mail.pass } : undefined,
  });

  await mailer.sendMail({
    from: env.mail.from,
    to: recipient,
    subject,
    text,
    html,
  });
  console.log(`[mail] OK (SMTP) → ${recipient}`);
}

function buildReviewToken(bookingId) {
  return jwt.sign({ type: 'admin-booking-review', bookingId }, env.jwtSecret, { expiresIn: '7d' });
}

function verifyReviewToken(token, bookingId) {
  const payload = jwt.verify(token, env.jwtSecret);
  return payload?.type === 'admin-booking-review' && payload?.bookingId === bookingId;
}

async function sendAdminNewBookingEmail(booking) {
  const reviewUrl = `${env.apiUrl}/api/bookings/${booking.id}/admin-review?token=${encodeURIComponent(buildReviewToken(booking.id))}`;
  const subject = `Nouvelle demande de réservation — ${booking.resource.name}`;
  const text = [
    'Une nouvelle demande a été confirmée par le client (conditions acceptées).',
    '',
    `Référence : ${bookingRef(booking)}`,
    `Espace : ${booking.resource.name}`,
    `Client : ${booking.customer.firstName} ${booking.customer.lastName}`,
    `Email : ${booking.customer.email}`,
    `Période : ${formatBookingPeriod(booking)}`,
    `Montant : ${Number(booking.totalAmount)} ${booking.currency}`,
    booking.notes?.trim() ? `Remarques client : ${booking.notes.trim()}` : null,
    '',
    `Voir dans l'admin : ${env.appUrl}/admin`,
    `Lien rapide : ${reviewUrl}`,
  ].filter(Boolean).join('\n');

  const html = `
    <h2>Nouvelle demande de réservation</h2>
    <p>Le client a accepté les conditions et confirmé sa demande.</p>
    <p><strong>Réf. :</strong> ${bookingRef(booking)}</p>
    <p><strong>Espace :</strong> ${booking.resource.name}</p>
    <p><strong>Client :</strong> ${booking.customer.firstName} ${booking.customer.lastName} (${booking.customer.email})</p>
    <p><strong>Période :</strong> ${formatBookingPeriod(booking)}</p>
    <p><strong>Montant :</strong> ${Number(booking.totalAmount)} ${booking.currency}</p>
    ${booking.notes?.trim() ? `<p><strong>Remarques client :</strong> ${booking.notes.trim()}</p>` : ''}
    <p><a href="${env.appUrl}/admin">Ouvrir l'administration</a></p>
  `;

  await sendEmail({ to: env.adminNotificationEmail, subject, text, html });
}

function clientLinkBlock(booking, { note } = {}) {
  const trackUrl = clientBookingUrl(booking);
  const expiryNote =
    booking.accessTokenExpiresAt && ['paid', 'fulfilled'].includes(booking.status)
      ? `Ce lien reste actif jusqu'au ${new Date(booking.accessTokenExpiresAt).toLocaleString('fr-FR')}.`
      : 'Conservez ce lien pour suivre votre réservation à tout moment.';

  return {
    trackUrl,
    text: [
      `Suivre ma réservation :`,
      trackUrl,
      note || expiryNote,
    ].join('\n'),
    // Bouton + URL en clair (certains clients mail cassent les boutons CSS)
    html: `
      <p style="margin:20px 0;">
        <a href="${trackUrl}"
           target="_blank"
           rel="noopener noreferrer"
           style="display:inline-block;padding:12px 20px;background:#e33a07;color:#ffffff !important;text-decoration:underline;border-radius:999px;font-weight:600;">
          Suivre ma réservation
        </a>
      </p>
      <p style="font-size:13px;line-height:1.5;color:#333;">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
        <a href="${trackUrl}" target="_blank" rel="noopener noreferrer" style="color:#e33a07;word-break:break-all;">${trackUrl}</a>
      </p>
      <p style="font-size:12px;color:#666;">${note || expiryNote}</p>
    `,
  };
}

/** Email client — créneau réservé 15 min avec lien sécurisé */
async function sendClientBookingCreatedEmail(booking) {
  const link = clientLinkBlock(booking, {
    note: `Vous avez ${env.bookingHoldMinutes} minutes pour confirmer votre demande sur la page de suivi.`,
  });
  const subject = `Votre réservation Marneza — ${booking.resource.name}`;
  const text = [
    `Bonjour ${booking.customer.firstName},`,
    '',
    'Votre créneau a été réservé. Voici votre lien personnel pour confirmer votre demande.',
    '',
    `Référence : ${bookingRef(booking)}`,
    `Espace : ${booking.resource.name}`,
    `Période : ${formatBookingPeriod(booking)}`,
    `Montant indicatif : ${Number(booking.totalAmount)} ${booking.currency}`,
    '',
    link.text,
    '',
    'Cordialement,',
    'L\'équipe Marneza',
  ].join('\n');

  const html = `
    <h2>Réservation enregistrée</h2>
    <p>Bonjour <strong>${booking.customer.firstName}</strong>,</p>
    <p>Votre créneau est réservé. Acceptez les conditions et confirmez votre demande via le lien ci-dessous.</p>
    <p><strong>Réf. :</strong> ${bookingRef(booking)}</p>
    <p><strong>Espace :</strong> ${booking.resource.name}</p>
    <p><strong>Période :</strong> ${formatBookingPeriod(booking)}</p>
    ${link.html}
  `;

  await sendEmail({ to: booking.customer.email, subject, text, html });
}

/** Email client — demande confirmée (conditions acceptées) */
async function sendClientSubmitConfirmedEmail(booking) {
  const link = clientLinkBlock(booking);
  const subject = `Demande confirmée — ${booking.resource.name}`;
  const text = [
    `Bonjour ${booking.customer.firstName},`,
    '',
    'Nous avons bien reçu votre demande de réservation. Notre équipe va l\'examiner.',
    '',
    `Référence : ${bookingRef(booking)}`,
    `Espace : ${booking.resource.name}`,
    `Période : ${formatBookingPeriod(booking)}`,
    '',
    link.text,
    '',
    'Cordialement,',
    'L\'équipe Marneza',
  ].join('\n');

  const html = `
    <h2>Demande confirmée</h2>
    <p>Bonjour <strong>${booking.customer.firstName}</strong>,</p>
    <p>Votre demande est en cours d'examen. Vous recevrez la synthèse de réservation par email dès validation.</p>
    <p><strong>Réf. :</strong> ${bookingRef(booking)}</p>
    <p><strong>Espace :</strong> ${booking.resource.name}</p>
    <p><strong>Période :</strong> ${formatBookingPeriod(booking)}</p>
    ${link.html}
  `;

  await sendEmail({ to: booking.customer.email, subject, text, html });
}

function formatFeeLinesBlock(booking) {
  const lines = booking.feeLines ?? [];
  if (lines.length === 0) return { text: '', html: '' };

  const text = [
    '── Détail ──',
    `Tarif de base : ${Number(booking.quotedAmount ?? booking.totalAmount)} ${booking.currency}`,
    ...lines.map((l) => `  + ${l.label} : ${Number(l.amount)} ${booking.currency}`),
    `Total : ${Number(booking.totalAmount)} ${booking.currency}`,
  ].join('\n');

  const rows = lines
    .map(
      (l) =>
        `<tr><td>${l.label}</td><td style="text-align:right;">${Number(l.amount)} ${booking.currency}</td></tr>`
    )
    .join('');

  const html = `
    <h4>Détail de la synthèse</h4>
    <table cellpadding="6" style="border-collapse:collapse;width:100%;max-width:420px;">
      <tr><td>Tarif de base</td><td style="text-align:right;">${Number(booking.quotedAmount ?? booking.totalAmount)} ${booking.currency}</td></tr>
      ${rows}
      <tr><td><strong>Total</strong></td><td style="text-align:right;"><strong>${Number(booking.totalAmount)} ${booking.currency}</strong></td></tr>
    </table>
  `;

  return { text, html };
}

async function sendClientInvoiceEmail(booking) {
  const pay = await paymentInstructionsBlock();
  const fees = formatFeeLinesBlock(booking);
  const trackUrl = clientBookingUrl(booking);
  const ref = bookingRef(booking);
  const templateService = require('./template.service');
  const tpl = await templateService.getTemplateOrDefault('reservation_summary');

  const vars = {
    firstName: booking.customer.firstName,
    resource: booking.resource.name,
    reference: ref,
    period: formatBookingPeriod(booking),
    amount: String(Number(booking.totalAmount)),
    currency: booking.currency,
    feeLines: fees.html,
    paymentBlock: pay.html,
    clientLink: clientLinkBlock(booking).html,
    clientLinkText: clientLinkBlock(booking).text,
  };

  if (tpl?.subject && tpl?.bodyHtml) {
    const rendered = templateService.renderTemplate('reservation_summary', vars, tpl);
    if (rendered) {
      await sendEmail({
        to: booking.customer.email,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      });
      return;
    }
  }

  const subject = `Synthèse de réservation Marneza — ${booking.resource.name} (réf. ${ref})`;
  const text = [
    `Bonjour ${booking.customer.firstName},`,
    '',
    'Voici la synthèse de votre réservation et les instructions pour régler.',
    '',
    `Référence : ${ref}`,
    `Espace : ${booking.resource.name}`,
    `Type : ${booking.bookingType.name}`,
    `Période : ${formatBookingPeriod(booking)}`,
    `Montant à régler : ${Number(booking.totalAmount)} ${booking.currency}`,
    booking.priceNote ? `Note : ${booking.priceNote}` : '',
    fees.text,
    '',
    pay.text,
    '',
    `Suivre ma réservation : ${trackUrl}`,
    '',
    'Après votre virement, cliquez sur « J\'ai effectué le paiement » sur la page de suivi.',
    '',
    'Cordialement,',
    'L\'équipe Marneza',
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <h2>Synthèse de réservation — Marneza</h2>
    <p>Bonjour <strong>${booking.customer.firstName}</strong>,</p>
    <p>Voici le récapitulatif et les instructions de paiement pour votre réservation.</p>
    <table cellpadding="6" style="border-collapse:collapse;">
      <tr><td><strong>Référence</strong></td><td>${ref}</td></tr>
      <tr><td><strong>Espace</strong></td><td>${booking.resource.name}</td></tr>
      <tr><td><strong>Type</strong></td><td>${booking.bookingType.name}</td></tr>
      <tr><td><strong>Période</strong></td><td>${formatBookingPeriod(booking)}</td></tr>
      <tr><td><strong>Montant</strong></td><td><strong>${Number(booking.totalAmount)} ${booking.currency}</strong></td></tr>
    </table>
    ${booking.priceNote ? `<p><em>${booking.priceNote}</em></p>` : ''}
    ${fees.html}
    ${pay.html}
    ${clientLinkBlock(booking).html}
  `;

  await sendEmail({ to: booking.customer.email, subject, text, html });
}

async function sendAdminPaymentClaimedEmail(booking) {
  const subject = `Paiement signalé par le client — ${booking.resource.name}`;
  const hasProof = Boolean(booking.paymentProofPath);
  const text = [
    'Le client indique avoir effectué le paiement. Vérifiez votre compte puis confirmez dans l\'admin.',
    hasProof ? 'Une preuve de paiement a été jointe (consultable dans l\'admin).' : '',
    '',
    `Référence : ${bookingRef(booking)}`,
    `Client : ${booking.customer.firstName} ${booking.customer.lastName} (${booking.customer.email})`,
    `Montant attendu : ${Number(booking.totalAmount)} ${booking.currency}`,
    '',
    `Admin : ${env.appUrl}/admin`,
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <h2>Paiement signalé par le client</h2>
    <p>Vérifiez la réception du virement / mobile money, puis confirmez le paiement dans l'administration.</p>
    ${hasProof ? '<p><strong>Preuve de paiement :</strong> jointe — consultez-la dans l\'admin.</p>' : ''}
    <p><strong>Réf. :</strong> ${bookingRef(booking)}</p>
    <p><strong>Client :</strong> ${booking.customer.email}</p>
    <p><strong>Montant :</strong> ${Number(booking.totalAmount)} ${booking.currency}</p>
    <p><a href="${env.appUrl}/admin">Confirmer dans l'admin</a></p>
  `;

  await sendEmail({ to: env.adminNotificationEmail, subject, text, html });
}

/** Accusé de réception au client après « J'ai effectué le paiement » */
async function sendClientPaymentClaimedAckEmail(booking) {
  const link = clientLinkBlock(booking);
  const subject = `Paiement reçu — en cours de vérification — ${booking.resource.name}`;
  const text = [
    `Bonjour ${booking.customer.firstName},`,
    '',
    'Nous avons bien enregistré votre signalement de paiement.',
    booking.paymentProofPath
      ? 'Votre preuve de paiement a bien été reçue.'
      : 'Astuce : la prochaine fois, vous pouvez joindre une capture ou un PDF depuis votre page de suivi (recommandé).',
    '',
    'Notre équipe vérifie la réception sur le compte. Vous recevrez un email dès que le paiement sera confirmé.',
    '',
    `Référence : ${bookingRef(booking)}`,
    `Montant : ${Number(booking.totalAmount)} ${booking.currency}`,
    '',
    link.text,
    '',
    'Cordialement,',
    'L\'équipe Marneza',
  ].join('\n');

  const html = `
    <h2>Paiement en cours de vérification</h2>
    <p>Bonjour <strong>${booking.customer.firstName}</strong>,</p>
    <p>Nous avons bien enregistré votre signalement de paiement.</p>
    ${
      booking.paymentProofPath
        ? '<p>Votre <strong>preuve de paiement</strong> a bien été reçue.</p>'
        : '<p>Astuce : joindre une capture ou un PDF lors du signalement facilite la vérification (recommandé).</p>'
    }
    <p>Notre équipe vérifie la réception. Vous recevrez un email dès confirmation.</p>
    <p><strong>Réf. :</strong> ${bookingRef(booking)}</p>
    <p><strong>Montant :</strong> ${Number(booking.totalAmount)} ${booking.currency}</p>
    ${link.html}
  `;

  await sendEmail({ to: booking.customer.email, subject, text, html });
}

async function sendClientPaymentConfirmedEmail(booking) {
  const link = clientLinkBlock(booking);
  const subject = `Paiement confirmé — vous avez réglé — ${booking.resource.name}`;
  const text = [
    `Bonjour ${booking.customer.firstName},`,
    '',
    'Votre paiement a été confirmé. Vous avez bien réglé votre réservation Marneza.',
    '',
    `Référence : ${bookingRef(booking)}`,
    `Espace : ${booking.resource.name}`,
    `Période : ${formatBookingPeriod(booking)}`,
    `Montant réglé : ${Number(booking.totalAmount)} ${booking.currency}`,
    '',
    link.text,
    '',
    'Merci de votre confiance,',
    'L\'équipe Marneza',
  ].join('\n');

  const html = `
    <h2>Paiement confirmé — vous avez réglé</h2>
    <p>Bonjour <strong>${booking.customer.firstName}</strong>,</p>
    <p>Votre paiement a été <strong>confirmé</strong> par notre équipe. Votre réservation est validée.</p>
    <p><strong>Réf. :</strong> ${bookingRef(booking)}</p>
    <p><strong>Espace :</strong> ${booking.resource.name}</p>
    <p><strong>Période :</strong> ${formatBookingPeriod(booking)}</p>
    <p><strong>Montant réglé :</strong> ${Number(booking.totalAmount)} ${booking.currency}</p>
    ${link.html}
  `;

  await sendEmail({ to: booking.customer.email, subject, text, html });
}

const REMINDER_LABELS = {
  '3days': { admin: 'J-3 — réservation dans 3 jours', client: 'Votre réservation approche (dans 3 jours)' },
  '1day': { admin: 'J-1 — réservation demain', client: 'Votre réservation est demain' },
  today: { admin: 'Jour J — réservation aujourd\'hui', client: 'Votre réservation est aujourd\'hui' },
};

async function sendBookingReminderEmails(booking, kind) {
  const labels = REMINDER_LABELS[kind];
  if (!labels) return;

  const trackUrl = clientBookingUrl(booking);
  const period = formatBookingPeriod(booking);

  // Un seul email : au client. L'admin a les alertes dashboard (J-3 / J-1 / jour-J).
  const clientSubject = `${labels.client} — ${booking.resource.name}`;
  const clientText = [
    `Bonjour ${booking.customer.firstName},`,
    '',
    labels.client,
    '',
    `Référence : ${bookingRef(booking)}`,
    `Espace : ${booking.resource.name}`,
    `Période : ${period}`,
    '',
    `Suivre ma réservation : ${trackUrl}`,
    '',
    'Cordialement,',
    'L\'équipe Marneza',
  ].join('\n');

  const clientHtml = `
    <h2>${labels.client}</h2>
    <p>Bonjour <strong>${booking.customer.firstName}</strong>,</p>
    <p>Nous vous rappelons votre réservation confirmée.</p>
    <p><strong>Réf. :</strong> ${bookingRef(booking)}</p>
    <p><strong>Espace :</strong> ${booking.resource.name}</p>
    <p><strong>Période :</strong> ${period}</p>
    <p><a href="${trackUrl}" target="_blank" rel="noopener noreferrer" style="color:#e33a07;word-break:break-all;">Voir ma réservation</a></p>
    <p style="font-size:12px;color:#666;">Lien : <a href="${trackUrl}" target="_blank" rel="noopener noreferrer" style="word-break:break-all;">${trackUrl}</a></p>
  `;

  await sendEmail({
    to: booking.customer.email,
    subject: clientSubject,
    text: clientText,
    html: clientHtml,
  });
}

/**
 * Code de récupération admin (reset mdp / identifiant oublié).
 */
async function sendAuthRecoveryCodeEmail({ to, purpose, code, firstName }) {
  const isPassword = purpose === 'password_reset';
  const subject = isPassword
    ? 'Marneza — Code de réinitialisation du mot de passe'
    : 'Marneza — Code de récupération d’identifiant';
  const action = isPassword
    ? 'réinitialiser votre mot de passe administrateur'
    : 'retrouver votre identifiant de connexion';
  const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,';

  const text = [
    greeting,
    '',
    `Vous avez demandé à ${action}.`,
    '',
    `Votre code de vérification (valide 15 minutes) : ${code}`,
    '',
    'Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.',
    '',
    '— L’équipe Marneza',
  ].join('\n');

  const html = `
    <p>${greeting}</p>
    <p>Vous avez demandé à <strong>${action}</strong>.</p>
    <p style="font-size:1.5rem;letter-spacing:0.2em;font-weight:700;margin:1.5rem 0;">
      ${code}
    </p>
    <p style="color:#666;font-size:0.9rem;">Ce code expire dans <strong>15 minutes</strong>.</p>
    <p style="color:#666;font-size:0.9rem;">Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.</p>
    <p>— L’équipe Marneza</p>
  `;

  await sendEmail({ to, subject, text, html });
}

/**
 * Révèle le(s) e-mail(s) de connexion après validation du code.
 */
async function sendAuthIdentifierRevealEmail({ to, loginEmails, firstName }) {
  const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,';
  const list = loginEmails.join(', ');
  const subject = 'Marneza — Votre identifiant de connexion';

  const text = [
    greeting,
    '',
    'Voici votre identifiant de connexion à l’espace d’administration Marneza :',
    '',
    list,
    '',
    'Vous pouvez vous connecter sur la page admin, puis modifier e-mail et mot de passe si besoin.',
    '',
    '— L’équipe Marneza',
  ].join('\n');

  const html = `
    <p>${greeting}</p>
    <p>Voici votre identifiant de connexion à l’espace d’administration Marneza :</p>
    <p style="font-size:1.1rem;font-weight:700;">${loginEmails.map((e) => `<code>${e}</code>`).join('<br/>')}</p>
    <p style="color:#666;font-size:0.9rem;">
      Connectez-vous sur la page admin, puis utilisez <strong>Mon compte</strong> pour modifier
      l’e-mail ou le mot de passe si besoin.
    </p>
    <p>— L’équipe Marneza</p>
  `;

  await sendEmail({ to, subject, text, html });
}

module.exports = {
  sendAdminNewBookingEmail,
  sendClientBookingCreatedEmail,
  sendClientSubmitConfirmedEmail,
  sendClientInvoiceEmail,
  sendAdminPaymentClaimedEmail,
  sendClientPaymentClaimedAckEmail,
  sendClientPaymentConfirmedEmail,
  sendBookingReminderEmails,
  sendAuthRecoveryCodeEmail,
  sendAuthIdentifierRevealEmail,
  verifyReviewToken,
  isMailConfigured,
  sendEmail,
};
