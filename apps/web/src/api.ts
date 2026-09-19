import { ApiErrorBody } from '@jobingo/shared';
import type { z } from 'zod';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function send(method: string, path: string, body?: unknown): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Serveur injoignable. Vérifiez votre connexion.');
  }
  if (!res.ok) {
    const parsed = ApiErrorBody.safeParse(await res.json().catch(() => null));
    throw new ApiError(res.status, parsed.success ? parsed.data.error : `Erreur ${res.status}`);
  }
  return res;
}

export async function getJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const res = await send('GET', path);
  return schema.parse(await res.json());
}

export async function postJson<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
  const res = await send('POST', path, body);
  return schema.parse(await res.json());
}

export async function post(path: string, body?: unknown): Promise<void> {
  await send('POST', path, body);
}

export async function del(path: string, body?: unknown): Promise<void> {
  await send('DELETE', path, body);
}

// Valide avec le schéma partagé avant l'envoi : mêmes règles et mêmes messages que l'API.
export function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(400, result.error.issues[0]?.message ?? 'Saisie invalide.');
  return result.data;
}
