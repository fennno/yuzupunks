// Generate a SITE_PASSWORD_HASH for a chosen password.
//   node scripts/gen-password-hash.mjs "your strong passphrase"
// Paste the printed "salt:key" string into SITE_PASSWORD_HASH (env / Vercel).
// The plaintext is never stored — only this salted scrypt hash.

import { scrypt as _scrypt, randomBytes } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(_scrypt)

const pw = process.argv[2]
if (!pw) {
  console.error('usage: node scripts/gen-password-hash.mjs "<password>"')
  process.exit(1)
}

const salt = randomBytes(16)
const key  = await scrypt(pw, salt, 32)
console.log(`${salt.toString('hex')}:${key.toString('hex')}`)
