/**
 * Electron Kiosk Shell — latest available version (public, no auth)
 *
 * Reads electron/package.json directly — the same file electron-builder
 * packages `app.getVersion()` from — mirroring
 * /api/admin/r710/agents/latest-version's approach for the r710-agent, so
 * there's exactly one place to bump when shipping a new Electron build and
 * this endpoint can never drift out of sync with what's actually installed.
 *
 * Unauthenticated, unlike the r710 endpoint — this needs to work on the
 * landing/sign-in screens, before anyone has logged in, so an operator can
 * tell at a glance whether this kiosk is behind without needing to sign in
 * first. Just a version string, not sensitive.
 */

import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    const pkgPath = join(process.cwd(), 'electron', 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    return NextResponse.json({ success: true, data: { version: pkg.version as string } })
  } catch (error) {
    console.error('Error reading electron package.json for latest version:', error)
    return NextResponse.json({ error: 'Failed to read Electron version' }, { status: 500 })
  }
}
