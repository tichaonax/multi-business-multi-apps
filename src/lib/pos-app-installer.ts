/**
 * MBM-352 — where this server's POS app (Electron) installer is, and the
 * versions a till must match.
 *
 *  - A release: release.json → electron { installer, version, sha256 } (MBM-341).
 *  - A dev checkout (e.g. the workstation): the newest "Multi-Business POS
 *    Setup <version>.exe" that electron-builder left in its output folder
 *    (electron/package.json → build.directories.output), for the version in
 *    electron/package.json only. Its SHA-256 is worked out once per file.
 */
import { existsSync, readFileSync, statSync, createReadStream } from 'fs'
import { createHash } from 'crypto'
import { join, resolve } from 'path'

export interface PosAppInstaller { file: string; version: string; sha256: string }

const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf-8'))

/** The POS app and agent versions this server expects. */
export function expectedVersions(): { version: string; agentVersion: string | null } {
  const version = readJson(join(process.cwd(), 'electron', 'package.json')).version as string
  let agentVersion: string | null = null
  try { agentVersion = readJson(join(process.cwd(), 'agent', 'r710-local-agent', 'package.json')).version } catch { /* not shipped */ }
  return { version, agentVersion }
}

const hashCache = new Map<string, { mtime: number; sha256: string }>()
function sha256Of(file: string): Promise<string> {
  const mtime = statSync(file).mtimeMs
  const hit = hashCache.get(file)
  if (hit && hit.mtime === mtime) return Promise.resolve(hit.sha256)
  return new Promise((res, rej) => {
    const h = createHash('sha256')
    createReadStream(file).on('data', d => h.update(d)).on('error', rej).on('end', () => {
      const sha256 = h.digest('hex')
      hashCache.set(file, { mtime, sha256 })
      res(sha256)
    })
  })
}

export async function findPosAppInstaller(): Promise<PosAppInstaller | null> {
  const relPath = join(process.cwd(), 'release.json')
  if (existsSync(relPath)) {
    const e = readJson(relPath).electron
    const file = e?.installer ? join(process.cwd(), e.installer) : null
    return file && existsSync(file) ? { file, version: e.version, sha256: e.sha256 } : null
  }
  try {
    const pkg = readJson(join(process.cwd(), 'electron', 'package.json'))
    const out = resolve(process.cwd(), 'electron', pkg.build?.directories?.output || 'dist')
    const file = join(out, `${pkg.build?.productName || 'Multi-Business POS'} Setup ${pkg.version}.exe`)
    if (!existsSync(file)) return null
    return { file, version: pkg.version, sha256: await sha256Of(file) }
  } catch {
    return null
  }
}
