import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/eod-payment-batches/[batchId]
 * Returns the full EOD batch with all its payments and their payee details.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canSubmitPaymentBatch && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { batchId } = await params

    const batch = await prisma.eODPaymentBatch.findUnique({
      where: { id: batchId },
      include: {
        business: { select: { id: true, name: true, type: true } },
        reviewer: { select: { id: true, name: true } },
        payments: {
          where: { status: { in: ['PENDING_APPROVAL', 'APPROVED', 'QUEUED'] } },
          include: {
            expenseAccount: { select: { id: true, accountName: true, accountNumber: true } },
            payeeUser: { select: { id: true, name: true } },
            payeeEmployee: { select: { id: true, fullName: true, employeeNumber: true } },
            payeePerson: { select: { id: true, fullName: true } },
            payeeBusiness: { select: { id: true, name: true } },
            payeeSupplier: { select: { id: true, name: true } },
            category: { select: { id: true, name: true, emoji: true } },
            subcategory: { select: { id: true, name: true } },
            creator: { select: { id: true, name: true } },
          },
          orderBy: [{ adHoc: 'asc' }, { createdAt: 'asc' }],
        },
      },
    })

    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })

    // Fetch current business account balance for the impact preview
    const businessAccount = await prisma.businessAccounts.findUnique({
      where: { businessId: batch.businessId },
      select: { balance: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: batch.id,
        businessId: batch.businessId,
        business: batch.business,
        eodDate: batch.eodDate.toISOString().split('T')[0],
        status: batch.status,
        approvedCount: batch.approvedCount,
        rejectedCount: batch.rejectedCount,
        totalApproved: batch.totalApproved != null ? Number(batch.totalApproved) : null,
        reviewedBy: batch.reviewedBy,
        reviewer: batch.reviewer,
        reviewedAt: batch.reviewedAt?.toISOString() ?? null,
        notes: batch.notes,
        createdAt: batch.createdAt.toISOString(),
        businessAccountBalance: businessAccount ? Number(businessAccount.balance) : null,
        payments: batch.payments.map((p) => ({
          id: p.id,
          status: p.status,
          adHoc: p.adHoc,
          expenseAccountId: p.expenseAccountId,
          expenseAccount: p.expenseAccount,
          payeeType: p.payeeType,
          payeeUser: p.payeeUser,
          payeeEmployee: p.payeeEmployee,
          payeePerson: p.payeePerson,
          payeeBusiness: p.payeeBusiness,
          payeeSupplier: p.payeeSupplier,
          category: p.category,
          subcategory: p.subcategory,
          amount: Number(p.amount),
          paymentDate: p.paymentDate.toISOString(),
          notes: p.notes,
          creator: p.creator,
          createdAt: p.createdAt.toISOString(),
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching EOD batch:', error)
    return NextResponse.json({ error: 'Failed to fetch batch' }, { status: 500 })
  }
}
