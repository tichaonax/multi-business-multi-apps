import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageChickenRun) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { businessId, date, utilityType, totalCost, notes } = body

    if (!businessId || !date || !utilityType || totalCost === undefined || totalCost === null) {
      return NextResponse.json({ error: 'Missing required fields: businessId, date, utilityType, totalCost' }, { status: 400 })
    }

    const expenseAccount = await prisma.expenseAccounts.findFirst({
      where: { businessId, isActive: true },
      orderBy: { createdAt: 'asc' },
    })

    const record = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let expensePaymentId: string | null = null

      if (expenseAccount) {
        const payment = await tx.expenseAccountPayments.create({
          data: {
            expenseAccountId: expenseAccount.id,
            amount: parseFloat(totalCost),
            paymentDate: new Date(date),
            payeeType: 'OTHER',
            status: 'SUBMITTED',
            paymentType: 'REGULAR',
            notes: `Chicken Run: Utility - ${utilityType}`,
            createdBy: user.id,
          },
        })
        expensePaymentId = payment.id
      }

      return tx.chickenUtilityCost.create({
        data: {
          businessId,
          date: new Date(date),
          utilityType,
          totalCost: parseFloat(totalCost),
          expensePaymentId,
          notes: notes || null,
          createdBy: user.id,
        },
      })
    })

    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('POST /api/chicken-run/costs/utility error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
