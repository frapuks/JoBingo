import { config } from './config';
import { pool } from './db/pool';

export function isAdminEmail(email: string): boolean {
  return config.adminEmails.includes(email);
}

// Le rôle admin se pilote uniquement par le .env : il est recalculé à chaque démarrage,
// donc retirer une adresse d'ADMIN_EMAILS retire le rôle au redémarrage suivant.
export async function syncAdmins(): Promise<number> {
  const { rowCount } = await pool.query(
    'UPDATE users SET is_admin = (email = ANY($1::text[])) WHERE is_admin <> (email = ANY($1::text[]))',
    [config.adminEmails],
  );
  return rowCount ?? 0;
}
