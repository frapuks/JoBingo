import type { User } from '@jobingo/shared';
import { pool } from './db/pool';

export const USER_COLUMNS = 'id, email, display_name, is_admin, token_version';

export interface UserRow {
  id: number;
  email: string;
  display_name: string | null;
  is_admin: boolean;
  token_version: number;
}

export function toUser(row: UserRow): User {
  return { id: row.id, email: row.email, displayName: row.display_name, isAdmin: row.is_admin };
}

export async function findUserById(id: number): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}
