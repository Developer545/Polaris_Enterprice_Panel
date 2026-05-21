import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  // access_token lives on API domain (onrender.com) — middleware can't see it.
  // pos_session is a presence indicator set client-side on the frontend domain after login.
  const hasToken = request.cookies.has('pos_session') || request.cookies.has('access_token')

  if (!isPublic && !hasToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (isPublic && hasToken) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
