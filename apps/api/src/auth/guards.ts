import type { User } from '@jobingo/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { toUser, findUserById } from '../users';
import { closeSession, readSession, SESSION_COOKIE } from './session';

declare module 'fastify' {
  interface FastifyRequest {
    user: User | null;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies[SESSION_COOKIE];
  const session = token ? await readSession(token) : null;
  const row = session ? await findUserById(session.userId) : null;

  // Jeton d'une version antérieure : l'utilisateur a demandé la déconnexion de tous ses appareils.
  if (!session || !row || row.token_version !== session.tokenVersion) {
    if (token) closeSession(reply);
    return reply.code(401).send({ error: 'Vous devez être connecté.' });
  }
  request.user = toUser(row);
}

export function currentUser(request: FastifyRequest): User {
  if (!request.user) throw new Error('requireAuth manquant sur cette route.');
  return request.user;
}
