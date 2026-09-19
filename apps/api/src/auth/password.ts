import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

// Profil recommandé par l'OWASP (N=2^15, r=8, p=3) : environ 32 Mio par calcul,
// supportable par le Pi. Les paramètres sont stockés avec l'empreinte pour pouvoir
// les durcir plus tard sans invalider les mots de passe existants.
const PARAMS = { N: 2 ** 15, r: 8, p: 3 };
const KEY_LENGTH = 64;

function derive(password: string, salt: Buffer, params: typeof PARAMS): Promise<Buffer> {
  const options: ScryptOptions = { ...params, maxmem: 256 * params.N * params.r };
  return new Promise((resolve, reject) => {
    scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, options, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, PARAMS);
  const { N, r, p } = PARAMS;
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, N, r, p, salt, key] = stored.split('$');
  if (algo !== 'scrypt' || !salt || !key) return false;
  const expected = Buffer.from(key, 'base64');
  const actual = await derive(password, Buffer.from(salt, 'base64'), {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Empreinte factice : un e-mail inconnu coûte le même temps de calcul qu'un compte
// existant, sinon la durée de réponse révélerait quelles adresses sont inscrites.
const dummyHash = hashPassword(randomBytes(16).toString('hex'));

export async function burnPasswordCheck(password: string): Promise<void> {
  await verifyPassword(password, await dummyHash);
}
