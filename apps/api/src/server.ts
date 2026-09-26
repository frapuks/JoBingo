import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyError } from 'fastify';
import { ZodError } from 'zod';
import { syncAdmins } from './admins';
import { config } from './config';
import { pool } from './db/pool';
import { authRoutes } from './routes/auth';
import { healthRoutes } from './routes/health';
import { matchRoutes } from './routes/matches';
import { pushRoutes } from './routes/push';
import { teamRoutes } from './routes/team';

const app = Fastify({ logger: true, trustProxy: true });

app.decorateRequest('user', null);
await app.register(cookie);
await app.register(rateLimit, {
  global: false,
  // preHandler plutôt que onRequest : le corps est lu, on peut limiter par adresse e-mail.
  hook: 'preHandler',
  errorResponseBuilder: () =>
    Object.assign(new Error('Trop de tentatives. Réessayez dans quelques minutes.'), { statusCode: 429 }),
});

// Toutes les erreurs sortent sous la forme { error } attendue par le front (ApiErrorBody).
app.setErrorHandler((error: FastifyError, request, reply) => {
  if (error instanceof ZodError) {
    return reply.code(400).send({ error: error.issues[0]?.message ?? 'Requête invalide.' });
  }
  if (error.statusCode && error.statusCode < 500) {
    // Les messages internes de Fastify (JSON mal formé…) sont en anglais et techniques.
    const message = error.code?.startsWith('FST_') ? 'Requête invalide.' : error.message;
    return reply.code(error.statusCode).send({ error: message });
  }
  request.log.error(error);
  return reply.code(500).send({ error: 'Erreur interne du serveur.' });
});

app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: 'Ressource introuvable.' }));

await app.register(healthRoutes, { prefix: '/api' });
await app.register(authRoutes, { prefix: '/api' });
await app.register(pushRoutes, { prefix: '/api' });
await app.register(teamRoutes, { prefix: '/api' });
await app.register(matchRoutes, { prefix: '/api' });

// Recalculé au démarrage : le rôle admin ne dépend que d'ADMIN_EMAILS.
app.log.info(`Rôles administrateur synchronisés (${await syncAdmins()} compte(s) modifié(s))`);

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, async () => {
    await app.close();
    await pool.end();
    process.exit(0);
  });
}

await app.listen({ host: '0.0.0.0', port: config.port });
