import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import pg from 'pg';
import { dumpBeforeMigration } from './db/dump';

const MIGRATIONS_DIR = resolve(import.meta.dirname, '../migrations');
const MIGRATION_FILE = /^\d{3}_[a-z0-9_]+\.sql$/;
// Identifiant arbitraire du verrou consultatif : un seul runner à la fois sur la base.
const LOCK_ID = 7_310_001;

// CRLF normalisés : un checkout Windows ne doit pas passer pour une modification.
function checksum(sql: string): string {
  return createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');
}

async function appliedMigrations(client: pg.Client): Promise<Map<string, string>> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
  const { rows } = await client.query<{ name: string; checksum: string }>(
    'SELECT name, checksum FROM _migrations',
  );
  return new Map(rows.map((row) => [row.name, row.checksum]));
}

async function applyMigration(client: pg.Client, name: string, sql: string): Promise<void> {
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO _migrations (name, checksum) VALUES ($1, $2)', [name, checksum(sql)]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function migrate(): Promise<void> {
  const client = new pg.Client();
  await client.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    const applied = await appliedMigrations(client);
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => MIGRATION_FILE.test(f)).sort();

    let count = 0;
    for (const file of files) {
      const name = file.replace(/\.sql$/, '');
      const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');

      if (applied.has(name)) {
        if (applied.get(name) !== checksum(sql)) {
          throw new Error(
            `La migration ${file} a été modifiée après avoir été appliquée. ` +
              'Remettez-la dans son état d\'origine et ajoutez un nouveau fichier.',
          );
        }
        continue;
      }

      // Une sauvegarde qui échoue bloque la migration : pas de changement de schéma sans filet.
      const dump = await dumpBeforeMigration(name);
      console.log(`Sauvegarde : ${dump}`);
      await applyMigration(client, name, sql);
      console.log(`Migration appliquée : ${file}`);
      count++;
    }
    console.log(count ? `${count} migration(s) appliquée(s).` : 'Base à jour, aucune migration à appliquer.');
  } finally {
    await client.end();
  }
}

try {
  await migrate();
} catch (err) {
  console.error('Échec des migrations :', err instanceof Error ? err.message : err);
  process.exit(1);
}
