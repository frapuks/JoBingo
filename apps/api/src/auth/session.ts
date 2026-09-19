import type { FastifyReply } from 'fastify';
import { jwtVerify, SignJWT } from 'jose';
import { config } from '../config';

export const SESSION_COOKIE = 'jobingo_session';
const SESSION_DAYS = 30;
const key = new TextEncoder().encode(config.jwtSecret);

export interface SessionClaims {
  userId: number;
  tokenVersion: number;
}

export function signSession({ userId, tokenVersion }: SessionClaims): Promise<string> {
  return new SignJWT({ tv: tokenVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key);
}

export async function readSession(token: string): Promise<SessionClaims | null> {
  try {
    // Algorithme imposé : on n'accepte jamais celui annoncé par le jeton lui-même.
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || typeof payload.tv !== 'number') return null;
    return { userId, tokenVersion: payload.tv };
  } catch {
    return null;
  }
}

export async function openSession(reply: FastifyReply, claims: SessionClaims): Promise<void> {
  reply.setCookie(SESSION_COOKIE, await signSession(claims), {
    httpOnly: true,
    // En local l'app est servie en http : un cookie Secure y serait refusé par le navigateur.
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 3600,
  });
}

export function closeSession(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: '/' });
}
