import { NextResponse } from 'next/server'

// Runtime value reflects the currently-deployed build. The browser bundle bakes
// in NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA at build time; comparing the two detects
// a stale tab after a new deploy. Vercel sets these automatically.
export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json(
    { sha: process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev' },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
