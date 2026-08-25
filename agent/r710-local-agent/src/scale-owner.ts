/**
 * MBM-276: tracks which profile currently owns the open scale (serial
 * port) connection — the ONE piece of cross-profile exclusivity state this
 * design needs (see plan Section 2a). R710 and Printer relay have no such
 * concept: every configured profile connects and stays connected
 * simultaneously with no restriction, because neither holds an exclusive
 * OS-level resource the way a serial port handle does.
 *
 * Persisted (not just in-memory) so a restart doesn't silently forget who
 * owned the scale — see reclaimOrClear() in workstation-job-handler.ts for
 * how ownership is reclaimed or released after a restart.
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs'
import { join } from 'path'
import os from 'os'

export interface ScaleOwner {
  profileId: string
  since: string
}

function ownerFilePath(): string {
  const base = process.env.LOCALAPPDATA || join(os.homedir(), '.local', 'share')
  const dir = join(base, 'MBM', 'Agent')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'scale-owner.json')
}

export function getScaleOwner(): ScaleOwner | null {
  try {
    return JSON.parse(readFileSync(ownerFilePath(), 'utf-8')) as ScaleOwner
  } catch {
    return null
  }
}

export function setScaleOwner(profileId: string): void {
  writeFileSync(ownerFilePath(), JSON.stringify({ profileId, since: new Date().toISOString() }, null, 2))
}

export function clearScaleOwner(): void {
  try {
    unlinkSync(ownerFilePath())
  } catch {
    // Already gone — fine.
  }
}
