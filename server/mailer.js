// Outbound mail (docs/ACCOUNT_EMAIL.md). TLS is mandatory, sending is rate
// limited and neither credentials nor message content are logged.
import nodemailer from 'nodemailer';
import { readFileSync } from 'node:fs';

const secret = (env, key) => env[`${key}_FILE`] ? readFileSync(env[`${key}_FILE`], 'utf8').trim() : env[key] || '';
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const oneLine = value => String(value ?? '').replace(/[\r\n\p{Zl}\p{Zp}]+/gu, ' ').replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);

export function readSmtpConfig(env = process.env) {
  if (!env.POKEVAULT_SMTP_HOST) return null;
  const port = Number(env.POKEVAULT_SMTP_PORT || 587), from = env.POKEVAULT_SMTP_FROM || env.POKEVAULT_SMTP_USER;
  if (![465, 587].includes(port)) throw new Error('POKEVAULT_SMTP_PORT debe ser 465 (TLS) o 587 (STARTTLS). No se admite SMTP sin cifrar.');
  if (!from || /[\r\n]/.test(from)) throw new Error('Configura POKEVAULT_SMTP_FROM con una dirección válida.');
  return { host: env.POKEVAULT_SMTP_HOST, port, user: env.POKEVAULT_SMTP_USER || '', pass: secret(env, 'POKEVAULT_SMTP_PASSWORD'), from };
}

export function createMailer(config, { transport, now = Date.now, limits = { total: 20, security: 5 } } = {}) {
  if (!config && !transport) return null;
  const send = transport || nodemailer.createTransport({
    host: config.host, port: config.port, secure: config.port === 465, requireTLS: config.port !== 465,
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true }, connectionTimeout: 15_000, greetingTimeout: 15_000, socketTimeout: 30_000,
  });
  const sent = [];
  return {
    async send({ to, subject, text, html, kind, security = false }) {
      const hour = now() - 3_600_000; while (sent.length && sent[0].at < hour) sent.shift();
      if (sent.length >= limits.total || (security && sent.filter(s => s.security).length >= limits.security)) { console.warn('mail dropped', kind, 'rate_limit'); return false; }
      sent.push({ at: now(), security });
      try {
        await send.sendMail({ from: config?.from || 'PokéVault <pokevault@localhost>', to, subject: oneLine(subject), text, html });
        console.info('mail sent', kind); return true;
      } catch (error) { console.warn('mail failed', kind, error.code || 'error'); return false; }
    },
  };
}

// Plain-text and HTML with every dynamic value escaped. No remote images or tracking.
export function message(title, paragraphs, { link, linkLabel, footer = 'PokéVault · tu banco personal' } = {}) {
  const text = [title, '', ...paragraphs, ...(link ? ['', `${linkLabel}: ${link}`] : []), '', footer].join('\n');
  const html = `<!doctype html><html lang="es"><body style="font-family:system-ui,sans-serif;color:#191b22;background:#f6f3f4;padding:24px">`
    + `<div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;padding:24px;border-top:6px solid #b52538">`
    + `<h1 style="font-size:20px;margin:0 0 12px">${escapeHTML(title)}</h1>`
    + paragraphs.map(p => `<p style="line-height:1.5">${escapeHTML(p)}</p>`).join('')
    + (link ? `<p><a href="${escapeHTML(link)}" style="display:inline-block;background:#b52538;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">${escapeHTML(linkLabel)}</a></p>` : '')
    + `<p style="color:#626773;font-size:12px">${escapeHTML(footer)}</p></div></body></html>`;
  return { subject: title, text, html };
}
