/**
 * Electron POS app — the versions this server expects (public, no auth)
 *
 * `version` comes from electron/package.json, the same file electron-builder
 * packages `app.getVersion()` from. MBM-352 adds:
 *  - `agentVersion`: the R710 agent bundled in that POS app
 *    (agent/r710-local-agent/package.json);
 *  - `installerAvailable`: whether /api/public/electron/download can serve
 *    it. A till is only blocked when it can actually update from here.
 *
 * Unauthenticated: it's needed on the sign-in screen. Version strings only.
 */
import { NextResponse } from 'next/server'
import { expectedVersions, findPosAppInstaller } from '@/lib/pos-app-installer'

export async function GET() {
  try {
    const { version, agentVersion } = expectedVersions()
    const installer = await findPosAppInstaller()
    return NextResponse.json({
      success: true,
      data: { version, agentVersion, installerAvailable: !!installer && installer.version === version },
    })
  } catch (error) {
    console.error('Error reading electron package.json for latest version:', error)
    return NextResponse.json({ error: 'Failed to read Electron version' }, { status: 500 })
  }
}
