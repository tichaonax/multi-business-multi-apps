import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

// GET — list all accounts with a balance > 0 for a business
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

    const accounts = await prisma.deliveryCustomerAccounts.findMany({
      where: { businessId, balance: { gt: 0 } },
      include: {
        customer: { select: { id: true, name: true, phone: true, customerNumber: true } },
      },
      orderBy: { balance: 'desc' },
    })

    return NextResponse.json({ success: true, accounts })
  } catch (error) {
    console.error('Error listing delivery accounts:', error)
    return NextResponse.json({ error: 'Failed to list accounts' }, { status: 500 })
  }
}

// POST — create account or top up existing balance (management only)
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { customerId, businessId, amount, notes } = body

    const perms = getEffectivePermissions(user, businessId ?? undefined)
    if (!perms.canManageDeliveryCredit) {
      return NextResponse.json({ error: 'Forbidden: canManageDeliveryCredit required' }, { status: 403 })
    }

    if (!customerId || !businessId || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'customerId, businessId, and a positive amount are required' }, { status: 400 })
    }

    // Upsert account
    const account = await prisma.deliveryCustomerAccounts.upsert({
      where: { customerId },
      create: {
        customerId,
        businessId,
        balance: Number(amount),
        updatedAt: new Date(),
      },
      update: {
        balance: { increment: Number(amount) },
        updatedAt: new Date(),
      },
    })

    // Record credit transaction
    await prisma.deliveryAccountTransactions.create({
      data: {
        accountId: account.id,
        type: 'CREDIT',
        amount: Number(amount),
        notes: notes || null,
        createdBy: user.id,
      },
    })

    return NextResponse.json({ success: true, account })
  } catch (error) {
    console.error('Error topping up delivery account:', error)
    return NextResponse.json({ error: 'Failed to process top-up' }, { status: 500 })
  }
}
