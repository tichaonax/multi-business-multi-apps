import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

const EDIT_WINDOW_DAYS = 8

/**
 * GET /api/cash-bucket/[entryId]
 * Returns the entry plus resolved payment details for the modal.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { entryId } = await params
    const entry = await prisma.cashBucketEntry.findUnique({
      where: { id: entryId },
      include: {
        business: { select: { id: true, name: true, type: true } },
        creator: { select: { id: true, name: true } },
        editor:  { select: { id: true, name: true } },
        deleter: { select: { id: true, name: true } },
      },
    })
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

    let payments: any[] = []

    // Resolve individual payments for PAYMENT_APPROVAL entries
    if (entry.entryType === 'PAYMENT_APPROVAL' && entry.referenceId) {
      const paymentWhere: any =
        entry.referenceType === 'EOD_BATCH'
          ? { eodBatchId: entry.referenceId }
          : entry.referenceType === 'EXPENSE_PAYMENT'
          ? { id: entry.referenceId }
          : null

      if (paymentWhere) {
        const rows = await prisma.expenseAccountPayments.findMany({
          where: paymentWhere,
          select: {
            id: true,
            amount: true,
            status: true,
            notes: true,
            paymentDate: true,
            paymentChannel: true,
            payeeType: true,
            payeeUser:     { select: { name: true } },
            payeeEmployee: { select: { firstName: true, lastName: true } },
            payeePerson:   { select: { fullName: true } },
            payeeSupplier: { select: { name: true } },
            category:      { select: { name: true } },
          },
        })

        payments = rows.map((p: any) => {
          let payeeName = '—'
          if (p.payeeType === 'USER' && p.payeeUser)
            payeeName = p.payeeUser.name
          else if (p.payeeType === 'EMPLOYEE' && p.payeeEmployee)
            payeeName = `${p.payeeEmployee.firstName} ${p.payeeEmployee.lastName}`
          else if (p.payeeType === 'PERSON' && p.payeePerson)
            payeeName = p.payeePerson.fullName
          else if (p.payeeType === 'SUPPLIER' && p.payeeSupplier)
            payeeName = p.payeeSupplier.name

          return {
            id: p.id,
            amount: Number(p.amount),
            status: p.status,
            notes: p.notes,
            paymentDate: p.paymentDate,
            paymentChannel: p.paymentChannel,
            payeeName,
            category: p.category?.name ?? null,
          }
        })
      }
    }

    // Resolve petty cash request details
    let pettyCash: any = null
    if ((entry.entryType === 'PETTY_CASH' || entry.entryType === 'PETTY_CASH_RETURN') && entry.referenceId) {
      const pc = await prisma.pettyCashRequests.findUnique({
        where: { id: entry.referenceId },
        select: {
          id: true, purpose: true, requestedAmount: true, approvedAmount: true,
          spentAmount: true, returnAmount: true, status: true, requestedAt: true,
          requester: { select: { name: true } },
          transactions: {
            select: {
              id: true, amount: true, description: true, transactionDate: true,
              payeeType: true, payeeSupplierId: true, payeeEmployeeId: true, payeeUserId: true,
              createdBy: true,
              category: { select: { name: true } },
            },
            orderBy: { transactionDate: 'asc' },
          },
        },
      })
      if (pc) {
        // Resolve payee names/phones and creator names via batch queries
        const supplierIds = [...new Set(pc.transactions.filter((t: any) => t.payeeSupplierId).map((t: any) => t.payeeSupplierId as string))]
        const employeeIds = [...new Set(pc.transactions.filter((t: any) => t.payeeEmployeeId).map((t: any) => t.payeeEmployeeId as string))]
        const userIds = [...new Set(pc.transactions.filter((t: any) => t.payeeUserId).map((t: any) => t.payeeUserId as string))]
        const creatorIds = [...new Set(pc.transactions.map((t: any) => t.createdBy as string))]
        const [suppliers, employees, payeeUsers, creators] = await Promise.all([
          supplierIds.length ? prisma.businessSuppliers.findMany({ where: { id: { in: supplierIds } }, select: { id: true, name: true, phone: true, contactPerson: true } }) : [],
          employeeIds.length ? prisma.employees.findMany({ where: { id: { in: employeeIds } }, select: { id: true, firstName: true, lastName: true, phone: true } }) : [],
          userIds.length ? prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [],
          creatorIds.length ? prisma.users.findMany({ where: { id: { in: creatorIds } }, select: { id: true, name: true } }) : [],
        ])
        const supplierMap = Object.fromEntries((suppliers as any[]).map(s => [s.id, s]))
        const employeeMap = Object.fromEntries((employees as any[]).map(e => [e.id, e]))
        const userMap = Object.fromEntries((payeeUsers as any[]).map(u => [u.id, u.name]))
        const creatorMap = Object.fromEntries((creators as any[]).map(u => [u.id, u.name]))
        const transactions = pc.transactions.map((t: any) => {
          let payeeName = '—', payeePhone: string | null = null, payeeContact: string | null = null
          if (t.payeeSupplierId && supplierMap[t.payeeSupplierId]) {
            const s = supplierMap[t.payeeSupplierId]
            payeeName = s.name; payeePhone = s.phone ?? null; payeeContact = s.contactPerson ?? null
          } else if (t.payeeEmployeeId && employeeMap[t.payeeEmployeeId]) {
            const e = employeeMap[t.payeeEmployeeId]
            payeeName = `${e.firstName} ${e.lastName}`; payeePhone = e.phone ?? null
          } else if (t.payeeUserId && userMap[t.payeeUserId]) {
            payeeName = userMap[t.payeeUserId]
          }
          return {
            id: t.id, amount: Number(t.amount), description: t.description,
            category: t.category?.name ?? null, payeeName, payeePhone, payeeContact,
            paidBy: creatorMap[t.createdBy] ?? '—',
            transactionDate: t.transactionDate,
          }
        })
        pettyCash = {
          id: pc.id,
          purpose: pc.purpose,
          requestedAmount: Number(pc.requestedAmount),
          approvedAmount: pc.approvedAmount ? Number(pc.approvedAmount) : null,
          spentAmount: pc.spentAmount ? Number(pc.spentAmount) : null,
          returnAmount: pc.returnAmount ? Number(pc.returnAmount) : null,
          status: pc.status,
          requestedAt: pc.requestedAt,
          requestedBy: pc.requester?.name ?? '—',
          transactions,
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: entry.id,
        entryType: entry.entryType,
        referenceType: entry.referenceType,
        referenceId: entry.referenceId,
        payments,
        pettyCash,
      },
    })
  } catch (error) {
    console.error('Error fetching cash bucket entry detail:', error)
    return NextResponse.json({ error: 'Failed to fetch entry detail' }, { status: 500 })
  }
}

function isWithinEditWindow(createdAt: Date): boolean {
  const diffMs = Date.now() - createdAt.getTime()
  return diffMs <= EDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000
}

/**
 * PUT /api/cash-bucket/[entryId]
 * Edit the amount and/or notes of an EOD_RECEIPT entry.
 * Allowed: entry creator or admin, within 8 days of creation.
 * Body: { amount, notes }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { entryId } = await params

    const entry = await prisma.cashBucketEntry.findUnique({
      where: { id: entryId },
      include: { creator: { select: { id: true, name: true } } },
    })
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

    // Only EOD_RECEIPT entries are editable
    if (entry.entryType !== 'EOD_RECEIPT') {
      return NextResponse.json({ error: 'Only EOD_RECEIPT entries can be edited' }, { status: 400 })
    }

    const isAdmin = user.role === 'admin'
    const isCreator = entry.createdBy === user.id

    // Must be creator or admin
    if (!isCreator && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden — only the creator or an admin can edit this entry' }, { status: 403 })
    }

    // Non-admin creators are limited to the 8-day window
    if (!isAdmin && !isWithinEditWindow(entry.createdAt)) {
      return NextResponse.json({ error: 'Edit window has expired (8 days)' }, { status: 403 })
    }

    // Soft-deleted entries cannot be edited
    if (entry.deletedAt) {
      return NextResponse.json({ error: 'Cannot edit a deleted entry' }, { status: 400 })
    }

    const body = await request.json()
    const { amount, notes } = body

    if (amount !== undefined && Number(amount) <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 })
    }
    if (notes !== undefined && !notes?.trim()) {
      return NextResponse.json({ error: 'Notes cannot be empty' }, { status: 400 })
    }

    const updated = await prisma.cashBucketEntry.update({
      where: { id: entryId },
      data: {
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(notes !== undefined && { notes: notes.trim() }),
        editedAt: new Date(),
        editedBy: user.id,
      },
      include: {
        business: { select: { id: true, name: true, type: true } },
        creator: { select: { id: true, name: true } },
        editor: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Entry updated',
      data: {
        id: updated.id,
        amount: Number(updated.amount),
        notes: updated.notes,
        editedAt: updated.editedAt?.toISOString() ?? null,
        editedBy: updated.editor ?? null,
      },
    })
  } catch (error) {
    console.error('Error editing cash bucket entry:', error)
    return NextResponse.json({ error: 'Failed to edit entry' }, { status: 500 })
  }
}

/**
 * DELETE /api/cash-bucket/[entryId]
 * Soft-delete: sets amount = 0, records deletedAt/By/reason.
 * Allowed: users with canDeleteCashBucketEntry permission, within 8 days.
 * Body: { reason }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canDeleteCashBucketEntry && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
    }

    const { entryId } = await params

    const entry = await prisma.cashBucketEntry.findUnique({ where: { id: entryId } })
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

    // Only EOD_RECEIPT entries are deletable
    if (entry.entryType !== 'EOD_RECEIPT') {
      return NextResponse.json({ error: 'Only EOD_RECEIPT entries can be deleted' }, { status: 400 })
    }

    // Non-admin users are limited to the 8-day window
    if (user.role !== 'admin' && !isWithinEditWindow(entry.createdAt)) {
      return NextResponse.json({ error: 'Delete window has expired (8 days)' }, { status: 403 })
    }

    // Already deleted
    if (entry.deletedAt) {
      return NextResponse.json({ error: 'Entry is already deleted' }, { status: 400 })
    }

    const body = await request.json()
    const { reason } = body
    if (!reason?.trim()) {
      return NextResponse.json({ error: 'Deletion reason is required' }, { status: 400 })
    }

    await prisma.cashBucketEntry.update({
      where: { id: entryId },
      data: {
        amount: 0,
        deletedAt: new Date(),
        deletedBy: user.id,
        deletionReason: reason.trim(),
      },
    })

    return NextResponse.json({ success: true, message: 'Entry deleted' })
  } catch (error) {
    console.error('Error deleting cash bucket entry:', error)
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
  }
}
