import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: sessionId } = await params

  const purchaseSession = await prisma.livestockPurchaseSessions.findUnique({
    where: { id: sessionId },
    include: {
      livestock_purchase_lines: true,
      business_suppliers: { select: { id: true, name: true } },
    },
  })

  if (!purchaseSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (purchaseSession.status !== 'OPEN') return NextResponse.json({ error: 'Session already closed' }, { status: 400 })
  if (purchaseSession.livestock_purchase_lines.length === 0) {
    return NextResponse.json({ error: 'Cannot submit an empty session' }, { status: 400 })
  }

  // Resolve default expense account for the business
  const expenseAccount = await prisma.expenseAccounts.findFirst({
    where: { businessId: purchaseSession.businessId, isActive: true, accountType: 'GENERAL' },
    orderBy: { createdAt: 'asc' },
  })

  const totalAmount = Number(purchaseSession.totalAmount)

  const result = await prisma.$transaction(async (tx) => {
    let expensePaymentId: string | null = null

    if (expenseAccount) {
      const payment = await tx.expenseAccountPayments.create({
        data: {
          expenseAccountId: expenseAccount.id,
          payeeType: 'SUPPLIER',
          payeeSupplierId: purchaseSession.supplierId,
          amount: totalAmount,
          paymentDate: new Date(),
          status: 'SUBMITTED',
          paymentType: 'REGULAR',
          notes: `Livestock purchase — ${purchaseSession.livestock_purchase_lines.length} item(s), ${Number(purchaseSession.totalWeightKg).toFixed(3)} kg`,
          createdBy: (session.user as any)?.id ?? 'unknown',
        },
      })
      expensePaymentId = payment.id
    }

    return tx.livestockPurchaseSessions.update({
      where: { id: sessionId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        expenseAccountId: expenseAccount?.id ?? null,
      },
      include: {
        livestock_purchase_lines: true,
        business_suppliers: { select: { id: true, name: true } },
      },
    })
  })

  return NextResponse.json({ success: true, data: result })
}
