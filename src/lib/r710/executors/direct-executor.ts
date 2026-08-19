/**
 * MBM-272: DIRECT executor — today's behavior, extracted unchanged from
 * generate-and-sell-token.ts. Used for R710DeviceRegistry rows with
 * connectionMode = DIRECT (the server reaches the device itself, same LAN).
 */

import { R710SessionManager } from '@/lib/r710-session-manager'
import type { R710TokenConfig } from '@/services/ruckus-r710-api'
import type {
  R710Executor,
  R710DeviceTarget,
  R710GuestPassParams,
  R710GuestPassResult,
  R710BulkGenerateResult,
  R710QueryTokensResult,
} from './types'

const sessionManager = new R710SessionManager()

async function withInvalidateOnError<T>(device: R710DeviceTarget, run: (r710Service: any) => Promise<T>): Promise<T> {
  const deviceConfig = {
    ipAddress: device.ipAddress,
    adminUsername: device.adminUsername,
    adminPassword: device.adminPassword,
  }
  try {
    return await sessionManager.withSession(deviceConfig, run)
  } catch (deviceError) {
    // Invalidate the cached session so the next attempt re-authenticates
    // instead of reusing a stale/broken session (e.g. after device reboot).
    await sessionManager.invalidateSession(device.ipAddress).catch(() => {})
    throw deviceError
  }
}

export const directExecutor: R710Executor = {
  async generateGuestPass(device: R710DeviceTarget, params: R710GuestPassParams): Promise<R710GuestPassResult> {
    return withInvalidateOnError(device, (r710Service) => r710Service.generateSingleGuestPass(params))
  },

  async generateTokens(device: R710DeviceTarget, params: R710TokenConfig): Promise<R710BulkGenerateResult> {
    return withInvalidateOnError(device, (r710Service) => r710Service.generateTokens(params))
  },

  async queryAllTokens(device: R710DeviceTarget): Promise<R710QueryTokensResult> {
    return withInvalidateOnError(device, async (r710Service) => {
      const tokens = await r710Service.queryAllTokens()
      return { success: true, tokens }
    })
  },
}
