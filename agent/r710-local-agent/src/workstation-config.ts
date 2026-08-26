/**
 * MBM-275: Scale/Printer relay pairing config.
 * MBM-276: now profile-scoped — one workstation.json per paired server (see
 * profile-store.ts / config.ts's equivalent header comment for the
 * rationale). A workstation can hold a Workstation pairing for server A and
 * a completely separate one for server B without either affecting the
 * other.
 */

import { readProfileFile, writeProfileFile, deleteProfileFile } from './profile-store'

const FILE_NAME = 'workstation.json'

export interface WorkstationAgentConfig {
  serverUrl: string
  agentToken: string
  workstationAgentId: string
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

export function loadWorkstationConfig(profileId: string): WorkstationAgentConfig | null {
  return readProfileFile<WorkstationAgentConfig>(profileId, FILE_NAME)
}

export function saveWorkstationConfig(profileId: string, config: WorkstationAgentConfig): void {
  writeProfileFile(profileId, FILE_NAME, config)
}

export function clearWorkstationConfig(profileId: string): void {
  deleteProfileFile(profileId, FILE_NAME)
}
