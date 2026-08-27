/**
 * MBM-275: Scale/Printer relay pairing config.
 * MBM-276: profile-scoped — one workstation.json per paired server.
 * MBM-279: profile+business-scoped. A single physical workstation can be
 * paired for Scale/Printer by SEVERAL businesses on the SAME server (e.g. a
 * shared till used by different businesses at different times) — MBM-276's
 * one-file-per-server-profile model only ever kept the most recently paired
 * business's config, silently overwriting (and permanently disconnecting) any
 * business paired here before it. Every business's pairing is now kept
 * forever under its own file, once made:
 *
 *   profiles/<profileId>/businesses/<businessId>/workstation.json
 *
 * Which one is actually connected right now is tracked separately in
 * active-workstation.ts — a business having a file here just means "this
 * machine knows how to connect for this business," not that it currently is.
 */

import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { readProfileFile, writeProfileFile, deleteProfileFile, profileDir } from './profile-store'

const FILE_NAME = 'workstation.json'

function businessFilePath(businessId: string): string {
  return join('businesses', businessId, FILE_NAME)
}

export interface WorkstationAgentConfig {
  serverUrl: string
  agentToken: string
  workstationAgentId: string
  // Optional only for the brief window between "connecting a pre-MBM-279
  // flat config whose businessId isn't known yet" and "the first sync
  // response tells us" — see workstation-socket-client.ts's syncConfig() and
  // legacy-migration.ts. Always present for anything saved under the
  // businesses/<businessId>/ layout, i.e. everything going forward.
  businessId?: string
  label: string
  caCert?: string
  // Database-driven info about THIS pairing, refreshed periodically by
  // workstation-socket-client.ts's syncConfig() — never used for any actual
  // functionality (print jobs/scale connects always get fresh params from
  // the server at dispatch time), purely for the tray's display. See
  // AgentConfig's deviceIpAddress comment for the same pattern on R710.
  businessName?: string
  configuredPrinters?: string[]
  scaleComPort?: string
  scaleBaudRate?: number
  // The printer QZ Tray (a separate program, browser-driven — not this
  // agent) is set up to use on THIS machine, if any — informational only,
  // never used by this agent to route a job. See qz-config/route.ts.
  qzPrinterName?: string
}

export function loadWorkstationConfig(profileId: string, businessId: string): WorkstationAgentConfig | null {
  return readProfileFile<WorkstationAgentConfig>(profileId, businessFilePath(businessId))
}

export function saveWorkstationConfig(profileId: string, businessId: string, config: WorkstationAgentConfig): void {
  writeProfileFile(profileId, businessFilePath(businessId), config)
}

export function clearWorkstationConfig(profileId: string, businessId: string): void {
  deleteProfileFile(profileId, businessFilePath(businessId))
}

/** Every businessId that has a workstation pairing saved on this profile —
 *  drives the tray's "other businesses paired here" list (Section 6 of the
 *  MBM-279 plan) and lets pairing-server.ts answer /probe without needing to
 *  know a specific businessId's file path up front. */
export function listWorkstationBusinessIds(profileId: string): string[] {
  const dir = join(profileDir(profileId), 'businesses')
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(businessId => existsSync(join(dir, businessId, FILE_NAME)))
}

// ── Legacy (pre-MBM-279) flat layout — profiles/<profileId>/workstation.json,
// with no businessId inside it (or, one migration further back, the very
// first single fixed-path workstation-config.json that legacy-migration.ts's
// ORIGINAL MBM-276 migration wrote here). Once connected, the first sync
// response tells the socket client the real businessId, which triggers
// moving it into the businesses/<businessId>/ layout above (see
// workstation-socket-client.ts's syncConfig()) — this surface exists only for
// that one-time read/write/delete; new pairings never use it.
export function hasLegacyFlatWorkstationConfig(profileId: string): boolean {
  return existsSync(join(profileDir(profileId), FILE_NAME))
}

export function loadLegacyFlatWorkstationConfig(profileId: string): WorkstationAgentConfig | null {
  return readProfileFile<WorkstationAgentConfig>(profileId, FILE_NAME)
}

export function saveLegacyFlatWorkstationConfig(profileId: string, config: WorkstationAgentConfig): void {
  writeProfileFile(profileId, FILE_NAME, config)
}

export function deleteLegacyFlatWorkstationConfig(profileId: string): void {
  deleteProfileFile(profileId, FILE_NAME)
}
