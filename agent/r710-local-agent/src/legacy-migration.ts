/**
 * MBM-276: one-time migration from the old single fixed-path config files
 * (%LOCALAPPDATA%\MBM\R710Agent\config.json / workstation-config.json — one
 * of each, per machine, shared by whichever server happened to pair last)
 * into the new profiles directory (profile-store.ts). Runs once, at the
 * start of main(), before anything else touches profile storage.
 *
 * Every currently-paired workstation keeps working with zero user action —
 * this is a transparent upgrade, not a re-pair. After migrating, the old
 * files are removed so this only ever runs once.
 */

import { existsSync, readFileSync, unlinkSync, rmdirSync } from 'fs'
import { join } from 'path'
import os from 'os'
import { ensureProfile, profilesRoot } from './profile-store'
import { saveConfig, type AgentConfig } from './config'
import { saveWorkstationConfig, type WorkstationAgentConfig } from './workstation-config'

function legacyDir(): string {
  const base = process.env.LOCALAPPDATA || join(os.homedir(), '.local', 'share')
  return join(base, 'MBM', 'R710Agent')
}

function readLegacyJson<T>(fileName: string): T | null {
  try {
    return JSON.parse(readFileSync(join(legacyDir(), fileName), 'utf-8')) as T
  } catch {
    return null
  }
}

export function migrateLegacyConfigIfNeeded(): void {
  // Only run if no profile has ever been created yet — a workstation that's
  // already been through this (or was never on the old format) should
  // never have this touch anything again.
  if (existsSync(profilesRoot())) return

  const legacyR710 = readLegacyJson<AgentConfig>('config.json')
  const legacyWorkstation = readLegacyJson<WorkstationAgentConfig>('workstation-config.json')

  if (!legacyR710 && !legacyWorkstation) return // fresh install, nothing to migrate

  console.log('[Agent] Migrating legacy single-profile config to the new multi-profile format...')

  if (legacyR710) {
    const profileId = ensureProfile(legacyR710.serverUrl, legacyR710.label)
    saveConfig(profileId, legacyR710)
    console.log(`[Agent]   Migrated R710 pairing for ${legacyR710.serverUrl} -> profile ${profileId}`)
  }

  if (legacyWorkstation) {
    // Same server as the R710 pairing resolves to the same profileId
    // automatically (deriveProfileId is a pure function of serverUrl) — a
    // workstation paired for both against the same server correctly lands
    // in one profile, not two.
    const profileId = ensureProfile(legacyWorkstation.serverUrl, legacyWorkstation.label)
    saveWorkstationConfig(profileId, legacyWorkstation)
    console.log(`[Agent]   Migrated Workstation pairing for ${legacyWorkstation.serverUrl} -> profile ${profileId}`)
  }

  // Clean up the old files so this migration never runs again.
  try {
    if (legacyR710) unlinkSync(join(legacyDir(), 'config.json'))
    if (legacyWorkstation) unlinkSync(join(legacyDir(), 'workstation-config.json'))
    rmdirSync(legacyDir())
  } catch {
    // Non-fatal — the migration already succeeded; leftover empty files/dir
    // don't affect anything going forward since profilesRoot() now exists.
  }
}
