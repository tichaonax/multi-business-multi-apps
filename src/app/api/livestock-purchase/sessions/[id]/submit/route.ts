import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { emitNotification } from '@/lib/notifications/notification-emitter'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: sessionId } = await params

  const purchaseSession = await prisma.livestockPurchaseSessions.findUnique({
    where: { id: sessionId },
    include: {
      livestock_purchase_lines: true,
      business_suppliers: { select: { id: true, name: true, phone: true } },
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

  // Best-effort category lookup — search for common vendor/stock purchase category names
  const purchaseTypeLabel = purchaseSession.purchaseType === 'GOODS' ? 'goods' : 'livestock'
  const expenseCategory = await prisma.expenseCategories.findFirst({
    where: {
      OR: [
        { name: { contains: 'Stock Purchase', mode: 'insensitive' } },
        { name: { contains: purchaseTypeLabel, mode: 'insensitive' } },
        { name: { contains: 'Vendor Purchase', mode: 'insensitive' } },
        { name: { contains: 'Inventory Purchase', mode: 'insensitive' } },
        { name: { contains: 'Stock', mode: 'insensitive' } },
        { name: { contains: 'Inventory', mode: 'insensitive' } },
        { name: { contains: 'Purchase', mode: 'insensitive' } },
      ],
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })

  const totalAmount = Number(purchaseSession.totalAmount)
  const purchaseLabel = purchaseSession.purchaseType === 'GOODS' ? 'Goods' : 'Livestock'

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
          status: 'REQUEST',
          paymentType: 'REGULAR',
          categoryId: expenseCategory?.id ?? null,
          notes: `${purchaseLabel} purchase — ${purchaseSession.livestock_purchase_lines.length} item(s), ${Number(purchaseSession.totalWeightKg).toFixed(3)} kg`,
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
        business_suppliers: { select: { id: true, name: true, phone: true } },
      },
    })
  })

  // Notify cashiers/admins that a vendor payment request needs approval
  const submitterId = (session.user as any)?.id
  const supplierName = result.business_suppliers?.name ?? 'vendor'
  const amountStr = `$${totalAmount.toFixed(2)}`
  const notifMessage = `${(session.user as any)?.name ?? 'Staff'} submitted a ${purchaseLabel} purchase — ${supplierName}: ${amountStr}`

  const reviewers = await prisma.users.findMany({
    where: {
      isActive: true,
      OR: [
        { role: 'admin' },
        { permissions: { path: ['canSubmitPaymentBatch'], equals: true } },
      ],
    },
    select: { id: true },
  })
  const reviewerIds = reviewers.map(r => r.id).filter(id => id !== submitterId)

  if (reviewerIds.length > 0) {
    await emitNotification({
      userIds: reviewerIds,
      type: 'PAYMENT_SUBMITTED',
      title: `💰 ${purchaseLabel} Purchase Approval Request`,
      message: notifMessage,
      linkUrl: '/admin/pending-actions',
    })
  }

  if (submitterId) {
    await emitNotification({
      userIds: [submitterId],
      type: 'PAYMENT_SUBMITTED',
      title: 'Purchase Submitted',
      message: `Your ${purchaseLabel.toLowerCase()} purchase request of ${amountStr} from ${supplierName} has been submitted for approval.`,
      linkUrl: '/admin/pending-actions',
    })
  }

  return NextResponse.json({ success: true, data: result })
}
