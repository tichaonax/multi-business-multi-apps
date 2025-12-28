/**
 * R710 Direct Token Sale API
 *
 * Generate and sell an R710 token on-the-fly (not from pool)
 * Creates token directly on R710 device and saves to database
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SessionUser, isSystemAdmin } from '@/lib/permission-utils'
import { getOrCreateR710ExpenseAccount } from '@/lib/r710-expense-account-utils'
import { R710SessionManager } from '@/lib/r710-session-manager'
import { generateDirectSaleUsername } from '@/lib/r710/username-generator'
import { decrypt } from '@/lib/encryption'

const sessionManager = new R710SessionManager()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { businessId, tokenConfigId, saleAmount, paymentMethod } = body

    if (!businessId || !tokenConfigId) {
      return NextResponse.json(
        { error: 'businessId and tokenConfigId are required' },
        { status: 400 }
      )
    }

    const user = session.user as SessionUser

    // Check if user has access to this business (admins have access to all businesses)
    if (!isSystemAdmin(user)) {
      // Verify business membership for non-admin users
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          businessId,
          userId: user.id,
          isActive: true
        }
      })

      if (!membership) {
        return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
      }
    }

    // Verify token config exists and get WLAN details
    const tokenConfig = await prisma.r710TokenConfigs.findUnique({
      where: { id: tokenConfigId },
      include: {
        r710_wlans: {
          select: {
            id: true,
            ssid: true,
            wlanId: true
          }
        }
      }
    })

    if (!tokenConfig || tokenConfig.businessId !== businessId) {
      return NextResponse.json(
        { error: 'Token configuration not found' },
        { status: 404 }
      )
    }

    // Get R710 integration for device connection
    const r710Integration = await prisma.r710BusinessIntegrations.findFirst({
      where: {
        businessId,
        isActive: true
      },
      include: {
        device_registry: true
      }
    })

    if (!r710Integration) {
      return NextResponse.json(
        { error: 'No active R710 integration found for this business' },
        { status: 404 }
      )
    }

    // Get device credentials from registry (already included)
    const deviceRegistry = r710Integration.device_registry

    if (!deviceRegistry) {
      return NextResponse.json(
        { error: 'R710 device not found in registry' },
        { status: 404 }
      )
    }

    // Get or create R710 expense account for this business
    const r710ExpenseAccount = await getOrCreateR710ExpenseAccount(businessId, user.id)

    // Generate custom username for direct sale
    const customUsername = generateDirectSaleUsername()

    console.log(`[R710 Direct Sale] Generating token on-the-fly: ${customUsername}`)
    console.log(`[R710 Direct Sale] WLAN SSID: ${tokenConfig.r710_wlans?.ssid}`)
    console.log(`[R710 Direct Sale] WLAN ID: ${tokenConfig.r710_wlans?.wlanId}`)
    console.log(`[R710 Direct Sale] Duration: ${tokenConfig.durationValue} ${tokenConfig.durationUnit}`)

    // Decrypt the device password
    const decryptedPassword = decrypt(deviceRegistry.encryptedAdminPassword)

    // Convert durationUnit from "hour_Hours" format to "hour" format
    const durationUnitMap: { [key: string]: 'hour' | 'day' | 'week' } = {
      'hour_Hours': 'hour',
      'day_Days': 'day',
      'week_Weeks': 'week'
    }
    const apiDurationUnit = durationUnitMap[tokenConfig.durationUnit] || 'hour'

    // Generate token on R710 device using session manager
    const tokenResult = await sessionManager.withSession(
      {
        ipAddress: deviceRegistry.ipAddress,
        adminUsername: deviceRegistry.adminUsername,
        adminPassword: decryptedPassword
      },
      async (r710Service) => {
        // CRITICAL: Use SSID (wlanName), not numeric wlanId
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
      return NextResponse.json(
        { error: 'Failed to generate token on R710 device', details: tokenResult.error },
        { status: 500 }
      )
    }

    console.log(`[R710 Direct Sale] Token generated successfully!`)
    console.log(`[R710 Direct Sale] Username: ${tokenResult.token.username}`)
    console.log(`[R710 Direct Sale] Password: ${tokenResult.token.password}`)

    // Use Prisma transaction to save token and sale to database
    const result = await prisma.$transaction(async (tx) => {
      // Create token record in database
      const newToken = await tx.r710Tokens.create({
        data: {
          businessId,
          wlanId: tokenConfig.r710_wlans!.id,
          tokenConfigId,
          username: tokenResult.token!.username,
          password: tokenResult.token!.password,
          status: 'SOLD', // Immediately sold
          expiresAtR710: tokenResult.token!.expiresAt,
          createdAt: new Date()
        }
      })

      // Create sale record
      const sale = await tx.r710TokenSales.create({
        data: {
          businessId,
          tokenId: newToken.id,
          expenseAccountId: r710ExpenseAccount.id,
          saleAmount: saleAmount || 0,
          paymentMethod: paymentMethod || 'CASH',
          saleChannel: 'DIRECT',
          soldBy: user.id,
          soldAt: new Date()
        }
      })

      // Create deposit into expense account
      if (saleAmount && saleAmount > 0) {
        await tx.expenseAccountDeposits.create({
          data: {
            expenseAccountId: r710ExpenseAccount.id,
            sourceType: 'R710_TOKEN_SALE',
            sourceBusinessId: businessId,
            amount: saleAmount,
            depositDate: new Date(),
            autoGeneratedNote: `R710 WiFi Token Sale - ${tokenConfig.name} [${newToken.username}]`,
            transactionType: 'SALE',
            createdBy: user.id
          }
        })

        // Update expense account balance
        const depositsSum = await tx.expenseAccountDeposits.aggregate({
          where: { expenseAccountId: r710ExpenseAccount.id },
          _sum: { amount: true },
        })

        const paymentsSum = await tx.expenseAccountPayments.aggregate({
          where: {
            expenseAccountId: r710ExpenseAccount.id,
            status: 'SUBMITTED',
          },
          _sum: { amount: true },
        })

        const totalDeposits = Number(depositsSum._sum.amount || 0)
        const totalPayments = Number(paymentsSum._sum.amount || 0)
        const newBalance = totalDeposits - totalPayments

        await tx.expenseAccounts.update({
          where: { id: r710ExpenseAccount.id },
          data: { balance: newBalance, updatedAt: new Date() },
        })
      }

      return {
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
    })

    return NextResponse.json(result, { status: 200 })

  } catch (error) {
    console.error('[R710 Direct Sale] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to complete sale', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
