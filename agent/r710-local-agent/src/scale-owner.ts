/**
 * MBM-276: tracks which profile currently owns the open scale (serial
 * port) connection — the ONE piece of cross-profile exclusivity state this
 * design needs (see plan Section 2a). R710 and Printer relay have no such
 * concept: every configured profile connects and stays connected
 * simultaneously with no restriction, because neither holds an exclusive
 * OS-level resource the way a serial port handle does.
 *
 * MBM-283: extended to (profileId, businessId). A single profile can now
 * have several businesses' workstation sockets connected simultaneously on
 * this same machine (index.ts's connectAllProfiles()), but the scale is
 * still one physical serial port shared by all of them — ownership must be
 * exclusive per business, not just per profile, or two businesses under the
 * same server could both believe they own it at once.
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
  businessId: string
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

export function setScaleOwner(profileId: string, businessId: string): void {
  writeFileSync(ownerFilePath(), JSON.stringify({ profileId, businessId, since: new Date().toISOString() }, null, 2))
}

export function clearScaleOwner(): void {
  try {
    unlinkSync(ownerFilePath())
  } catch {
    // Already gone — fine.
  }
}
