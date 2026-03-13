import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

export async function POST(request: NextRequest, { params }: { params: { batchId: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageChickenRun) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { date, feedType, quantityKg, costPerKg, totalCost, supplierId, notes } = body

    if (!date) return NextResponse.json({ error: 'date is required' }, { status: 400 })
    if (!feedType) return NextResponse.json({ error: 'feedType is required' }, { status: 400 })
    if (!quantityKg || Number(quantityKg) <= 0) return NextResponse.json({ error: 'quantityKg must be greater than 0' }, { status: 400 })
    if (!costPerKg || Number(costPerKg) <= 0) return NextResponse.json({ error: 'costPerKg must be greater than 0' }, { status: 400 })
    if (!totalCost || Number(totalCost) <= 0) return NextResponse.json({ error: 'totalCost must be greater than 0' }, { status: 400 })

    const batch = await prisma.chickenBatch.findUnique({
      where: { id: params.batchId },
      select: { businessId: true },
    })
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })

    const expenseAccount = await prisma.expenseAccounts.findFirst({
      where: { businessId: batch.businessId, isActive: true },
      orderBy: { createdAt: 'asc' },
    })

    const feedLog = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let expensePaymentId: string | null = null

      if (expenseAccount) {
        const payment = await tx.expenseAccountPayments.create({
          data: {
            expenseAccountId: expenseAccount.id,
            payeeType: supplierId ? 'SUPPLIER' : 'OTHER',
            ...(supplierId ? { payeeSupplierId: supplierId } : {}),
            amount: parseFloat(totalCost),
            paymentDate: new Date(date),
            status: 'SUBMITTED',
            paymentType: 'REGULAR',
            notes: `Chicken Run: Feed - ${feedType} ${quantityKg}kg`,
            createdBy: user.id,
          },
        })
        expensePaymentId = payment.id
      }

      return tx.chickenFeedLog.create({
        data: {
          batchId: params.batchId,
          date: new Date(date),
          feedType,
          quantityKg: parseFloat(quantityKg),
          costPerKg: parseFloat(costPerKg),
          totalCost: parseFloat(totalCost),
          supplierId: supplierId || null,
          expensePaymentId,
          notes: notes || null,
          createdBy: user.id,
        },
      })
    })

    return NextResponse.json({ success: true, data: feedLog })
  } catch (error) {
    console.error('POST /api/chicken-run/batches/[batchId]/feed error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
