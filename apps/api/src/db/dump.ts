import { execFile } from 'node:child_process';
import { mkdir, readdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

// Dossier ./backups à la racine du dépôt, monté en bind-mount dans le conteneur.
export const BACKUP_DIR = resolve(import.meta.dirname, '../../../../backups');

const AUTO_PREFIX = 'auto_';
const AUTO_KEPT = 10;

// Heure locale (TZ) : c'est celle qu'on cherche en lisant la liste des sauvegardes.
function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export async function dumpDatabase(label: string): Promise<string> {
  await mkdir(BACKUP_DIR, { recursive: true });
  const file = join(BACKUP_DIR, `${timestamp()}_${label}.dump`);
  // Format custom : compressé, et restaurable sélectivement avec pg_restore.
  await run('pg_dump', ['--format=custom', '--file', file]);
  return file;
}

export async function dumpBeforeMigration(migration: string): Promise<string> {
  const file = await dumpDatabase(`${AUTO_PREFIX}avant_${migration}`);
  await rotateAutoDumps();
  return file;
}

// Seules les sauvegardes automatiques tournent ; les manuelles restent jusqu'à suppression.
async function rotateAutoDumps(): Promise<void> {
  const autoDumps = (await readdir(BACKUP_DIR))
    .filter((name) => name.includes(`_${AUTO_PREFIX}`) && name.endsWith('.dump'))
    .sort();
  const obsolete = autoDumps.slice(0, Math.max(0, autoDumps.length - AUTO_KEPT));
  for (const name of obsolete) {
    await rm(join(BACKUP_DIR, name));
  }
}
