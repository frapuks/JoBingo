import { z } from 'zod';

export const PushConfig = z.object({
  enabled: z.boolean(),
  publicKey: z.string().nullable(),
});
export type PushConfig = z.infer<typeof PushConfig>;

// Forme renvoyée par PushSubscription.toJSON() dans le navigateur.
export const PushSubscriptionInput = z.object({
  endpoint: z.url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});
export type PushSubscriptionInput = z.infer<typeof PushSubscriptionInput>;

export const PushUnsubscribeInput = z.object({ endpoint: z.url() });
export type PushUnsubscribeInput = z.infer<typeof PushUnsubscribeInput>;
