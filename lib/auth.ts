// Signed session-token helpers — Web Crypto only, so this runs unchanged in
// both the Node route handler and the Edge-capable proxy.
//
// Token format:  base64url(payloadJSON) "." base64url(HMAC-SHA256(payloadJSON))
// The payload carries an `exp` (ms epoch). Tampering with either half fails the
// signature check; expiry is checked after the signature verifies.
//
// This token is NOT the password. It is a bearer credential minted only after a
// correct password, signed with AUTH_SECRET. Rotating AUTH_SECRET invalidates
// every outstanding token instantly.

const enc = new TextEncoder()
const dec = new TextDecoder()

function bytesToB64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlToBytes(s: string): Uint8Array {
  let t = s.replace(/-/g, '+').replace(/_/g, '/')
  while (t.length % 4) t += '='
  const bin = atob(t)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export interface TokenPayload {
  exp: number   // ms epoch expiry
  v?:  number   // schema version
}

export async function signToken(secret: string, payload: TokenPayload): Promise<string> {
  const data = enc.encode(JSON.stringify(payload))
  const key  = await hmacKey(secret)
  const sig  = new Uint8Array(await crypto.subtle.sign('HMAC', key, data))
  return `${bytesToB64url(data)}.${bytesToB64url(sig)}`
}

export async function verifyToken(
  secret: string,
  token: string | undefined | null,
): Promise<TokenPayload | null> {
  if (!token) return null
  const dot = token.indexOf('.')
  if (dot < 1) return null

  const dataB64 = token.slice(0, dot)
  const sigB64  = token.slice(dot + 1)

  let data: Uint8Array, sig: Uint8Array
  try {
    data = b64urlToBytes(dataB64)
    sig  = b64urlToBytes(sigB64)
  } catch {
    return null
  }

  const key = await hmacKey(secret)
  // crypto.subtle.verify is constant-time for the MAC comparison.
  const ok = await crypto.subtle.verify('HMAC', key, sig, data)
  if (!ok) return null

  try {
    const payload = JSON.parse(dec.decode(data)) as TokenPayload
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

export const ACCESS_COOKIE = 'yuzu_access'
