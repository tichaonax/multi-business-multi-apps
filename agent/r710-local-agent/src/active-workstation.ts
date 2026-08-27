/**
 * MBM-279: tracks which business's workstation (scale+printer) pairing is
 * currently the active one for a given server profile — the one thing that
 * actually needs to be exclusive now that a profile can hold pairings for
 * several businesses (see workstation-config.ts). Not configuration: losing
 * this file just means "nothing active until the next business switch,"
 * which self-heals the moment a browser on this machine switches business
 * again (see local-agent-sync on the web side) — never a data-loss concern.
 */

import { readProfileFile, writeProfileFile, deleteProfileFile } from './profile-store'

const FILE_NAME = 'active-workstation.json'

interface ActiveWorkstation {
  businessId: string
  since: string
}

export function getActiveWorkstationBusinessId(profileId: string): string | null {
  return readProfileFile<ActiveWorkstation>(profileId, FILE_NAME)?.businessId ?? null
}

export function setActiveWorkstationBusinessId(profileId: string, businessId: string | null): void {
  if (businessId === null) {
    deleteProfileFile(profileId, FILE_NAME)
    return
  }
  writeProfileFile(profileId, FILE_NAME, { businessId, since: new Date().toISOString() })
}
