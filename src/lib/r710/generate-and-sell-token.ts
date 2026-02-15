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

import { R710SessionManager } from '@/lib/r710-session-manager'
import { generateDirectSaleUsername } from '@/lib/r710/username-generator'
import { getOrCreateR710ExpenseAccount } from '@/lib/r710-expense-account-utils'
import { decrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'

const sessionManager = new R710SessionManager()

// Duration unit mapping from DB format to API format
const durationUnitMap: Record<string, 'hour' | 'day' | 'week'> = {
  'hour_Hours': 'hour',
  'day_Days': 'day',
  'week_Weeks': 'week'
}

export interface GenerateAndSellTokenParams {
  businessId: string
  tokenConfigId: string
  saleAmount: number
  paymentMethod: string
  soldBy: string
  saleChannel?: string
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
  const { businessId, tokenConfigId, saleAmount, paymentMethod, soldBy, saleChannel = 'POS' } = params

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

  const tokenResult = await sessionManager.withSession(
    {
      ipAddress: deviceRegistry.ipAddress,
      adminUsername: deviceRegistry.adminUsername,
      adminPassword: decryptedPassword
    },
    async (r710Service) => {
      return await r710Service.generateSingleGuestPass({
        wlanName: tokenConfig.r710_wlans?.ssid || '',
        username: customUsername,
        duration: tokenConfig.durationValue,
        durationUnit: apiDurationUnit,
        deviceLimit: tokenConfig.deviceLimit || 2
      })
    }
  )

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

  const sale = await db.r710TokenSales.create({
    data: {
      businessId,
      tokenId: newToken.id,
      expenseAccountId: r710ExpenseAccount.id,
      saleAmount: saleAmount || 0,
      paymentMethod: paymentMethod || 'CASH',
      saleChannel,
      soldBy,
      soldAt: new Date()
    }
  })

  // Create deposit into expense account (only for paid tokens)
  if (saleAmount && saleAmount > 0) {
    await db.expenseAccountDeposits.create({
      data: {
        expenseAccountId: r710ExpenseAccount.id,
        sourceType: 'R710_TOKEN_SALE',
        sourceBusinessId: businessId,
        amount: saleAmount,
        depositDate: new Date(),
        autoGeneratedNote: `R710 WiFi Token Sale - ${tokenConfig.name} [${newToken.username}]`,
        transactionType: 'SALE',
        createdBy: soldBy
      }
    })

    const depositsSum = await db.expenseAccountDeposits.aggregate({
      where: { expenseAccountId: r710ExpenseAccount.id },
      _sum: { amount: true },
    })

    const paymentsSum = await db.expenseAccountPayments.aggregate({
      where: { expenseAccountId: r710ExpenseAccount.id, status: 'SUBMITTED' },
      _sum: { amount: true },
    })

    const newBalance = Number(depositsSum._sum.amount || 0) - Number(paymentsSum._sum.amount || 0)

    await db.expenseAccounts.update({
      where: { id: r710ExpenseAccount.id },
      data: { balance: newBalance, updatedAt: new Date() },
    })
  }

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
    sale: {
      id: sale.id,
      saleAmount: sale.saleAmount,
      paymentMethod: sale.paymentMethod,
      soldAt: sale.soldAt
    },
    wlanSsid: tokenConfig.r710_wlans?.ssid
  }
}
