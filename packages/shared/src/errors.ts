import { z } from 'zod';

export const ApiErrorBody = z.object({ error: z.string() });
export type ApiErrorBody = z.infer<typeof ApiErrorBody>;
