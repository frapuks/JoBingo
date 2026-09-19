import { PushSubscriptionInput, PushUnsubscribeInput, type PushConfig } from '@jobingo/shared';
import type { FastifyInstance } from 'fastify';
import { currentUser, requireAuth } from '../auth/guards';
import { config } from '../config';
import { pool } from '../db/pool';
import { pushEnabled } from '../push';

// Sur iPhone, l'abonnement n'est possible que si l'app a été installée sur l'écran
// d'accueil : dans Safari, l'API Push n'existe tout simplement pas.
export async function pushRoutes(app: FastifyInstance) {
  app.get('/push/config', async (): Promise<PushConfig> => ({
    enabled: pushEnabled,
    publicKey: pushEnabled ? config.vapid.publicKey : null,
  }));

  app.post('/push/subscriptions', { preHandler: requireAuth }, async (request, reply) => {
    if (!pushEnabled) return reply.code(503).send({ error: 'Notifications non configurées.' });
    const input = PushSubscriptionInput.parse(request.body);
    // Un même appareil peut changer de compte : l'abonnement suit le dernier utilisateur.
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint) DO UPDATE SET user_id = $1, p256dh = $3, auth = $4`,
      [currentUser(request).id, input.endpoint, input.keys.p256dh, input.keys.auth],
    );
    return reply.code(204).send();
  });

  app.delete('/push/subscriptions', { preHandler: requireAuth }, async (request, reply) => {
    const input = PushUnsubscribeInput.parse(request.body);
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2', [
      input.endpoint,
      currentUser(request).id,
    ]);
    return reply.code(204).send();
  });
}
