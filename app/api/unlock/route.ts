import { NextResponse } from 'next/server'
import { verifyPassword } from '@/lib/password'
import { signToken, ACCESS_COOKIE } from '@/lib/auth'

// scrypt needs node:crypto → force Node runtime (not Edge).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SESSION_MAX_AGE = 60 * 60 * 24 * 7   // 7 days, in seconds

// Best-effort in-memory throttle. Serverless instances are ephemeral and not
// shared, so this only slows an attacker hitting a single warm instance — the
// real defense is scrypt's cost + a high-entropy password. For a WIP gate that
// is an acceptable tradeoff; swap in a KV/Redis limiter if this ever guards
// anything sensitive.
const attempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 10

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const rec = attempts.get(ip)
  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  rec.count += 1
  return rec.count > MAX_PER_WINDOW
}

export async function POST(request: Request) {
  const stored = process.env.SITE_PASSWORD_HASH
  const secret = process.env.AUTH_SECRET
  if (!stored || !secret) {
    return NextResponse.json(
      { ok: false, error: 'server not configured' },
      { status: 500 },
    )
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: 'too many attempts' }, { status: 429 })
  }

  let password = ''
  try {
    const body = await request.json()
    if (typeof body?.password === 'string') password = body.password
  } catch {
    /* malformed body → treated as empty, fails verification */
  }

  const ok = password.length > 0 && (await verifyPassword(password, stored))
  if (!ok) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const token = await signToken(secret, {
    exp: Date.now() + SESSION_MAX_AGE * 1000,
    v: 1,
  })

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',  // localhost is http in dev
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  return res
}
