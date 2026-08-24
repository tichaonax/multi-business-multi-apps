/**
 * R710 Admin-Issued Long-Term Token API
 *
 * Issues a zero-fee, long-duration WiFi token (up to 1 year — the R710's
 * own guest-pass validity cap tops out at 365 days) so admins can stop
 * sharing the AP password directly.
 * Restricted to: system admins, or the business-owner of the target
 * business — and only for token configs explicitly flagged isAdminIssued.
 * See ai-contexts/project-plans/review/projectplan-MBM-274-r710-admin-long-term-tokens-2026-08-24.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, getUserRoleInBusiness } from '@/lib/permission-utils'
import { generateAndSellR710Token } from '@/lib/r710/generate-and-sell-token'
import { getServerUser } from '@/lib/get-server-user'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { businessId, tokenConfigId } = body

    if (!businessId || !tokenConfigId) {
      return NextResponse.json(
        { error: 'businessId and tokenConfigId are required' },
        { status: 400 }
      )
    }

    const isAdmin = isSystemAdmin(user) || getUserRoleInBusiness(user, businessId) === 'business-owner'
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only a business admin can issue long-term tokens for this business' },
        { status: 403 }
      )
    }

    const config = await prisma.r710TokenConfigs.findUnique({
      where: { id: tokenConfigId },
      select: { id: true, businessId: true, isAdminIssued: true }
    })

    if (!config || config.businessId !== businessId) {
      return NextResponse.json({ error: 'Token configuration not found' }, { status: 404 })
    }

    if (!config.isAdminIssued) {
      return NextResponse.json(
        { error: 'This configuration is not flagged for admin issuance' },
        { status: 400 }
      )
    }

    const result = await generateAndSellR710Token({
      businessId,
      tokenConfigId,
      saleAmount: 0,
      paymentMethod: 'ADMIN_ISSUED',
      soldBy: user.id,
      saleChannel: 'POS'
    })

    return NextResponse.json(result, { status: 200 })

  } catch (error) {
    console.error('[R710 Issue Admin Token] POST error:', error)
    const code = (error as any)?.code
    return NextResponse.json(
      {
        error: code === 'AGENT_OFFLINE' || code === 'TIMEOUT' ? (error instanceof Error ? error.message : 'Device unavailable') : 'Failed to issue token',
        code,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
