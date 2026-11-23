// MBM-341 — which release this server is running, for /api/health and the
// install scripts (they ask the RUNNING server, not the files on disk).
// - A packaged release has release.json at the app root (npm run release).
// - A build from a checkout has dist/version.json (scripts/mark-build-complete.js).
// Read once per process: the answer is the release that started.
import fs from 'fs'
import path from 'path'

export interface ReleaseInfo {
  version: string
  commit: string | null
  builtAt: string | null
  source: 'release.json' | 'dist/version.json' | 'unknown'
}

let cached: ReleaseInfo | null = null

function readJson(file: string): Record<string, unknown> | null {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return null }
}

export function getReleaseInfo(): ReleaseInfo {
  if (cached) return cached
  const root = process.cwd()
  const rel = readJson(path.join(root, 'release.json'))
  if (rel && typeof rel.version === 'string') {
    cached = { version: rel.version, commit: (rel.commit as string) ?? null, builtAt: (rel.builtAt as string) ?? null, source: 'release.json' }
    return cached
  }
  const dist = readJson(path.join(root, 'dist', 'version.json'))
  if (dist) {
    cached = {
      version: String(dist.buildVersion ?? '0.0.0'),
      commit: (dist.gitCommit as string) ?? null,
      builtAt: (dist.buildDate as string) ?? null,
      source: 'dist/version.json',
    }
    return cached
  }
  cached = { version: '0.0.0', commit: null, builtAt: null, source: 'unknown' }
  return cached
}
