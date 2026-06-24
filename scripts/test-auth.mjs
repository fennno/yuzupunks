// Security smoke + stress test for the site lock.
// Mirrors lib/password.ts (scrypt) and lib/auth.ts (HMAC token) exactly and
// asserts the properties that matter. Run: node scripts/test-auth.mjs
//
// Exits non-zero if any assertion fails.

import { scrypt as _scrypt, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(_scrypt)
const enc = new TextEncoder()
const dec = new TextDecoder()

let failures = 0
function check(name, cond) {
  if (cond) { console.log(`  ✓ ${name}`) }
  else      { console.error(`  ✗ ${name}`); failures++ }
}

// ── password (mirror of lib/password.ts) ──────────────────────────────────────
async function hashPassword(password) {
  const salt = randomBytes(16)
  const key  = await scrypt(password, salt, 32)
  return `${salt.toString('hex')}:${key.toString('hex')}`
}
async function verifyPassword(attempt, stored) {
  const sep = stored.indexOf(':')
  if (sep < 1) return false
  const salt = Buffer.from(stored.slice(0, sep), 'hex')
  const key  = Buffer.from(stored.slice(sep + 1), 'hex')
  if (!salt.length || !key.length) return false
  let derived
  try { derived = await scrypt(attempt, salt, key.length) } catch { return false }
  if (derived.length !== key.length) return false
  return timingSafeEqual(derived, key)
}

// ── token (mirror of lib/auth.ts) ─────────────────────────────────────────────
const b64url = b => Buffer.from(b).toString('base64url')
const unb64url = s => new Uint8Array(Buffer.from(s, 'base64url'))
async function key(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}
async function signToken(secret, payload) {
  const data = enc.encode(JSON.stringify(payload))
  const sig  = new Uint8Array(await crypto.subtle.sign('HMAC', await key(secret), data))
  return `${b64url(data)}.${b64url(sig)}`
}
async function verifyToken(secret, token) {
  if (!token || !token.includes('.')) return null
  const [d, s] = token.split('.')
  let data, sig
  try { data = unb64url(d); sig = unb64url(s) } catch { return null }
  const ok = await crypto.subtle.verify('HMAC', await key(secret), sig, data)
  if (!ok) return null
  try {
    const p = JSON.parse(dec.decode(data))
    if (typeof p.exp !== 'number' || Date.now() > p.exp) return null
    return p
  } catch { return null }
}

// ── tests ─────────────────────────────────────────────────────────────────────
console.log('\nPassword hashing (scrypt):')
const PW = 'correct horse battery staple 42!'
const stored = await hashPassword(PW)
check('stored hash is salt:key hex, no plaintext', /^[0-9a-f]{32}:[0-9a-f]{64}$/.test(stored) && !stored.includes(PW))
check('correct password verifies', await verifyPassword(PW, stored))
check('wrong password rejected', !(await verifyPassword('wrong', stored)))
check('empty password rejected', !(await verifyPassword('', stored)))
check('near-miss (case) rejected', !(await verifyPassword(PW.toUpperCase(), stored)))
check('two hashes of same pw differ (unique salt)', (await hashPassword(PW)) !== (await hashPassword(PW)))

console.log('\nBrute-force simulation (1000 random guesses):')
let hits = 0
for (let i = 0; i < 1000; i++) {
  if (await verifyPassword(randomBytes(8).toString('hex'), stored)) hits++
}
check('zero random guesses succeeded', hits === 0)

console.log('\nSession token (HMAC-SHA256):')
const SECRET = randomBytes(32).toString('hex')
const good = await signToken(SECRET, { exp: Date.now() + 60_000, v: 1 })
check('valid token verifies', (await verifyToken(SECRET, good)) !== null)
check('tampered payload rejected', (await verifyToken(SECRET, 'x' + good.slice(1))) === null)
check('tampered signature rejected', (await verifyToken(SECRET, good.slice(0, -2) + 'AA')) === null)
check('wrong secret rejected', (await verifyToken(randomBytes(32).toString('hex'), good)) === null)
check('garbage rejected', (await verifyToken(SECRET, 'not-a-token')) === null)
check('empty token rejected', (await verifyToken(SECRET, '')) === null)
const expired = await signToken(SECRET, { exp: Date.now() - 1000, v: 1 })
check('expired token rejected', (await verifyToken(SECRET, expired)) === null)

console.log('\nTiming (constant-time verify, 50 samples each):')
async function avgMs(fn) {
  const t0 = process.hrtime.bigint()
  for (let i = 0; i < 50; i++) await fn()
  return Number(process.hrtime.bigint() - t0) / 1e6 / 50
}
const tCorrect = await avgMs(() => verifyPassword(PW, stored))
const tWrong   = await avgMs(() => verifyPassword('wrongwrongwrong', stored))
console.log(`  correct ≈ ${tCorrect.toFixed(2)}ms, wrong ≈ ${tWrong.toFixed(2)}ms`)
check('scrypt cost is non-trivial (>1ms/attempt)', tCorrect > 1)
check('correct vs wrong timing within 3x (no obvious leak)', Math.max(tCorrect, tWrong) / Math.min(tCorrect, tWrong) < 3)

console.log(failures === 0 ? '\nALL PASS\n' : `\n${failures} FAILURE(S)\n`)
process.exit(failures === 0 ? 0 : 1)
