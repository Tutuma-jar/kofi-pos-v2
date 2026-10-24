import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

// Contraseñas con scrypt de node:crypto (plan §5.4, D-3; RF-1, RNF-1). Los parámetros se guardan
// junto al hash para poder subirlos más adelante sin invalidar las contraseñas existentes.

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const PARAMS = { N: 2 ** 15, r: 8, p: 3 };
const MAX_MEMORY = 64 * 1024 * 1024;

function derive(password: string, salt: Buffer, keyLength: number, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keyLength, { ...options, maxmem: MAX_MEMORY }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

// Formato: scrypt$<N>$<r>$<p>$<sal>$<hash>, con la sal y el hash en base64url.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const hash = await derive(password, salt, KEY_LENGTH, PARAMS);
  const { N, r, p } = PARAMS;
  return ['scrypt', N, r, p, salt.toString('base64url'), hash.toString('base64url')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, N, r, p, salt, hash, ...rest] = stored.split('$');
  if (algorithm !== 'scrypt' || salt === undefined || hash === undefined || rest.length > 0) {
    return false;
  }
  const params = { N: Number(N), r: Number(r), p: Number(p) };
  if (!Object.values(params).every((value) => Number.isInteger(value) && value > 0)) return false;

  const expected = Buffer.from(hash, 'base64url');
  if (expected.length === 0) return false;
  try {
    const actual = await derive(password, Buffer.from(salt, 'base64url'), expected.length, params);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
