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
    const { businessId, date, workerName, hoursWorked, hourlyRate, totalCost, notes } = body

    if (!businessId || !date || hoursWorked === undefined || hourlyRate === undefined) {
      return NextResponse.json({ error: 'Missing required fields: businessId, date, hoursWorked, hourlyRate' }, { status: 400 })
    }

    const computedTotal = parseFloat(hoursWorked) * parseFloat(hourlyRate)
    const finalCost = totalCost !== undefined ? parseFloat(totalCost) : computedTotal

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
            amount: finalCost,
            paymentDate: new Date(date),
            payeeType: 'OTHER',
            status: 'SUBMITTED',
            paymentType: 'REGULAR',
            notes: `Chicken Run: Labor - ${workerName || 'Worker'} ${hoursWorked}h`,
            createdBy: user.id,
          },
        })
        expensePaymentId = payment.id
      }

      return tx.chickenLaborLog.create({
        data: {
          businessId,
          date: new Date(date),
          workerName: workerName || null,
          hoursWorked: parseFloat(hoursWorked),
          hourlyRate: parseFloat(hourlyRate),
          totalCost: finalCost,
          expensePaymentId,
          notes: notes || null,
          createdBy: user.id,
        },
      })
    })

    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('POST /api/chicken-run/costs/labor error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
