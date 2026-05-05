import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'
import { randomUUID } from 'crypto'

/**
 * GET /api/leave-policy?umbrellaBusinessId=&businessId=
 * Fetch active policy — business-specific first, falls back to umbrella default.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const umbrellaBusinessId = searchParams.get('umbrellaBusinessId')
    const businessId = searchParams.get('businessId') || null

    if (!umbrellaBusinessId) {
      return NextResponse.json({ error: 'umbrellaBusinessId is required' }, { status: 400 })
    }

    // Business-specific override first, then umbrella default
    const policy = await (prisma as any).leavePolicies.findFirst({
      where: {
        umbrellaBusinessId,
        isActive: true,
        OR: [
          { businessId },
          { businessId: null },
        ],
      },
      orderBy: [
        // business-specific (non-null businessId) ranks higher
        { businessId: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    if (!policy) {
      return NextResponse.json({ policy: null })
    }

    return NextResponse.json({
      policy: {
        id: policy.id,
        umbrellaBusinessId: policy.umbrellaBusinessId,
        businessId: policy.businessId,
        annualAccrualPerMonth: Number(policy.annualAccrualPerMonth),
        maxAnnualDays: policy.maxAnnualDays,
        sickDaysPerYear: policy.sickDaysPerYear,
        carryoverEnabled: policy.carryoverEnabled,
        maxCarryoverDays: policy.maxCarryoverDays,
        isActive: policy.isActive,
        createdAt: policy.createdAt,
        updatedAt: policy.updatedAt,
      }
    })
  } catch (error) {
    console.error('Error fetching leave policy:', error)
    return NextResponse.json({ error: 'Failed to fetch leave policy' }, { status: 500 })
  }
}

/**
 * POST /api/leave-policy
 * Create or update the leave policy for an umbrella business (and optional business override).
 * Requires admin role or canManageEmployees permission.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (user.role !== 'admin' && !hasPermission(user, 'canManageEmployees')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const {
      umbrellaBusinessId,
      businessId = null,
      annualAccrualPerMonth,
      maxAnnualDays,
      sickDaysPerYear,
      carryoverEnabled = false,
      maxCarryoverDays = null,
    } = body

    if (!umbrellaBusinessId) {
      return NextResponse.json({ error: 'umbrellaBusinessId is required' }, { status: 400 })
    }
    if (annualAccrualPerMonth == null || maxAnnualDays == null || sickDaysPerYear == null) {
      return NextResponse.json(
        { error: 'annualAccrualPerMonth, maxAnnualDays, and sickDaysPerYear are required' },
        { status: 400 }
      )
    }
    if (Number(annualAccrualPerMonth) <= 0) {
      return NextResponse.json({ error: 'annualAccrualPerMonth must be greater than 0' }, { status: 400 })
    }

    const existing = await (prisma as any).leavePolicies.findUnique({
      where: {
        umbrellaBusinessId_businessId: {
          umbrellaBusinessId,
          businessId,
        },
      },
    })

    let policy
    if (existing) {
      policy = await (prisma as any).leavePolicies.update({
        where: { id: existing.id },
        data: {
          annualAccrualPerMonth: Number(annualAccrualPerMonth),
          maxAnnualDays: Number(maxAnnualDays),
          sickDaysPerYear: Number(sickDaysPerYear),
          carryoverEnabled: Boolean(carryoverEnabled),
          maxCarryoverDays: maxCarryoverDays != null ? Number(maxCarryoverDays) : null,
          isActive: true,
          updatedAt: new Date(),
        },
      })
    } else {
      policy = await (prisma as any).leavePolicies.create({
        data: {
          id: randomUUID(),
          umbrellaBusinessId,
          businessId,
          annualAccrualPerMonth: Number(annualAccrualPerMonth),
          maxAnnualDays: Number(maxAnnualDays),
          sickDaysPerYear: Number(sickDaysPerYear),
          carryoverEnabled: Boolean(carryoverEnabled),
          maxCarryoverDays: maxCarryoverDays != null ? Number(maxCarryoverDays) : null,
          isActive: true,
        },
      })
    }

    return NextResponse.json({
      policy: {
        id: policy.id,
        umbrellaBusinessId: policy.umbrellaBusinessId,
        businessId: policy.businessId,
        annualAccrualPerMonth: Number(policy.annualAccrualPerMonth),
        maxAnnualDays: policy.maxAnnualDays,
        sickDaysPerYear: policy.sickDaysPerYear,
        carryoverEnabled: policy.carryoverEnabled,
        maxCarryoverDays: policy.maxCarryoverDays,
        isActive: policy.isActive,
        updatedAt: policy.updatedAt,
      }
    })
  } catch (error) {
    console.error('Error saving leave policy:', error)
    return NextResponse.json({ error: 'Failed to save leave policy' }, { status: 500 })
  }
}
