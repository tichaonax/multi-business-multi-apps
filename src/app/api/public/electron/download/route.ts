/**
 * POS app (Electron) installer — public, no auth (MBM-341, MBM-352)
 *
 * Serves the installer from the running release (release.json → electron),
 * or on a dev checkout the one electron-builder built for the current
 * electron/package.json version (see src/lib/pos-app-installer.ts).
 * Tills install it with the POS app's "Update now", the MBM POS Updater task,
 * or deploy/workstation/install-pos.ps1 — all check the SHA-256 first.
 *
 *   GET /api/public/electron/download          → the .exe
 *   GET /api/public/electron/download?info=1   → { version, file, sha256 }
 *
 * 404 when there is no installer.
 */
import { NextRequest, NextResponse } from 'next/server'
import { statSync, createReadStream } from 'fs'
import { basename } from 'path'
import { Readable } from 'stream'
import { findPosAppInstaller } from '@/lib/pos-app-installer'

export async function GET(request: NextRequest) {
  const inst = await findPosAppInstaller()
  if (!inst) {
    return NextResponse.json({ error: 'No POS app installer on this server' }, { status: 404 })
  }

  const name = basename(inst.file).replace(/ /g, '-')
  if (request.nextUrl.searchParams.get('info')) {
    return NextResponse.json({ success: true, data: { version: inst.version, file: name, sha256: inst.sha256 } })
  }

  const stream = Readable.toWeb(createReadStream(inst.file)) as ReadableStream
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Content-Length': String(statSync(inst.file).size),
      'X-Content-SHA256': inst.sha256,
    },
  })
}
