import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';

console.log(`
  ATTENTION : cette commande DÉTRUIT DÉFINITIVEMENT la base de données.
  Le volume jobingo_pgdata est supprimé : comptes, parties, tout disparaît.
  Faites d'abord une sauvegarde (npm run backup) si vous tenez aux données.
`);

const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = await rl.question('Tapez SUPPRIMER pour confirmer : ');
rl.close();

if (answer.trim() !== 'SUPPRIMER') {
  console.log('Annulé, rien n\'a été supprimé.');
  process.exit(1);
}

const result = spawnSync('docker', ['compose', 'down', '-v'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
