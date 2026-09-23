import "server-only"
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"

type ScryptParams = { N: number; r: number; p: number }

// OWASP-recommended scrypt cost (~32 MiB per hash).
const PARAMS: ScryptParams = { N: 2 ** 15, r: 8, p: 1 }
const KEY_LENGTH = 64

function deriveKey(password: string, salt: Buffer, { N, r, p }: ScryptParams) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      KEY_LENGTH,
      { N, r, p, maxmem: 256 * N * r },
      (error, key) => (error ? reject(error) : resolve(key))
    )
  })
}

/** Returns a self-describing hash: `scrypt$N$r$p$salt$key` (base64 parts). */
export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const key = await deriveKey(password, salt, PARAMS)
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), key.toString("base64")].join("$")
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, n, r, p, salt, key] = stored.split("$")
  if (algorithm !== "scrypt" || !salt || !key) return false

  const expected = Buffer.from(key, "base64")
  const actual = await deriveKey(password, Buffer.from(salt, "base64"), {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  })
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

// No look-alike characters (0/O, 1/l/I) so passwords survive being read aloud or retyped.
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"

/** A random temporary password like `Xk7m-Qp2r-Zt9w-Hn4s` (~92 bits of entropy). */
export function generateTemporaryPassword() {
  // Rejection sampling keeps every character equally likely.
  const limit = 256 - (256 % PASSWORD_ALPHABET.length)
  const chars: string[] = []
  while (chars.length < 16) {
    for (const byte of randomBytes(32)) {
      if (byte < limit && chars.length < 16) {
        chars.push(PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length])
      }
    }
  }
  return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join("")).join("-")
}

let dummyHash: Promise<string> | undefined

/** A real hash to verify against when an account doesn't exist, so response time doesn't leak it. */
export function getDummyHash() {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"))
  return dummyHash
}
