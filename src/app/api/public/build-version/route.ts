/**
 * Current server build id (public, no auth) — lets a client compare what it
 * currently has loaded against what the live server would serve fresh, so
 * it can tell whether it's showing a stale bundle.
 *
 * This exists specifically for the Electron kiosk shell: each registered
 * server gets its own persistent session partition (see electron/main.js),
 * which caches HTTP responses independently of the Next.js server's own
 * .next build folder -- a server rebuild/redeploy never invalidates that
 * cache on its own, so a kiosk window can keep silently serving a
 * pre-rebuild bundle indefinitely. Comparing this against the buildId Next
 * already embeds in every page (window.__NEXT_DATA__.buildId) tells the
 * client whether *its own* currently-loaded page is behind, so it knows
 * when to clear that cache and reload.
 *
 * Cache-Control: no-store is essential here -- if this response itself ever
 * got cached, the staleness check would go stale right along with it.
 */

import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  // `next dev` never writes a BUILD_ID file (there's no single build to
  // stamp), and window.__NEXT_DATA__.buildId is the literal string
  // "development" for every page in dev mode too -- returning the same
  // constant here means the comparison always matches locally, so this
  // check is effectively a no-op until an actual `next build` is deployed.
  let buildId = 'development'

  if (process.env.NODE_ENV === 'production') {
    try {
      buildId = readFileSync(join(process.cwd(), '.next', 'BUILD_ID'), 'utf-8').trim()
    } catch (error) {
      console.error('Error reading .next/BUILD_ID:', error)
      return NextResponse.json({ error: 'Failed to read build id' }, { status: 500 })
    }
  }

  return NextResponse.json(
    { success: true, data: { buildId } },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
