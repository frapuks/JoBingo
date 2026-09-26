import {
  MatchInput,
  type MatchCard,
  type MatchDetail,
  type MatchStatus,
  type MatchSummary,
  type RankingRow,
} from '@jobingo/shared';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { currentUser, requireAuth } from '../auth/guards';
import { pool, withTransaction } from '../db/pool';
import { notifyEveryone, notifyMatchParticipants } from '../push';

const IdParam = z.object({ id: z.coerce.number().int().positive() });
const CheckParams = z.object({
  id: z.coerce.number().int().positive(),
  cardId: z.coerce.number().int().positive(),
});
const GridParams = z.object({
  id: z.coerce.number().int().positive(),
  userId: z.coerce.number().int().positive(),
});

// Statut réel : un match lancé depuis plus de 4 h est terminé, même si personne n'a sifflé.
const STATUS = 'effective_match_status(m.status, m.started_at)';

const PLAYING: MatchStatus[] = ['FIRST_HALF', 'SECOND_HALF'];

interface MatchRow {
  id: number;
  name: string;
  status: MatchStatus;
  creator_name: string | null;
  participants: number;
  joined: boolean;
  is_creator: boolean;
}

function toSummary(row: MatchRow): MatchSummary {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    creatorName: row.creator_name,
    participants: row.participants,
    joined: row.joined,
    isCreator: row.is_creator,
  };
}

const MATCH_SELECT = `
  SELECT m.id, m.name, ${STATUS} AS status, coalesce(u.display_name, u.email) AS creator_name,
         (SELECT count(*)::int FROM match_participants mp WHERE mp.match_id = m.id) AS participants,
         EXISTS (SELECT 1 FROM match_participants mp WHERE mp.match_id = m.id AND mp.user_id = $1) AS joined,
         m.created_by = $1 AS is_creator
  FROM matches m
  LEFT JOIN users u ON u.id = m.created_by`;

async function loadMatch(matchId: number, userId: number): Promise<MatchRow | null> {
  const { rows } = await pool.query<MatchRow>(`${MATCH_SELECT} WHERE m.id = $2`, [userId, matchId]);
  return rows[0] ?? null;
}

async function loadCards(matchId: number, userId: number): Promise<MatchCard[]> {
  const { rows } = await pool.query<{
    id: number;
    player_number: number;
    player_name: string;
    pattern_text: string | null;
    checked: boolean;
  }>(
    `SELECT p.id, p.player_number, p.player_name, p.pattern_text,
            EXISTS (SELECT 1 FROM match_checks c WHERE c.match_player_id = p.id AND c.user_id = $2) AS checked
     FROM match_players p
     WHERE p.match_id = $1
     ORDER BY p.player_number, p.player_name`,
    [matchId, userId],
  );
  return rows.map((row) => ({
    id: row.id,
    number: row.player_number,
    name: row.player_name,
    pattern: row.pattern_text,
    checked: row.checked,
  }));
}

async function loadRanking(matchId: number, userId: number): Promise<RankingRow[]> {
  const { rows } = await pool.query<{ user_id: number; name: string; score: number }>(
    `SELECT part.user_id, coalesce(u.display_name, u.email) AS name, count(c.match_player_id)::int AS score
     FROM match_participants part
     JOIN users u ON u.id = part.user_id
     LEFT JOIN match_players p ON p.match_id = part.match_id
     LEFT JOIN match_checks c ON c.match_player_id = p.id AND c.user_id = part.user_id
     WHERE part.match_id = $1
     GROUP BY part.user_id, u.display_name, u.email
     ORDER BY score DESC, max(c.checked_at) NULLS LAST, name`,
    [matchId],
  );
  return rows.map((row, index) => ({
    rank: index + 1,
    userId: row.user_id,
    name: row.name,
    score: row.score,
    isMe: row.user_id === userId,
  }));
}

async function loadParticipants(matchId: number): Promise<string[]> {
  const { rows } = await pool.query<{ name: string }>(
    `SELECT coalesce(u.display_name, u.email) AS name
     FROM match_participants part
     JOIN users u ON u.id = part.user_id
     WHERE part.match_id = $1
     ORDER BY part.joined_at`,
    [matchId],
  );
  return rows.map((row) => row.name);
}

async function loadPlayerIds(matchId: number): Promise<number[]> {
  const { rows } = await pool.query<{ player_id: number }>(
    'SELECT player_id FROM match_players WHERE match_id = $1 AND player_id IS NOT NULL',
    [matchId],
  );
  return rows.map((row) => row.player_id);
}

// Convoque les joueurs retenus, en écartant ceux qui n'ont aucun pattern validé.
async function setMatchPlayers(client: PoolClient, matchId: number, playerIds: number[]): Promise<number> {
  const { rowCount } = await client.query(
    `INSERT INTO match_players (match_id, player_id, player_name, player_number)
     SELECT $1, p.id, p.name, p.number
     FROM players p
     WHERE p.id = ANY($2::int[])
       AND EXISTS (SELECT 1 FROM patterns pat WHERE pat.player_id = p.id AND pat.approved_at IS NOT NULL)`,
    [matchId, playerIds],
  );
  return rowCount ?? 0;
}

// Seul le créateur, ou l'administrateur, fait avancer un match.
async function requireHost(request: FastifyRequest, reply: FastifyReply, matchId: number) {
  const user = currentUser(request);
  const match = await loadMatch(matchId, user.id);
  if (!match) {
    reply.code(404).send({ error: 'Match introuvable.' });
    return null;
  }
  if (!match.is_creator && !user.isAdmin) {
    reply.code(403).send({ error: 'Réservé au créateur du match.' });
    return null;
  }
  return match;
}

const ANNOUNCEMENTS: Partial<Record<MatchStatus, string>> = {
  FIRST_HALF: 'Le match est lancé.',
  HALF_TIME: 'Mi-temps, les scores sont visibles.',
  SECOND_HALF: 'Deuxième mi-temps !',
  FINISHED: 'Match terminé, voici le classement.',
};

// L'envoi n'est jamais attendu : une notification perdue ne doit pas retarder le match.
function announce(request: FastifyRequest, matchId: number, name: string, status: MatchStatus) {
  const body = ANNOUNCEMENTS[status];
  if (!body) return;
  notifyMatchParticipants(request.log, matchId, currentUser(request).id, {
    title: name,
    body,
    url: `/matchs/${matchId}`,
  }).catch((err) => request.log.error({ err }, 'Notification de match non envoyée'));
}

async function setStatus(
  request: FastifyRequest,
  reply: FastifyReply,
  from: MatchStatus[],
  to: MatchStatus,
) {
  const matchId = IdParam.parse(request.params).id;
  const match = await requireHost(request, reply, matchId);
  if (!match) return reply;
  if (!from.includes(match.status)) {
    return reply.code(409).send({ error: "Le match n'est pas dans l'état attendu." });
  }
  await pool.query(
    // Le transtypage est explicite : sans lui, $2 serait déduit deux fois, en enum puis en texte.
    `UPDATE matches
     SET status = $2::match_status,
         finished_at = CASE WHEN $2::match_status = 'FINISHED' THEN now() ELSE finished_at END
     WHERE id = $1`,
    [matchId, to],
  );
  announce(request, matchId, match.name, to);
  return reply.code(204).send();
}

// Un pattern au hasard par joueur, parmi les patterns validés au moment du coup d'envoi.
async function drawPatterns(client: PoolClient, matchId: number): Promise<number> {
  await client.query(
    `UPDATE match_players mp
     SET pattern_id = tirage.pattern_id, pattern_text = tirage.text
     FROM (
       SELECT DISTINCT ON (candidat.id) candidat.id AS match_player_id, pat.id AS pattern_id, pat.text
       FROM match_players candidat
       JOIN patterns pat ON pat.player_id = candidat.player_id AND pat.approved_at IS NOT NULL
       WHERE candidat.match_id = $1
       ORDER BY candidat.id, random()
     ) tirage
     WHERE mp.id = tirage.match_player_id`,
    [matchId],
  );
  // Un joueur dont le dernier pattern a été supprimé entre-temps quitte la grille.
  await client.query('DELETE FROM match_players WHERE match_id = $1 AND pattern_text IS NULL', [matchId]);
  const { rows } = await client.query<{ count: number }>(
    'SELECT count(*)::int AS count FROM match_players WHERE match_id = $1',
    [matchId],
  );
  return rows[0].count;
}

export async function matchRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/matches', async (request): Promise<MatchSummary[]> => {
    // Un match créé puis jamais lancé disparaît au bout de 24 h.
    await pool.query(
      "DELETE FROM matches WHERE status = 'PENDING' AND created_at < now() - interval '24 hours'",
    );
    const { rows } = await pool.query<MatchRow>(
      `${MATCH_SELECT} ORDER BY m.created_at DESC`,
      [currentUser(request).id],
    );
    return rows.map(toSummary);
  });

  app.post('/matches', async (request): Promise<MatchSummary> => {
    const input = MatchInput.parse(request.body);
    const user = currentUser(request);

    const matchId = await withTransaction(async (client) => {
      const { rows } = await client.query<{ id: number }>(
        'INSERT INTO matches (name, created_by) VALUES ($1, $2) RETURNING id',
        [input.name, user.id],
      );
      const id = rows[0].id;
      // Nom et numéro sont copiés dès la création : ils ne bougent plus ensuite.
      const retained = await setMatchPlayers(client, id, input.playerIds);
      if (!retained) throw Object.assign(new Error('Aucun joueur retenu n\'a de pattern validé.'), { statusCode: 400 });
      // Le créateur joue aussi.
      await client.query('INSERT INTO match_participants (match_id, user_id) VALUES ($1, $2)', [id, user.id]);
      return id;
    });

    // Tout le monde est prévenu : c'est ce qui permet de rejoindre avant le coup d'envoi.
    notifyEveryone(request.log, user.id, {
      title: input.name,
      body: 'Nouveau match, rejoignez la partie.',
      url: `/matchs/${matchId}`,
    }).catch((err) => request.log.error({ err }, 'Notification de création non envoyée'));

    const match = await loadMatch(matchId, user.id);
    return toSummary(match!);
  });

  app.get('/matches/:id', async (request, reply): Promise<MatchDetail> => {
    const matchId = IdParam.parse(request.params).id;
    const user = currentUser(request);
    const match = await loadMatch(matchId, user.id);
    if (!match) return reply.code(404).send({ error: 'Match introuvable.' });

    const showRanking = match.status === 'HALF_TIME' || match.status === 'FINISHED';
    return {
      ...toSummary(match),
      participantNames: await loadParticipants(matchId),
      playerIds: await loadPlayerIds(matchId),
      cards: await loadCards(matchId, user.id),
      ranking: showRanking ? await loadRanking(matchId, user.id) : null,
    };
  });

  // Tant que le match n'est pas lancé, son nom et ses convoqués restent modifiables.
  app.patch('/matches/:id', async (request, reply): Promise<MatchSummary> => {
    const matchId = IdParam.parse(request.params).id;
    const input = MatchInput.parse(request.body);
    const match = await requireHost(request, reply, matchId);
    if (!match) return reply;
    if (match.status !== 'PENDING') {
      return reply.code(409).send({ error: 'Un match lancé ne peut plus être modifié.' });
    }

    const retained = await withTransaction(async (client) => {
      await client.query('UPDATE matches SET name = $2 WHERE id = $1', [matchId, input.name]);
      await client.query('DELETE FROM match_players WHERE match_id = $1', [matchId]);
      return setMatchPlayers(client, matchId, input.playerIds);
    });
    if (!retained) return reply.code(400).send({ error: 'Aucun joueur retenu n\'a de pattern validé.' });

    const updated = await loadMatch(matchId, currentUser(request).id);
    return toSummary(updated!);
  });

  // Grille d'un participant. Pendant le jeu, chacun ne voit que la sienne : lire celle
  // d'un autre reviendrait à connaître son score avant l'heure.
  app.get('/matches/:id/grids/:userId', async (request, reply): Promise<MatchCard[]> => {
    const { id: matchId, userId } = GridParams.parse(request.params);
    const me = currentUser(request);
    const match = await loadMatch(matchId, me.id);
    if (!match) return reply.code(404).send({ error: 'Match introuvable.' });
    if (userId !== me.id && match.status !== 'HALF_TIME' && match.status !== 'FINISHED') {
      return reply.code(403).send({ error: 'Les grilles des autres ne sont visibles qu’à la mi-temps.' });
    }
    return loadCards(matchId, userId);
  });

  app.delete('/matches/:id', async (request, reply) => {
    const matchId = IdParam.parse(request.params).id;
    const match = await requireHost(request, reply, matchId);
    if (!match) return reply;
    if (match.status !== 'PENDING') {
      return reply.code(409).send({ error: 'Un match lancé ne peut plus être supprimé.' });
    }
    await pool.query('DELETE FROM matches WHERE id = $1', [matchId]);
    return reply.code(204).send();
  });

  app.post('/matches/:id/join', async (request, reply) => {
    const matchId = IdParam.parse(request.params).id;
    const user = currentUser(request);
    const match = await loadMatch(matchId, user.id);
    if (!match) return reply.code(404).send({ error: 'Match introuvable.' });
    if (match.status === 'FINISHED') {
      return reply.code(409).send({ error: 'Ce match est terminé.' });
    }
    await pool.query(
      'INSERT INTO match_participants (match_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [matchId, user.id],
    );
    return reply.code(204).send();
  });

  // Abandonner efface les coches : c'est comme si la personne n'avait jamais participé.
  app.delete('/matches/:id/participation', async (request, reply) => {
    const matchId = IdParam.parse(request.params).id;
    const user = currentUser(request);
    const match = await loadMatch(matchId, user.id);
    if (!match) return reply.code(404).send({ error: 'Match introuvable.' });
    // Le créateur reste responsable du déroulé : il supprime son match plutôt que de l'abandonner.
    if (match.is_creator) {
      return reply.code(403).send({ error: "Le créateur d'un match ne peut pas l'abandonner." });
    }
    await withTransaction(async (client) => {
      await client.query(
        `DELETE FROM match_checks c
         USING match_players p
         WHERE c.match_player_id = p.id AND p.match_id = $1 AND c.user_id = $2`,
        [matchId, user.id],
      );
      await client.query('DELETE FROM match_participants WHERE match_id = $1 AND user_id = $2', [
        matchId,
        user.id,
      ]);
    });
    return reply.code(204).send();
  });

  app.post('/matches/:id/start', async (request, reply) => {
    const matchId = IdParam.parse(request.params).id;
    const match = await requireHost(request, reply, matchId);
    if (!match) return reply;
    if (match.status !== 'PENDING') {
      return reply.code(409).send({ error: 'Ce match est déjà lancé.' });
    }

    const drawn = await withTransaction(async (client) => {
      const count = await drawPatterns(client, matchId);
      if (count > 0) {
        await client.query("UPDATE matches SET status = 'FIRST_HALF', started_at = now() WHERE id = $1", [
          matchId,
        ]);
      }
      return count;
    });
    if (!drawn) return reply.code(409).send({ error: 'Aucun joueur retenu n\'a de pattern validé.' });
    announce(request, matchId, match.name, 'FIRST_HALF');
    return reply.code(204).send();
  });

  app.post('/matches/:id/half-time', (request, reply) => setStatus(request, reply, ['FIRST_HALF'], 'HALF_TIME'));

  app.post('/matches/:id/second-half', (request, reply) =>
    setStatus(request, reply, ['HALF_TIME'], 'SECOND_HALF'),
  );

  app.post('/matches/:id/finish', (request, reply) =>
    setStatus(request, reply, ['FIRST_HALF', 'HALF_TIME', 'SECOND_HALF'], 'FINISHED'),
  );

  app.post('/matches/:id/cards/:cardId', async (request, reply) => {
    const { id: matchId, cardId } = CheckParams.parse(request.params);
    const user = currentUser(request);
    const match = await loadMatch(matchId, user.id);
    if (!match?.joined) return reply.code(403).send({ error: 'Rejoignez le match pour cocher.' });
    if (!PLAYING.includes(match.status)) {
      return reply.code(409).send({ error: 'Les cases sont bloquées hors des mi-temps.' });
    }
    await pool.query(
      `INSERT INTO match_checks (match_player_id, user_id)
       SELECT id, $3 FROM match_players WHERE id = $2 AND match_id = $1
       ON CONFLICT DO NOTHING`,
      [matchId, cardId, user.id],
    );
    return reply.code(204).send();
  });

  app.delete('/matches/:id/cards/:cardId', async (request, reply) => {
    const { id: matchId, cardId } = CheckParams.parse(request.params);
    const user = currentUser(request);
    const match = await loadMatch(matchId, user.id);
    if (!match) return reply.code(404).send({ error: 'Match introuvable.' });
    if (!PLAYING.includes(match.status)) {
      return reply.code(409).send({ error: 'Les cases sont bloquées hors des mi-temps.' });
    }
    await pool.query(
      `DELETE FROM match_checks c
       USING match_players p
       WHERE c.match_player_id = p.id AND p.id = $2 AND p.match_id = $1 AND c.user_id = $3`,
      [matchId, cardId, user.id],
    );
    return reply.code(204).send();
  });
}
