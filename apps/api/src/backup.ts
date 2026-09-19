import { dumpDatabase } from './db/dump';

const file = await dumpDatabase('manuel');
console.log(`Sauvegarde écrite : ${file}`);
