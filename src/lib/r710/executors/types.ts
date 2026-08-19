/**
 * MBM-272: shared contract between the DIRECT (server-side) and AGENT
 * (remote, via a paired local agent) ways of reaching an R710 device.
 */

import type { R710TokenConfig, R710Token } from '@/services/ruckus-r710-api'

export interface R710GuestPassParams {
  wlanName: string
  username: string
  duration: number
  durationUnit: 'hour' | 'day' | 'week'
  deviceLimit: number
}

export interface R710GuestPassResult {
  success: boolean
  token?: { username: string; password: string; expiresAt: Date }
  error?: string
}

export interface R710DeviceTarget {
  deviceRegistryId: string
  ipAddress: string
  adminUsername: string
  adminPassword: string // decrypted
}

// Optional context carried through to the agent-request audit log; ignored
// by the DIRECT executor since it has no separate log of its own.
export interface R710ExecutorContext {
  requestedBy?: string
}

export interface R710BulkGenerateResult {
  success: boolean
  tokens?: R710Token[]
  error?: string
}

export interface R710QueryTokensResult {
  success: boolean
  tokens?: R710Token[]
  error?: string
}

export interface R710Executor {
  generateGuestPass(
    device: R710DeviceTarget,
    params: R710GuestPassParams,
    context?: R710ExecutorContext
  ): Promise<R710GuestPassResult>

  // Bulk pre-generation (background top-up) — used by auto-generate-service.ts.
  generateTokens(
    device: R710DeviceTarget,
    params: R710TokenConfig,
    context?: R710ExecutorContext
  ): Promise<R710BulkGenerateResult>

  // Full token list from the device — used by token-sync-service.ts to
  // reconcile DB status against what the device actually has.
  queryAllTokens(
    device: R710DeviceTarget,
    context?: R710ExecutorContext
  ): Promise<R710QueryTokensResult>
}
