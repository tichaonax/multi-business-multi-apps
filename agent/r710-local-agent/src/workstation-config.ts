/**
 * MBM-275: local storage for the workstation-agent pairing (scale + printer
 * relay), independent of the R710 pairing in config.ts. Kept as a separate
 * file/config so pairing one capability never disturbs the other — a
 * workstation can be paired for R710 only, scale/print only, or both, all
 * within the same running agent process. See config.ts for the R710
 * equivalent this deliberately mirrors.
 */

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import os from 'os'

export interface WorkstationAgentConfig {
  serverUrl: string
  agentToken: string
  workstationAgentId: string
  label: string
  caCert?: string
}

function configDir(): string {
  // Same MBM app-data root as the R710 agent config — this is genuinely one
  // agent installation with two independent pairing files inside it, not a
  // separate program.
  const base = process.env.LOCALAPPDATA || join(os.homedir(), '.local', 'share')
  return join(base, 'MBM', 'R710Agent')
}

function configPath(): string {
  return join(configDir(), 'workstation-config.json')
}

export function loadWorkstationConfig(): WorkstationAgentConfig | null {
  try {
    const raw = readFileSync(configPath(), 'utf-8')
    return JSON.parse(raw) as WorkstationAgentConfig
  } catch {
    return null
  }
}

export function saveWorkstationConfig(config: WorkstationAgentConfig): void {
  const dir = configDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(configPath(), JSON.stringify(config, null, 2), { mode: 0o600 })
}

export function clearWorkstationConfig(): void {
  try {
    unlinkSync(configPath())
  } catch {
    // Already gone — fine.
  }
}
