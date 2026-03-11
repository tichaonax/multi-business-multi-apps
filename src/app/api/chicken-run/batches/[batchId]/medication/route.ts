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
    const { date, medicationName, quantityMl, quantityG, totalCost, administeredBy, notes } = body

    if (!date) return NextResponse.json({ error: 'date is required' }, { status: 400 })
    if (!medicationName) return NextResponse.json({ error: 'medicationName is required' }, { status: 400 })
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

    const medLog = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let expensePaymentId: string | null = null

      if (expenseAccount) {
        const payment = await tx.expenseAccountPayments.create({
          data: {
            expenseAccountId: expenseAccount.id,
            payeeType: 'OTHER',
            amount: parseFloat(totalCost),
            paymentDate: new Date(date),
            status: 'SUBMITTED',
            paymentType: 'REGULAR',
            notes: `Chicken Run: Medication - ${medicationName}`,
            createdBy: user.id,
          },
        })
        expensePaymentId = payment.id
      }

      return tx.chickenMedicationLog.create({
        data: {
          batchId: params.batchId,
          date: new Date(date),
          medicationName,
          quantityMl: quantityMl ? parseFloat(quantityMl) : null,
          quantityG: quantityG ? parseFloat(quantityG) : null,
          totalCost: parseFloat(totalCost),
          administeredBy: administeredBy || null,
          expensePaymentId,
          notes: notes || null,
          createdBy: user.id,
        },
      })
    })

    return NextResponse.json({ success: true, data: medLog })
  } catch (error) {
    console.error('POST /api/chicken-run/batches/[batchId]/medication error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
