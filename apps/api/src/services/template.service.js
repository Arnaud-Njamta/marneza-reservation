/**
 * Templates email — stockage admin + substitution variables.
 *
 * @module services/template.service
 */

const prisma = require('../config/database');

const DEFAULT_TEMPLATES = [
  {
    code: 'reservation_summary',
    name: 'Synthèse de réservation (email client)',
    subject: 'Synthèse de réservation Marneza — {{resource}} (réf. {{reference}})',
    bodyHtml: `<p>Bonjour <strong>{{firstName}}</strong>,</p>
<p>Voici la <strong>synthèse de votre réservation</strong> pour <strong>{{resource}}</strong>.</p>
<p><strong>Référence :</strong> {{reference}}<br/>
<strong>Période :</strong> {{period}}<br/>
<strong>Montant à régler :</strong> {{amount}} {{currency}}</p>
{{feeLines}}
{{paymentBlock}}
{{clientLink}}
<p>Cordialement,<br/>L'équipe Marneza</p>`,
    bodyText: `Bonjour {{firstName}},\n\nSynthèse de réservation — {{resource}}\nRéférence : {{reference}}\nPériode : {{period}}\nMontant : {{amount}} {{currency}}\n\n{{clientLinkText}}\n\nL'équipe Marneza`,
  },
  {
    code: 'reminder_j3',
    name: 'Rappel J-3',
    subject: 'Rappel — votre réservation {{resource}} dans 3 jours',
    bodyHtml: `<p>Bonjour <strong>{{firstName}}</strong>,</p>
<p>Votre réservation <strong>{{resource}}</strong> a lieu dans <strong>3 jours</strong>.</p>
<p><strong>Référence :</strong> {{reference}}<br/><strong>Période :</strong> {{period}}</p>
{{clientLink}}`,
    bodyText: `Bonjour {{firstName}},\n\nRappel : réservation {{resource}} dans 3 jours.\nRéf. {{reference}}\n{{period}}\n\n{{clientLinkText}}`,
  },
  {
    code: 'synthesis_email',
    name: 'Email synthèse période (admin → équipe)',
    subject: 'Synthèse réservations — {{horizonLabel}}',
    bodyHtml: `<p>Bonjour,</p>
<p>Synthèse des réservations pour <strong>{{horizonLabel}}</strong> :</p>
<p><strong>{{count}}</strong> réservation(s) — total <strong>{{totalAmount}} {{currency}}</strong></p>
{{bookingList}}`,
    bodyText: `Synthèse {{horizonLabel}} : {{count}} réservation(s), total {{totalAmount}} {{currency}}`,
  },
];

function substitute(template, vars) {
  if (!template) return '';
  let out = String(template);
  for (const [key, val] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(val == null ? '' : String(val));
  }
  return out;
}

async function getTemplate(code) {
  return prisma.emailTemplate.findUnique({ where: { code } });
}

async function getTemplateOrDefault(code) {
  const t = await getTemplate(code);
  if (t?.isActive) return t;
  const def = DEFAULT_TEMPLATES.find((d) => d.code === code);
  return def ?? null;
}

async function listTemplates() {
  const rows = await prisma.emailTemplate.findMany({ orderBy: { code: 'asc' } });
  if (rows.length === 0) return DEFAULT_TEMPLATES.map((d) => ({ ...d, id: null, isActive: true, useRichEditor: true }));
  return rows;
}

async function upsertTemplate(code, data) {
  const existing = await prisma.emailTemplate.findUnique({ where: { code } });
  const payload = {
    code,
    name: data.name,
    subject: data.subject,
    bodyHtml: data.bodyHtml,
    bodyText: data.bodyText ?? null,
    useRichEditor: data.useRichEditor !== false,
    isActive: data.isActive !== false,
  };

  if (existing) {
    return prisma.emailTemplate.update({ where: { code }, data: payload });
  }
  return prisma.emailTemplate.create({ data: payload });
}

async function seedDefaultTemplates() {
  for (const t of DEFAULT_TEMPLATES) {
    await prisma.emailTemplate.upsert({
      where: { code: t.code },
      create: t,
      update: {},
    });
  }
}

function renderTemplate(code, vars, templateRow) {
  const tpl = templateRow;
  if (!tpl) return null;

  const subject = substitute(tpl.subject || '', vars);
  const bodyHtml = tpl.bodyHtml || '';
  const bodyText = tpl.bodyText || '';

  if (!tpl.useRichEditor && bodyText) {
    const text = substitute(bodyText, vars);
    return {
      subject,
      html: `<pre style="font-family:sans-serif;white-space:pre-wrap">${text}</pre>`,
      text,
    };
  }

  const html = substitute(bodyHtml, vars);
  const text = substitute(bodyText || bodyHtml.replace(/<[^>]+>/g, ''), vars);
  return { subject, html, text };
}

module.exports = {
  getTemplate,
  getTemplateOrDefault,
  listTemplates,
  upsertTemplate,
  seedDefaultTemplates,
  renderTemplate,
  substitute,
  DEFAULT_TEMPLATES,
};
