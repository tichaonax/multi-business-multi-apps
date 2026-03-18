import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/expense-account/payment-batch/[batchId]/voucher
 * Returns printData for a payment batch submission voucher.
 * Used by the expense account ledger to let requesters view the approved payment list.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canAccessExpenseAccount) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { batchId } = await params

    const batch = await prisma.paymentBatchSubmissions.findUnique({
      where: { id: batchId },
      include: {
        business: { select: { id: true, name: true } },
        expenseAccount: { select: { id: true, accountName: true } },
        cashier: { select: { id: true, name: true } },
        payments: {
          include: {
            payeeUser: { select: { id: true, name: true, email: true } },
            payeeEmployee: { select: { id: true, fullName: true, phone: true } },
            payeePerson: { select: { id: true, fullName: true, phone: true } },
            payeeBusiness: { select: { id: true, name: true, phone: true } },
            payeeSupplier: { select: { id: true, name: true, phone: true, contactPerson: true } },
            category: { select: { id: true, name: true, emoji: true } },
            subcategory: { select: { id: true, name: true } },
            creator: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })

    const printData = {
      batchId: batch.id,
      businessName: batch.business?.name ?? '',
      accountName: batch.expenseAccount.accountName,
      cashierName: batch.cashier.name,
      submittedAt: batch.submittedAt.toISOString(),
      totalAmount: Number(batch.totalAmount),
      paymentCount: batch.paymentCount,
      payments: batch.payments.map((p) => {
        const payeeName =
          p.payeeUser?.name ??
          p.payeeEmployee?.fullName ??
          p.payeePerson?.fullName ??
          p.payeeBusiness?.name ??
          (p as any).payeeSupplier?.name ??
          '—'
        const payeePhone =
          p.payeeEmployee?.phone ??
          p.payeePerson?.phone ??
          p.payeeBusiness?.phone ??
          (p as any).payeeSupplier?.phone ??
          p.payeeUser?.email ?? // Users have no phone — fall back to email
          null
        const payeeContact = (p as any).payeeSupplier?.contactPerson ?? null
        return {
          id: p.id,
          payeeName,
          payeePhone,
          payeeContact,
          categoryName: p.category ? `${p.category.emoji ?? ''} ${p.category.name}`.trim() : '—',
          subcategoryName: (p as any).subcategory?.name ?? null,
          amount: Number(p.amount),
          notes: p.notes,
          createdBy: p.creator?.name ?? '—',
        }
      }),
    }

    return NextResponse.json({ success: true, data: printData })
  } catch (error) {
    console.error('Error fetching payment batch voucher:', error)
    return NextResponse.json({ error: 'Failed to fetch voucher' }, { status: 500 })
  }
}
