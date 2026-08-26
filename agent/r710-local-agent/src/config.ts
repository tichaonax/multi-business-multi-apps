/**
 * MBM-272: R710 pairing config.
 * MBM-276: now profile-scoped — one r710.json per paired server (see
 * profile-store.ts), instead of a single fixed-path config.json shared by
 * every server this workstation has ever been paired to. Callers resolve
 * a profileId (via profile-store.ts's deriveProfileId/ensureProfile) and
 * pass it in; this module no longer owns any single global file path.
 */

import { readProfileFile, writeProfileFile, deleteProfileFile } from './profile-store'

const FILE_NAME = 'r710.json'

export interface AgentConfig {
  serverUrl: string
  agentToken: string
  deviceRegistryId: string
  label: string
  // The server's self-signed CA cert (PEM), when it runs HTTPS with one —
  // see the comment on readRootCaCert() in the pairing route. Absent when
  // the server uses plain HTTP or a real publicly-trusted cert.
  caCert?: string
  // Snapshot of the R710 device's IP address at pairing time, for the tray's
  // benefit only (display/troubleshooting) — never used for the actual job
  // dispatch, which always gets a fresh device.ipAddress from the server on
  // every job (see job-handler.ts), so this going stale after a device's IP
  // changes on the admin panel is cosmetic, not a functional problem.
  deviceIpAddress?: string
}

export function loadConfig(profileId: string): AgentConfig | null {
  return readProfileFile<AgentConfig>(profileId, FILE_NAME)
}

export function saveConfig(profileId: string, config: AgentConfig): void {
  writeProfileFile(profileId, FILE_NAME, config)
}

// Used when the server rejects this profile's token (revoked from the admin
// panel, most commonly) — clears just this profile's R710 pairing, leaving
// every other profile (and this profile's Workstation pairing, if any)
// untouched.
export function clearConfig(profileId: string): void {
  deleteProfileFile(profileId, FILE_NAME)
}
