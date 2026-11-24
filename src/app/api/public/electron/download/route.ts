/**
 * POS app (Electron) installer — public, no auth (MBM-341)
 *
 * Serves the installer that `npm run release` built from the same commit as
 * the running release (release.json → electron). Tills install it with
 * deploy/workstation/install-pos.ps1, which checks the SHA-256 first.
 *
 *   GET /api/public/electron/download          → the .exe
 *   GET /api/public/electron/download?info=1   → { version, file, sha256 }
 *
 * 404 on a dev checkout or an older release (no installer inside).
 */
import { NextRequest, NextResponse } from 'next/server'
import { existsSync, readFileSync, statSync, createReadStream } from 'fs'
import { join, basename } from 'path'
import { Readable } from 'stream'

export async function GET(request: NextRequest) {
  const relPath = join(process.cwd(), 'release.json')
  const electron = existsSync(relPath) ? JSON.parse(readFileSync(relPath, 'utf-8')).electron : null
  const file = electron?.installer ? join(process.cwd(), electron.installer) : null
  if (!file || !existsSync(file)) {
    return NextResponse.json({ error: 'No POS app installer in this release' }, { status: 404 })
  }

  const name = basename(file)
  if (request.nextUrl.searchParams.get('info')) {
    return NextResponse.json({ success: true, data: { version: electron.version, file: name, sha256: electron.sha256 } })
  }

  const stream = Readable.toWeb(createReadStream(file)) as ReadableStream
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Content-Length': String(statSync(file).size),
      'X-Content-SHA256': electron.sha256,
    },
  })
}
