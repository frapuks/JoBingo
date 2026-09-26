import {
  PatternApproveInput,
  PatternInput,
  PlayerInput,
  type PendingPattern,
  type Player,
  type PlayerDetail,
  type PlayerSummary,
} from '@jobingo/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { currentUser, requireAdmin, requireAuth } from '../auth/guards';
import { pool } from '../db/pool';
import { notifyUsers } from '../push';

const IdParam = z.object({ id: z.coerce.number().int().positive() });

function idOf(request: FastifyRequest): number {
  return IdParam.parse(request.params).id;
}

interface PlayerRow {
  id: number;
  name: string;
  number: number;
}

export async function teamRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/players', async (): Promise<PlayerSummary[]> => {
    const { rows } = await pool.query<PlayerRow & { approved: number; pending: number }>(
      `SELECT p.id, p.name, p.number,
              count(pat.id) FILTER (WHERE pat.approved_at IS NOT NULL)::int AS approved,
              count(pat.id) FILTER (WHERE pat.approved_at IS NULL)::int AS pending
       FROM players p
       LEFT JOIN patterns pat ON pat.player_id = p.id
       GROUP BY p.id
       ORDER BY p.number, p.name`,
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      number: row.number,
      approvedPatterns: row.approved,
      pendingPatterns: row.pending,
    }));
  });

  app.get('/players/:id', async (request, reply): Promise<PlayerDetail> => {
    const id = idOf(request);
    const { rows } = await pool.query<PlayerRow>('SELECT id, name, number FROM players WHERE id = $1', [id]);
    const player = rows[0];
    if (!player) return reply.code(404).send({ error: 'Joueur introuvable.' });

    // Les patterns validés d'abord, puis les propositions en attente, du plus ancien au plus récent.
    const { rows: patterns } = await pool.query<{ id: number; text: string; approved_at: Date | null }>(
      `SELECT id, text, approved_at FROM patterns
       WHERE player_id = $1
       ORDER BY (approved_at IS NULL), created_at`,
      [id],
    );
    return {
      ...player,
      patterns: patterns.map((row) => ({
        id: row.id,
        text: row.text,
        status: row.approved_at ? 'APPROVED' : 'PENDING',
      })),
    };
  });

  app.post('/players', { preHandler: requireAdmin }, async (request): Promise<Player> => {
    const input = PlayerInput.parse(request.body);
    const { rows } = await pool.query<PlayerRow>(
      'INSERT INTO players (name, number) VALUES ($1, $2) RETURNING id, name, number',
      [input.name, input.number],
    );
    return rows[0];
  });

  app.patch('/players/:id', { preHandler: requireAdmin }, async (request, reply): Promise<Player> => {
    const input = PlayerInput.parse(request.body);
    const { rows } = await pool.query<PlayerRow>(
      'UPDATE players SET name = $2, number = $3 WHERE id = $1 RETURNING id, name, number',
      [idOf(request), input.name, input.number],
    );
    if (!rows[0]) return reply.code(404).send({ error: 'Joueur introuvable.' });
    return rows[0];
  });

  app.delete('/players/:id', { preHandler: requireAdmin }, async (request, reply) => {
    await pool.query('DELETE FROM players WHERE id = $1', [idOf(request)]);
    return reply.code(204).send();
  });

  // Un pattern proposé par l'administrateur est validé d'emblée.
  app.post('/players/:id/patterns', async (request, reply) => {
    const input = PatternInput.parse(request.body);
    const user = currentUser(request);
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO patterns (player_id, text, submitted_by, approved_at)
       SELECT id, $2, $3, CASE WHEN $4 THEN now() END FROM players WHERE id = $1
       RETURNING id`,
      [idOf(request), input.text, user.id, user.isAdmin],
    );
    if (!rows[0]) return reply.code(404).send({ error: 'Joueur introuvable.' });
    return reply.code(204).send();
  });

  app.get('/patterns/pending', { preHandler: requireAdmin }, async (): Promise<PendingPattern[]> => {
    const { rows } = await pool.query<{
      id: number;
      text: string;
      player_id: number;
      player_name: string;
      player_number: number;
    }>(
      `SELECT pat.id, pat.text, p.id AS player_id, p.name AS player_name, p.number AS player_number
       FROM patterns pat
       JOIN players p ON p.id = pat.player_id
       WHERE pat.approved_at IS NULL
       ORDER BY pat.created_at`,
    );
    return rows.map((row) => ({
      id: row.id,
      text: row.text,
      status: 'PENDING',
      player: { id: row.player_id, name: row.player_name, number: row.player_number },
    }));
  });

  app.post('/patterns/:id/approve', { preHandler: requireAdmin }, async (request, reply) => {
    const input = PatternApproveInput.parse(request.body ?? {});
    const { rowCount } = await pool.query(
      'UPDATE patterns SET text = coalesce($2, text), approved_at = now() WHERE id = $1 AND approved_at IS NULL',
      [idOf(request), input.text ?? null],
    );
    if (!rowCount) return reply.code(404).send({ error: 'Proposition introuvable.' });
    return reply.code(204).send();
  });

  app.patch('/patterns/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const input = PatternInput.parse(request.body);
    const { rowCount } = await pool.query('UPDATE patterns SET text = $2 WHERE id = $1', [
      idOf(request),
      input.text,
    ]);
    if (!rowCount) return reply.code(404).send({ error: 'Pattern introuvable.' });
    return reply.code(204).send();
  });

  // Refuser une proposition, c'est la supprimer : son auteur est prévenu s'il est abonné.
  app.delete('/patterns/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { rows } = await pool.query<{ text: string; submitted_by: number | null; approved_at: Date | null }>(
      'DELETE FROM patterns WHERE id = $1 RETURNING text, submitted_by, approved_at',
      [idOf(request)],
    );
    const pattern = rows[0];
    if (pattern?.submitted_by && !pattern.approved_at) {
      notifyUsers(request.log, [pattern.submitted_by], {
        title: 'Proposition refusée',
        body: pattern.text,
      }).catch((err) => request.log.error({ err }, 'Notification de refus non envoyée'));
    }
    return reply.code(204).send();
  });
}
