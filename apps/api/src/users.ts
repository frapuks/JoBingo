import type { User } from '@jobingo/shared';
import { pool } from './db/pool';

export const USER_COLUMNS = 'id, email, token_version';

export interface UserRow {
  id: number;
  email: string;
  token_version: number;
}

export function toUser(row: UserRow): User {
  return { id: row.id, email: row.email };
}

export async function findUserById(id: number): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}
