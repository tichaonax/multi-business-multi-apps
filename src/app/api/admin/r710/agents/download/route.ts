/**
 * R710 Local Agent — download the built installer (MBM-272, admin only)
 *
 * Streams agent/r710-local-agent/dist/r710-agent.zip (the .exe plus its
 * systray2 helper folder — see build.mjs), built via `npm run build` in
 * that folder (esbuild + Node SEA). That build step must run as part of
 * deployment for this file to exist; it is not part of the Next.js app
 * bundle itself.
 */

import { NextRequest, NextResponse } from 'next/server'
import { existsSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { isSystemAdmin } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSystemAdmin(user)) return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })

  const zipPath = join(process.cwd(), 'agent', 'r710-local-agent', 'dist', 'r710-agent.zip')

  if (!existsSync(zipPath)) {
    return NextResponse.json(
      { error: 'Agent build not found on the server. Run `npm run build` in agent/r710-local-agent/ as part of deployment.' },
      { status: 404 }
    )
  }

  const file = readFileSync(zipPath)
  const { size } = statSync(zipPath)

  return new NextResponse(file, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="r710-agent.zip"',
      'Content-Length': String(size),
    },
  })
}
