import webpush from 'web-push';
import { config } from './config';
import { pool } from './db/pool';

// Les clés VAPID identifient ce serveur auprès des services push. Elles se sauvegardent
// avec les autres secrets : les regénérer invalide tous les abonnements existants.
export const pushEnabled = Boolean(config.vapid.publicKey && config.vapid.privateKey);

if (pushEnabled) {
  webpush.setVapidDetails(config.vapid.subject, config.vapid.publicKey, config.vapid.privateKey);
}

interface SubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function sendPushToUser(userId: number, payload: { title: string; body: string; url?: string }) {
  if (!pushEnabled) return;
  const { rows } = await pool.query<SubscriptionRow>(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
    [userId],
  );
  for (const row of rows) {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        JSON.stringify(payload),
      );
    } catch (err) {
      // 404/410 : l'appareil s'est désabonné ou l'app a été désinstallée.
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [row.endpoint]);
      } else {
        throw err;
      }
    }
  }
}
