/**
 * R710 Admin-Issued Long-Term Tokens Report
 *
 * Lists tokens issued via /api/r710/tokens/issue-admin (configs flagged
 * isAdminIssued), classified as not-yet-redeemed / used / expired / revoked.
 * See ai-contexts/project-plans/review/projectplan-MBM-274-r710-admin-long-term-tokens-2026-08-24.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, getUserRoleInBusiness } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

type Classification = 'NOT_YET_REDEEMED' | 'USED' | 'EXPIRED' | 'REVOKED' | 'OTHER'

function classify(status: string, firstUsedAt: Date | null): Classification {
  if (status === 'EXPIRED') return 'EXPIRED'
  if (status === 'INVALIDATED') return 'REVOKED'
  if (status === 'SOLD' || status === 'ACTIVE') {
    return firstUsedAt ? 'USED' : 'NOT_YET_REDEEMED'
  }
  return 'OTHER'
}

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({ error: 'businessId parameter required' }, { status: 400 })
    }

    const isAdmin = isSystemAdmin(user) || getUserRoleInBusiness(user, businessId) === 'business-owner'
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only a business admin can view this report' },
        { status: 403 }
      )
    }

    const tokens = await prisma.r710Tokens.findMany({
      where: {
        businessId,
        r710_token_configs: { isAdminIssued: true }
      },
      include: {
        r710_token_configs: {
          select: { id: true, name: true, durationValue: true, durationUnit: true }
        },
        r710_token_sales: {
          select: { soldBy: true, soldAt: true, users: { select: { name: true, email: true } } },
          orderBy: { soldAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const rows = tokens.map(token => {
      const sale = token.r710_token_sales?.[0]
      return {
        id: token.id,
        username: token.username,
        status: token.status,
        classification: classify(token.status, token.firstUsedAt),
        configName: token.r710_token_configs?.name || '',
        durationValue: token.r710_token_configs?.durationValue,
        durationUnit: token.r710_token_configs?.durationUnit,
        issuedAt: sale?.soldAt || token.createdAt,
        issuedByName: sale?.users?.name || sale?.users?.email || null,
        expiresAt: token.expiresAtR710,
        firstUsedAt: token.firstUsedAt,
        connectedMac: token.connectedMac
      }
    })

    const summary = rows.reduce(
      (acc, row) => {
        acc.total += 1
        acc[row.classification] = (acc[row.classification] || 0) + 1
        return acc
      },
      { total: 0 } as Record<string, number>
    )

    return NextResponse.json({ tokens: rows, summary })

  } catch (error) {
    console.error('[R710 Admin-Issued Tokens] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin-issued tokens', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
