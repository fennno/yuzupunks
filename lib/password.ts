// Password verification via scrypt — Node runtime only (uses node:crypto).
// Never imported by the proxy/edge code.
//
// Stored format (env SITE_PASSWORD_HASH):  "<saltHex>:<keyHex>"
//   - salt: 16 random bytes, unique per hash
//   - key:  32-byte scrypt-derived key
// scrypt is deliberately slow + memory-hard, so an attacker who somehow obtains
// the hash still faces an expensive offline brute force. We never store, log, or
// transmit the plaintext password.

import { scrypt as _scrypt, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(_scrypt) as (
  password: string | Buffer,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>

const KEY_LEN = 32

/** Generate a "salt:key" hash for a chosen password. Used by the gen script. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key  = await scrypt(password, salt, KEY_LEN)
  return `${salt.toString('hex')}:${key.toString('hex')}`
}

/** Constant-time verify of an attempt against a stored "salt:key" hash. */
export async function verifyPassword(attempt: string, stored: string): Promise<boolean> {
  const sep = stored.indexOf(':')
  if (sep < 1) return false

  const salt = Buffer.from(stored.slice(0, sep), 'hex')
  const key  = Buffer.from(stored.slice(sep + 1), 'hex')
  if (salt.length === 0 || key.length === 0) return false

  let derived: Buffer
  try {
    derived = await scrypt(attempt, salt, key.length)
  } catch {
    return false
  }
  if (derived.length !== key.length) return false
  return timingSafeEqual(derived, key)
}
