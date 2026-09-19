import type { HealthResponse } from '@jobingo/shared';
import type { FastifyInstance } from 'fastify';
import { pool } from '../db/pool';

export async function healthRoutes(app: FastifyInstance) {
  // Appelée toutes les 10 s par le healthcheck Docker : on ne journalise que les problèmes.
  app.get('/health', { logLevel: 'warn' }, async (request, reply): Promise<HealthResponse> => {
    try {
      const { rows } = await pool.query<{ count: number }>('SELECT count(name)::int AS count FROM _migrations');
      return { status: 'ok', database: 'ok', migrations: rows[0]?.count ?? 0 };
    } catch (err) {
      request.log.warn({ err }, 'Base injoignable');
      reply.code(503);
      return { status: 'degraded', database: 'unreachable', migrations: null };
    }
  });
}
