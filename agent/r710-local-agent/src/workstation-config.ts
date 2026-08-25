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
