import { z } from 'zod';

export const HealthResponse = z.object({
  status: z.enum(['ok', 'degraded']),
  database: z.enum(['ok', 'unreachable']),
  migrations: z.number().int().nullable(),
});
export type HealthResponse = z.infer<typeof HealthResponse>;
