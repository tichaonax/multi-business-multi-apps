import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/expense-account/lenders
 * List all active lenders
 */
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const lenders = await prisma.expenseAccountLenders.findMany({
      where: { isActive: true },
      orderBy: [{ lenderType: 'asc' }, { isDefault: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json({ success: true, data: { lenders } })
  } catch (error) {
    console.error('Error fetching lenders:', error)
    return NextResponse.json({ error: 'Failed to fetch lenders' }, { status: 500 })
  }
}

/**
 * POST /api/expense-account/lenders
 * Create a new lender
 * Body: { name, lenderType?, phone?, email?, notes? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canAccessExpenseAccount) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const { name, lenderType = 'BANK', phone, email, notes } = body

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!['BANK', 'INDIVIDUAL', 'OTHER'].includes(lenderType)) {
      return NextResponse.json({ error: 'lenderType must be BANK, INDIVIDUAL, or OTHER' }, { status: 400 })
    }

    const lender = await prisma.expenseAccountLenders.create({
      data: {
        name: name.trim(),
        lenderType,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        notes: notes?.trim() || null,
        isDefault: false,
        isUserCreated: true,
        createdBy: user.id,
      },
    })

    return NextResponse.json({ success: true, data: { lender } }, { status: 201 })
  } catch (error) {
    console.error('Error creating lender:', error)
    return NextResponse.json({ error: 'Failed to create lender' }, { status: 500 })
  }
}
