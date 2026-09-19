import type { FastifyBaseLogger } from 'fastify';
import nodemailer from 'nodemailer';
import { config } from './config';

const { smtp } = config;

const transport = smtp.host
  ? nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      // Le port 465 parle TLS d'emblée ; les autres passent en STARTTLS.
      secure: smtp.port === 465,
      auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
    })
  : null;

export async function sendMail(
  log: FastifyBaseLogger,
  message: { to: string; subject: string; text: string },
): Promise<void> {
  if (!transport) {
    // Sans SMTP, la personne qui gère le serveur lit le message dans les journaux et le transmet à la main.
    log.warn(`SMTP non configuré, e-mail non envoyé à ${message.to} :\n${message.text}`);
    return;
  }
  await transport.sendMail({ from: smtp.from, ...message });
}
