/**
 * MBM-272: local agent config — where it stores the server URL and the
 * pairing token it received during the one-time loopback pairing handshake
 * (see pairing-server.ts). No secrets are ever typed by hand; this file is
 * written once by that handshake and read on every subsequent start.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import os from 'os'

export interface AgentConfig {
  serverUrl: string
  agentToken: string
  deviceRegistryId: string
  label: string
}

function configDir(): string {
  // %LOCALAPPDATA%\MBM\R710Agent on Windows; a sane fallback elsewhere for dev.
  const base = process.env.LOCALAPPDATA || join(os.homedir(), '.local', 'share')
  return join(base, 'MBM', 'R710Agent')
}

function configPath(): string {
  return join(configDir(), 'config.json')
}

export function loadConfig(): AgentConfig | null {
  try {
    const raw = readFileSync(configPath(), 'utf-8')
    return JSON.parse(raw) as AgentConfig
  } catch {
    return null
  }
}

export function saveConfig(config: AgentConfig): void {
  const dir = configDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(configPath(), JSON.stringify(config, null, 2), { mode: 0o600 })
}

export function isPaired(): boolean {
  return loadConfig() !== null
}
