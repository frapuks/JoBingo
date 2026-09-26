import type { FastifyBaseLogger } from 'fastify';
import webpush from 'web-push';
import { config } from './config';
import { pool } from './db/pool';

// Les clés VAPID identifient ce serveur auprès des services push. Elles se sauvegardent
// avec les autres secrets : les regénérer invalide tous les abonnements existants.
export const pushEnabled = Boolean(config.vapid.publicKey && config.vapid.privateKey);

if (pushEnabled) {
  webpush.setVapidDetails(config.vapid.subject, config.vapid.publicKey, config.vapid.privateKey);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

interface SubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function deliver(log: FastifyBaseLogger, rows: SubscriptionRow[], payload: PushPayload) {
  for (const row of rows) {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        JSON.stringify(payload),
      );
    } catch (err) {
      // 404 ou 410 : l'appareil s'est désabonné, ou l'app a été désinstallée.
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [row.endpoint]);
      } else {
        log.error({ err }, 'Notification non délivrée');
      }
    }
  }
}

async function subscriptions(where: string, params: unknown[]): Promise<SubscriptionRow[]> {
  const { rows } = await pool.query<SubscriptionRow>(
    `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE ${where}`,
    params,
  );
  return rows;
}

export async function notifyUsers(log: FastifyBaseLogger, userIds: number[], payload: PushPayload) {
  if (!pushEnabled || userIds.length === 0) return;
  await deliver(log, await subscriptions('user_id = ANY($1::int[])', [userIds]), payload);
}

// L'auteur de l'événement est exclu : il sait déjà ce qu'il vient de faire.
export async function notifyEveryone(log: FastifyBaseLogger, exceptUserId: number, payload: PushPayload) {
  if (!pushEnabled) return;
  await deliver(log, await subscriptions('user_id <> $1', [exceptUserId]), payload);
}

export async function notifyMatchParticipants(
  log: FastifyBaseLogger,
  matchId: number,
  exceptUserId: number,
  payload: PushPayload,
) {
  if (!pushEnabled) return;
  await deliver(
    log,
    await subscriptions(
      'user_id IN (SELECT user_id FROM match_participants WHERE match_id = $1 AND user_id <> $2)',
      [matchId, exceptUserId],
    ),
    payload,
  );
}
