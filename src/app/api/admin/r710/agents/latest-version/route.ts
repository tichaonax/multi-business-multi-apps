/**
 * R710 Local Agent — latest available version (admin only)
 *
 * Reads agent/r710-local-agent/package.json directly — the same file the
 * agent itself bundles its reported AGENT_VERSION from (see socket-client.ts)
 * — so there is exactly one place to bump when shipping a new agent build,
 * and this endpoint can never drift out of sync with what's actually in
 * r710-agent.zip. Used by the device Agent panel to compare against a
 * connected agent's reported version and prompt for an update when they
 * differ.
 */

import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { isSystemAdmin } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSystemAdmin(user)) return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })

  try {
    const pkgPath = join(process.cwd(), 'agent', 'r710-local-agent', 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    return NextResponse.json({ success: true, data: { version: pkg.version as string } })
  } catch (error) {
    console.error('Error reading agent package.json for latest version:', error)
    return NextResponse.json({ error: 'Failed to read agent version' }, { status: 500 })
  }
}
