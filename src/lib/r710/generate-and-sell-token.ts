/**
 * Shared R710 token generation utility
 *
 * Generates a token on-the-fly on the R710 device and records the sale.
 * Used by both /api/r710/direct-sale and /api/universal/orders.
 *
 * Two-phase approach:
 *  1. Generate token on device (external API call, no DB)
 *  2. Save token + sale to DB (uses provided tx handle)
 */

import { getR710Executor } from '@/lib/r710/executors'
import { AgentDispatchError } from '@/lib/r710/agent-hub'
import { generateDirectSaleUsername } from '@/lib/r710/username-generator'
import { getOrCreateR710ExpenseAccount } from '@/lib/r710-expense-account-utils'
import { decrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'
import { durationUnitMap } from '@/lib/r710/duration-unit-map'

export interface GenerateAndSellTokenParams {
  businessId: string
  tokenConfigId: string
  saleAmount: number
  paymentMethod: string
  soldBy: string
  saleChannel?: string
  ecocashFeeAmount?: number
  ecocashTransactionCode?: string
}

export interface GenerateAndSellTokenResult {
  success: true
  token: {
    id: string
    username: string
    password: string
    tokenConfigId: string
    status: string
    expiresAt: Date | null
    createdAt: Date
    tokenConfig: {
      name: string
      durationValue: number
      durationUnit: string
      deviceLimit: number
    }
  }
  sale: {
    id: string
    saleAmount: any
    paymentMethod: string
    soldAt: Date
    ecocashFeeAmount?: number
    ecocashTransactionCode?: string
  }
  wlanSsid: string | undefined
}

/**
 * Generate an R710 token on the device and record the sale in the database.
 *
 * @param params - Sale parameters
 * @param tx - Optional Prisma transaction client. If provided, DB writes use this tx
 *             (so the caller's transaction rolls back on failure). If omitted, creates its own transaction.
 */
export async function generateAndSellR710Token(
  params: GenerateAndSellTokenParams,
  tx?: any
): Promise<GenerateAndSellTokenResult> {
  const { businessId, tokenConfigId, saleAmount, paymentMethod, soldBy, saleChannel = 'POS', ecocashFeeAmount, ecocashTransactionCode } = params

  // Phase 1: Fetch config + integration (use tx if available, else prisma)
  const db = tx || prisma

  const tokenConfig = await db.r710TokenConfigs.findUnique({
    where: { id: tokenConfigId },
    include: {
      r710_wlans: { select: { id: true, ssid: true, wlanId: true } }
    }
  })

  if (!tokenConfig || tokenConfig.businessId !== businessId) {
    throw new Error('Token configuration not found')
  }

  const r710Integration = await db.r710BusinessIntegrations.findFirst({
    where: { businessId, isActive: true },
    include: { device_registry: true }
  })

  if (!r710Integration?.device_registry) {
    throw new Error('No active R710 integration or device found for this business')
  }

  const deviceRegistry = r710Integration.device_registry

  // Get or create expense account (uses prisma directly - safe outside tx)
  const r710ExpenseAccount = await getOrCreateR710ExpenseAccount(businessId, soldBy)

  // Phase 2: Generate token on device (external API call)
  const customUsername = generateDirectSaleUsername()
  const apiDurationUnit = durationUnitMap[tokenConfig.durationUnit] || 'hour'
  const decryptedPassword = decrypt(deviceRegistry.encryptedAdminPassword)

  // MBM-272: DIRECT devices call the R710 from this process, same as always;
  // AGENT devices dispatch the same request over the persistent agent<->server
  // channel to whichever workstation is paired to that remote device.
  const executor = getR710Executor(deviceRegistry.connectionMode)

  let tokenResult
  try {
    tokenResult = await executor.generateGuestPass(
      {
        deviceRegistryId: deviceRegistry.id,
        ipAddress: deviceRegistry.ipAddress,
        adminUsername: deviceRegistry.adminUsername,
        adminPassword: decryptedPassword
      },
      {
        wlanName: tokenConfig.r710_wlans?.ssid || '',
        username: customUsername,
        duration: tokenConfig.durationValue,
        durationUnit: apiDurationUnit,
        deviceLimit: tokenConfig.deviceLimit || 2
      },
      { requestedBy: soldBy }
    )
  } catch (error) {
    // Give AGENT-mode dispatch failures a distinct, checkoutable error
    // shape so the POS can tell "the remote agent isn't running" apart
    // from a generic device fault (MBM-272).
    if (error instanceof AgentDispatchError) {
      const message = error.code === 'AGENT_OFFLINE'
        ? 'Remote Wi-Fi device unavailable — the local agent is offline. Contact IT.'
        : 'The remote Wi-Fi device did not respond in time. Please try again.'
      throw Object.assign(new Error(message), { code: error.code })
    }
    throw error
  }

  if (!tokenResult.success || !tokenResult.token) {
    throw new Error(tokenResult.error || 'Failed to generate token on R710 device')
  }

  console.log(`✅ R710 token generated: ${tokenResult.token.username} (channel: ${saleChannel})`)

  // Phase 3: Save to database (uses tx if provided)
  const newToken = await db.r710Tokens.create({
    data: {
      businessId,
      wlanId: tokenConfig.r710_wlans!.id,
      tokenConfigId,
      username: tokenResult.token.username,
      password: tokenResult.token.password,
      status: 'SOLD',
      expiresAtR710: tokenResult.token.expiresAt,
      createdAt: new Date()
    }
  })

  const sale = await recordR710TokenSale(
    { businessId, tokenId: newToken.id, tokenLabel: newToken.username, saleAmount, paymentMethod, soldBy, ecocashFeeAmount, ecocashTransactionCode },
    r710ExpenseAccount.id,
    db
  )

  return {
    success: true,
    token: {
      id: newToken.id,
      username: newToken.username,
      password: newToken.password,
      tokenConfigId: newToken.tokenConfigId,
      status: newToken.status,
      expiresAt: newToken.expiresAtR710,
      createdAt: newToken.createdAt,
      tokenConfig: {
        name: tokenConfig.name,
        durationValue: tokenConfig.durationValue,
        durationUnit: tokenConfig.durationUnit,
        deviceLimit: tokenConfig.deviceLimit
      }
    },
    sale,
    wlanSsid: tokenConfig.r710_wlans?.ssid
  }
}

/**
 * Records a sale for an R710 token that already exists as a row (either a
 * pre-generated AVAILABLE token being consumed from the pool, or a token
 * just created by generateAndSellR710Token above) — the R710TokenSales
 * record, the expense account deposit, and the account balance recalc.
 * Factored out so both paths (pool consumption and live/on-the-fly
 * generation) account for revenue identically instead of one of them
 * silently skipping the deposit, as previously happened wherever a pooled
 * token was sold without going through generateAndSellR710Token.
 */
async function recordR710TokenSale(
  params: {
    businessId: string
    tokenId: string
    tokenLabel: string // username, for the deposit note
    saleAmount: number
    paymentMethod: string
    soldBy: string
    ecocashFeeAmount?: number
    ecocashTransactionCode?: string
  },
  expenseAccountId: string,
  db: any
): Promise<GenerateAndSellTokenResult['sale']> {
  const { businessId, tokenId, tokenLabel, saleAmount, paymentMethod, soldBy, ecocashFeeAmount, ecocashTransactionCode } = params

  const sale = await db.r710TokenSales.create({
    data: {
      businessId,
      tokenId,
      expenseAccountId,
      saleAmount: saleAmount || 0,
      paymentMethod: paymentMethod || 'CASH',
      saleChannel: 'POS',
      soldBy,
      soldAt: new Date(),
      ...(ecocashFeeAmount != null ? { ecocashFeeAmount } : {}),
      ...(ecocashTransactionCode ? { ecocashTransactionCode } : {})
    }
  })

  // Deposit = saleAmount minus EcoCash fee (fee goes to the payment provider, not our account)
  const depositAmount = ecocashFeeAmount != null ? saleAmount - ecocashFeeAmount : saleAmount

  if (depositAmount && depositAmount > 0) {
    await db.expenseAccountDeposits.create({
      data: {
        expenseAccountId,
        sourceType: 'R710_TOKEN_SALE',
        sourceBusinessId: businessId,
        amount: depositAmount,
        depositDate: new Date(),
        autoGeneratedNote: `R710 WiFi Token Sale - [${tokenLabel}]`,
        transactionType: 'SALE',
        createdBy: soldBy
      }
    })

    const depositsSum = await db.expenseAccountDeposits.aggregate({
      where: { expenseAccountId },
      _sum: { amount: true },
    })

    const paymentsSum = await db.expenseAccountPayments.aggregate({
      where: { expenseAccountId, status: { in: ['PAID', 'SUBMITTED', 'APPROVED'] } },
      _sum: { amount: true },
    })

    const newBalance = Number(depositsSum._sum.amount || 0) - Number(paymentsSum._sum.amount || 0)

    await db.expenseAccounts.update({
      where: { id: expenseAccountId },
      data: { balance: newBalance, updatedAt: new Date() },
    })
  }

  return {
    id: sale.id,
    saleAmount: sale.saleAmount,
    paymentMethod: sale.paymentMethod,
    soldAt: sale.soldAt,
    ...(ecocashFeeAmount != null ? { ecocashFeeAmount } : {}),
    ...(ecocashTransactionCode ? { ecocashTransactionCode } : {})
  }
}

/**
 * Sells an existing pre-generated AVAILABLE token from the pool (marks it
 * SOLD and records the sale) — no device call at all, unlike
 * generateAndSellR710Token. Used when the pool has stock; callers should
 * fall back to generateAndSellR710Token only once the pool is exhausted.
 */
export async function sellExistingR710Token(
  params: { businessId: string; tokenId: string; saleAmount: number; paymentMethod: string; soldBy: string },
  tx?: any
): Promise<GenerateAndSellTokenResult> {
  const { businessId, tokenId, saleAmount, paymentMethod, soldBy } = params
  const db = tx || prisma

  const token = await db.r710Tokens.findUnique({
    where: { id: tokenId },
    include: {
      r710_token_configs: { select: { name: true, durationValue: true, durationUnit: true, deviceLimit: true } },
      r710_wlans: { select: { ssid: true } },
    },
  })

  if (!token || token.businessId !== businessId) {
    throw new Error('Token not found')
  }

  const r710ExpenseAccount = await getOrCreateR710ExpenseAccount(businessId, soldBy)

  const updated = await db.r710Tokens.update({
    where: { id: tokenId },
    data: { status: 'SOLD' },
  })

  const sale = await recordR710TokenSale(
    { businessId, tokenId, tokenLabel: token.username, saleAmount, paymentMethod, soldBy },
    r710ExpenseAccount.id,
    db
  )

  return {
    success: true,
    token: {
      id: updated.id,
      username: token.username,
      password: token.password,
      tokenConfigId: token.tokenConfigId,
      status: updated.status,
      expiresAt: token.expiresAtR710,
      createdAt: token.createdAt,
      tokenConfig: {
        name: token.r710_token_configs?.name || '',
        durationValue: token.r710_token_configs?.durationValue || 0,
        durationUnit: token.r710_token_configs?.durationUnit || '',
        deviceLimit: token.r710_token_configs?.deviceLimit || 1,
      },
    },
    sale,
    wlanSsid: token.r710_wlans?.ssid,
  }
}
