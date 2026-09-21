import { createHash, randomBytes } from 'node:crypto';
import {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  type User,
} from '@jobingo/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { currentUser, requireAuth } from '../auth/guards';
import { burnPasswordCheck, hashPassword, verifyPassword } from '../auth/password';
import { closeSession, openSession } from '../auth/session';
import { config } from '../config';
import { pool, withTransaction } from '../db/pool';
import { sendMail } from '../mail';
import { toUser, USER_COLUMNS, type UserRow } from '../users';

const RESET_TOKEN_MINUTES = 60;

// Limite par adresse visée plutôt que par IP : derrière deux proxys, l'IP d'origine
// n'est pas fiable, alors que l'adresse est exactement ce qu'un attaquant doit viser.
function emailKey(request: FastifyRequest): string {
  const email = (request.body as { email?: unknown } | undefined)?.email;
  return typeof email === 'string' ? email.trim().toLowerCase() : request.ip;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export async function authRoutes(app: FastifyInstance) {
  app.post(
    '/auth/register',
    { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } },
    async (request, reply): Promise<User> => {
      const input = RegisterInput.parse(request.body);
      const passwordHash = await hashPassword(input.password);

      const { rows } = await pool.query<UserRow>(
        `INSERT INTO users (email, password_hash)
         VALUES ($1, $2)
         ON CONFLICT (email) DO NOTHING
         RETURNING ${USER_COLUMNS}`,
        [input.email, passwordHash],
      );
      const row = rows[0];

      if (!row) return reply.code(409).send({ error: 'Un compte existe déjà avec cette adresse.' });
      await openSession(reply, { userId: row.id, tokenVersion: row.token_version });
      return toUser(row);
    },
  );

  app.post(
    '/auth/login',
    { config: { rateLimit: { max: 10, timeWindow: '15 minutes', keyGenerator: emailKey } } },
    async (request, reply): Promise<User> => {
      const input = LoginInput.parse(request.body);
      const { rows } = await pool.query<UserRow & { password_hash: string }>(
        `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = $1`,
        [input.email],
      );
      const row = rows[0];

      if (!row) {
        await burnPasswordCheck(input.password);
      }
      if (!row || !(await verifyPassword(input.password, row.password_hash))) {
        return reply.code(401).send({ error: 'Adresse e-mail ou mot de passe incorrect.' });
      }
      await openSession(reply, { userId: row.id, tokenVersion: row.token_version });
      return toUser(row);
    },
  );

  app.post('/auth/logout', async (_request, reply) => {
    closeSession(reply);
    return reply.code(204).send();
  });

  app.get('/auth/me', { preHandler: requireAuth }, async (request): Promise<User> => currentUser(request));

  app.post(
    '/auth/change-password',
    { preHandler: requireAuth, config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } },
    async (request, reply): Promise<User> => {
      const input = ChangePasswordInput.parse(request.body);
      const { id } = currentUser(request);
      const { rows } = await pool.query<{ password_hash: string }>(
        'SELECT password_hash FROM users WHERE id = $1',
        [id],
      );
      // Mot de passe actuel exigé : un téléphone resté déverrouillé ne suffit pas à prendre le compte.
      if (!rows[0] || !(await verifyPassword(input.currentPassword, rows[0].password_hash))) {
        return reply.code(400).send({ error: 'Mot de passe actuel incorrect.' });
      }

      // token_version incrémentée : les autres appareils sont déconnectés, celui-ci reçoit un jeton neuf.
      const { rows: updated } = await pool.query<UserRow>(
        `UPDATE users SET password_hash = $2, token_version = token_version + 1
         WHERE id = $1
         RETURNING ${USER_COLUMNS}`,
        [id, await hashPassword(input.password)],
      );
      const row = updated[0];
      await openSession(reply, { userId: row.id, tokenVersion: row.token_version });
      return toUser(row);
    },
  );

  app.post(
    '/auth/forgot-password',
    { config: { rateLimit: { max: 3, timeWindow: '15 minutes', keyGenerator: emailKey } } },
    async (request, reply) => {
      const input = ForgotPasswordInput.parse(request.body);
      const { rows } = await pool.query<{ id: number }>('SELECT id FROM users WHERE email = $1', [input.email]);
      const user = rows[0];

      if (user) {
        const token = randomBytes(32).toString('base64url');
        await pool.query(
          `INSERT INTO password_resets (token_hash, user_id, expires_at)
           VALUES ($1, $2, now() + make_interval(mins => $3))`,
          [sha256(token), user.id, RESET_TOKEN_MINUTES],
        );
        const link = `${config.appUrl}/reinitialisation?jeton=${token}`;
        // Envoi non attendu : la réponse part aussi vite que pour une adresse inconnue.
        sendMail(request.log, {
          to: input.email,
          subject: 'JoBingo : réinitialisation du mot de passe',
          text:
            `Bonjour,\n\nPour choisir un nouveau mot de passe, ouvrez ce lien ` +
            `(valable ${RESET_TOKEN_MINUTES} minutes) :\n\n${link}\n\n` +
            `Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
        }).catch((err) => request.log.error({ err }, 'Échec de l\'envoi du mail de réinitialisation'));
      }
      // Même réponse que l'adresse existe ou non : on ne révèle pas qui est inscrit.
      return reply.code(204).send();
    },
  );

  app.post(
    '/auth/reset-password',
    { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } },
    async (request, reply): Promise<User> => {
      const input = ResetPasswordInput.parse(request.body);
      const passwordHash = await hashPassword(input.password);

      const row = await withTransaction(async (client) => {
        const { rows: resets } = await client.query<{ user_id: number }>(
          `UPDATE password_resets SET used_at = now()
           WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
           RETURNING user_id`,
          [sha256(input.token)],
        );
        const reset = resets[0];
        if (!reset) return null;

        await client.query(
          'UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL',
          [reset.user_id],
        );
        // token_version incrémentée : un mot de passe compromis ne laisse aucune session ouverte ailleurs.
        const { rows } = await client.query<UserRow>(
          `UPDATE users SET password_hash = $2, token_version = token_version + 1
           WHERE id = $1
           RETURNING ${USER_COLUMNS}`,
          [reset.user_id, passwordHash],
        );
        return rows[0] ?? null;
      });

      if (!row) return reply.code(400).send({ error: 'Ce lien est invalide ou a expiré.' });
      await openSession(reply, { userId: row.id, tokenVersion: row.token_version });
      return toUser(row);
    },
  );
}
