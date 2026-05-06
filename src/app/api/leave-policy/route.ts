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

    const policy = await prisma.leavePolicies.findFirst({
      where: {
        umbrellaBusinessId,
        isActive: true,
        OR: [
          { businessId },
          { businessId: null },
        ],
      },
      orderBy: [
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

    const accrual  = Number(annualAccrualPerMonth)
    const maxDays  = Number(maxAnnualDays)
    const sickDays = Number(sickDaysPerYear)
    const carryMax = maxCarryoverDays != null ? Number(maxCarryoverDays) : null

    const policy = await prisma.leavePolicies.upsert({
      where: {
        umbrellaBusinessId_businessId: { umbrellaBusinessId, businessId },
      },
      update: {
        annualAccrualPerMonth: accrual,
        maxAnnualDays: maxDays,
        sickDaysPerYear: sickDays,
        carryoverEnabled: Boolean(carryoverEnabled),
        maxCarryoverDays: carryMax,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        umbrellaBusinessId,
        businessId,
        annualAccrualPerMonth: accrual,
        maxAnnualDays: maxDays,
        sickDaysPerYear: sickDays,
        carryoverEnabled: Boolean(carryoverEnabled),
        maxCarryoverDays: carryMax,
        isActive: true,
      },
    })

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
