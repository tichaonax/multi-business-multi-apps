/**
 * Local Agent — latest available version (any authenticated user)
 *
 * Reads agent/r710-local-agent/package.json directly — the same file the
 * agent itself bundles its reported AGENT_VERSION from (see socket-client.ts
 * / workstation-socket-client.ts) — so there is exactly one place to bump
 * when shipping a new agent build, and this endpoint can never drift out of
 * sync with what's actually in r710-agent.zip. Shared by BOTH the R710
 * Agent panel and the Workstation Agents page (same exe, same version) to
 * compare against a connected agent's reported version and prompt for an
 * update when they differ (MBM-281).
 *
 * No admin gate — this is just a version string, not sensitive, and a
 * business owner on the Workstation Agents page needs to see the same
 * "update available" signal a system admin does, not just be told to ask
 * one.
 */

import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { getServerUser } from '@/lib/get-server-user'

export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const pkgPath = join(process.cwd(), 'agent', 'r710-local-agent', 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    return NextResponse.json({ success: true, data: { version: pkg.version as string } })
  } catch (error) {
    console.error('Error reading agent package.json for latest version:', error)
    return NextResponse.json({ error: 'Failed to read agent version' }, { status: 500 })
  }
}
