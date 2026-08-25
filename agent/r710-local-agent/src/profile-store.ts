/**
 * MBM-276: core storage for multi-server agent profiles.
 *
 * Replaces the old single fixed-path config files (config.ts /
 * workstation-config.ts previously wrote to one config.json and one
 * workstation-config.json per machine, forever) with one directory per
 * paired server, keyed deterministically off that server's URL:
 *
 *   %LOCALAPPDATA%\MBM\Agent\profiles\<profileId>\
 *     profile.json       — { serverUrl, label, createdAt, lastActiveAt }
 *     r710.json          — R710 pairing (absent if never paired here)
 *     workstation.json   — Scale/Printer pairing (absent if never paired here)
 *
 * <profileId> = sha256(normalized serverUrl), truncated — re-pairing to the
 * SAME server always resolves to the SAME directory (idempotent, no
 * duplicate profiles); a DIFFERENT server always gets its own, completely
 * separate directory. This is the one design choice that makes it
 * impossible for pairing to server B to ever touch server A's files —
 * directly closing the bug where a fresh install silently reconnected to
 * a previously-paired server because both wrote to the same fixed path.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'
import os from 'os'

export interface ProfileMeta {
  serverUrl: string
  label: string
  createdAt: string
  lastActiveAt?: string
}

function appDataRoot(): string {
  const base = process.env.LOCALAPPDATA || join(os.homedir(), '.local', 'share')
  return join(base, 'MBM', 'Agent')
}

export function profilesRoot(): string {
  return join(appDataRoot(), 'profiles')
}

function normalizeServerUrl(serverUrl: string): string {
  return serverUrl.trim().toLowerCase().replace(/\/+$/, '')
}

/** Deterministic, filesystem-safe id for a given server URL. Same URL -> same id, always. */
export function deriveProfileId(serverUrl: string): string {
  return createHash('sha256').update(normalizeServerUrl(serverUrl)).digest('hex').slice(0, 16)
}

export function profileDir(profileId: string): string {
  return join(profilesRoot(), profileId)
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as T
  } catch {
    return null
  }
}

function writeJson(filePath: string, data: unknown): void {
  ensureDir(join(filePath, '..'))
  writeFileSync(filePath, JSON.stringify(data, null, 2), { mode: 0o600 })
}

export function readProfileMeta(profileId: string): ProfileMeta | null {
  return readJson<ProfileMeta>(join(profileDir(profileId), 'profile.json'))
}

export function writeProfileMeta(profileId: string, meta: ProfileMeta): void {
  writeJson(join(profileDir(profileId), 'profile.json'), meta)
}

export function touchProfileLastActive(profileId: string): void {
  const meta = readProfileMeta(profileId)
  if (meta) writeProfileMeta(profileId, { ...meta, lastActiveAt: new Date().toISOString() })
}

/** Ensures a profile.json exists for this server, creating one if this is the first pairing for it. */
export function ensureProfile(serverUrl: string, label: string): string {
  const profileId = deriveProfileId(serverUrl)
  const existing = readProfileMeta(profileId)
  if (!existing) {
    writeProfileMeta(profileId, { serverUrl, label, createdAt: new Date().toISOString() })
  }
  return profileId
}

/** Generic read/write for the two per-capability files (r710.json / workstation.json) within a profile. */
export function readProfileFile<T>(profileId: string, fileName: string): T | null {
  return readJson<T>(join(profileDir(profileId), fileName))
}

export function writeProfileFile(profileId: string, fileName: string, data: unknown): void {
  writeJson(join(profileDir(profileId), fileName), data)
}

export function deleteProfileFile(profileId: string, fileName: string): void {
  try {
    const filePath = join(profileDir(profileId), fileName)
    if (existsSync(filePath)) rmSync(filePath)
  } catch {
    // Already gone — fine.
  }
}

/** All known profile ids — anything under profiles\ with a profile.json. */
export function listProfileIds(): string[] {
  const root = profilesRoot()
  if (!existsSync(root)) return []
  return readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(id => readProfileMeta(id) !== null)
}

export function deleteProfile(profileId: string): void {
  try {
    rmSync(profileDir(profileId), { recursive: true, force: true })
  } catch {
    // Already gone — fine.
  }
}
