import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken, ACCESS_COOKIE } from '@/lib/auth'

// ── The lock ────────────────────────────────────────────────────────────────
// Every gated request must carry a valid, signed, unexpired access cookie.
// No cookie → bounce to the public email-capture landing at `/`.
//
// Public (never gated): `/` (landing), `/api/unlock` (login), and all static
// assets — those are excluded by the matcher below so this never even runs for
// them. We still guard `/` inside the function to avoid any redirect loop.

const PUBLIC_PATHS = new Set<string>(['/'])

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next()

  const secret = process.env.AUTH_SECRET
  const token  = request.cookies.get(ACCESS_COOKIE)?.value
  const payload = secret ? await verifyToken(secret, token) : null

  if (payload) return NextResponse.next()

  // Locked: send them to the landing page.
  const url = request.nextUrl.clone()
  url.pathname = '/'
  url.search = ''
  return NextResponse.redirect(url)
}

export const config = {
  // Run on everything EXCEPT the unlock API, Next internals, and static files
  // (anything with a file extension). The function above additionally lets `/`
  // through. Net effect: only real app routes like /site and /shop are gated.
  matcher: [
    '/((?!api/unlock|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)',
  ],
}
