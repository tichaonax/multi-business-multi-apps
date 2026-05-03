import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { canUserViewAccount } from '@/lib/expense-account-access'

async function getComboRequest(requestId: string, accountId: string) {
  return prisma.comboPaymentRequests.findFirst({
    where: { id: requestId, accountId },
    include: {
      creator:        { select: { id: true, name: true } },
      approver:       { select: { id: true, name: true } },
      returnedByUser: { select: { id: true, name: true } },
      settler:        { select: { id: true, name: true } },
      linkedPayment:  { select: { id: true, status: true, amount: true } },
      sections: {
        orderBy: { sortOrder: 'asc' },
        include: {
          payeePerson:   { select: { id: true, fullName: true, phone: true } },
          payeeUser:     { select: { id: true, name: true } },
          payeeEmployee: { select: { id: true, fullName: true, phone: true } },
          payeeBusiness: { select: { id: true, name: true } },
          payeeSupplier: { select: { id: true, name: true, phone: true, contactPerson: true } },
          items: {
            orderBy: { sortOrder: 'asc' },
            include: {
              payeePerson:   { select: { id: true, fullName: true, phone: true } },
              payeeUser:     { select: { id: true, name: true } },
              payeeEmployee: { select: { id: true, fullName: true, phone: true } },
              payeeBusiness: { select: { id: true, name: true } },
              payeeSupplier: { select: { id: true, name: true, phone: true, contactPerson: true } },
              category:      { select: { id: true, domainId: true } },
            },
          },
        },
      },
    },
  })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string; requestId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accountId, requestId } = await params
    const permissions = getEffectivePermissions(user)

    if (!permissions.canAccessExpenseAccount && user.role !== 'admin') {
      if (!(await canUserViewAccount(user.id, accountId))) {
        return NextResponse.json({ error: 'You do not have permission to access this expense account' }, { status: 403 })
      }
    }

    const comboRequest = await getComboRequest(requestId, accountId)
    if (!comboRequest) return NextResponse.json({ error: 'Combo request not found' }, { status: 404 })

    // Restricted access: can only view own requests
    const accessRecord = await prisma.expenseAccountUserAccess.findUnique({
      where: { accountId_userId: { accountId, userId: user.id } },
      select: { canViewOwnOnly: true, isActive: true },
    })
    if (accessRecord?.isActive && accessRecord?.canViewOwnOnly && comboRequest.createdBy !== user.id) {
      return NextResponse.json({ error: 'You do not have permission to view this request' }, { status: 403 })
    }

    // Compute action permissions server-side (client session doesn't carry full permissions)
    const isCashier = permissions.canMakeExpensePayments || user.role === 'admin'
    const canApprove = isCashier && comboRequest.status === 'SUBMITTED'
    const canReturn = isCashier && comboRequest.status === 'SUBMITTED' && comboRequest.createdBy !== user.id

    // Settle workflow permissions
    const allItems = comboRequest.sections.flatMap(s => s.items)
    const totalPaid = allItems.reduce((sum, i) => sum + Number(i.paidAmount ?? 0), 0)
    const approvedAmt = Number(comboRequest.approvedAmount ?? 0)
    const remainingBalance = approvedAmt - totalPaid
    const canRequestSettle = comboRequest.createdBy === user.id
      && comboRequest.status === 'PAID'
      && remainingBalance > 0
    const canConfirmSettle = isCashier && comboRequest.status === 'SETTLE_REQUESTED'

    return NextResponse.json({ success: true, data: { ...comboRequest, canApprove, canReturn, canRequestSettle, canConfirmSettle, remainingBalance } })
  } catch (error) {
    console.error('Error fetching combo request:', error)
    return NextResponse.json({ error: 'Failed to fetch combo request' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; requestId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accountId, requestId } = await params

    const existing = await prisma.comboPaymentRequests.findFirst({
      where: { id: requestId, accountId },
    })
    if (!existing) return NextResponse.json({ error: 'Combo request not found' }, { status: 404 })
    if (existing.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Only DRAFT requests can be edited' }, { status: 400 })
    }
    if (existing.createdBy !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only the creator can edit this request' }, { status: 403 })
    }

    const body = await request.json()
    const { title, notes, sections } = body

    // Recalculate requestedAmount from updated items
    let requestedAmount: number = Number(existing.requestedAmount)
    if (sections !== undefined) {
      requestedAmount = 0
      for (const section of sections) {
        for (const item of (section.items || [])) {
          if (item.estimatedAmount) requestedAmount += Number(item.estimatedAmount)
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Replace sections + items if provided
      if (sections !== undefined) {
        await tx.comboPaymentRequestItems.deleteMany({ where: { requestId } })
        await tx.comboPaymentRequestSections.deleteMany({ where: { requestId } })

        for (const [sIdx, section] of sections.entries()) {
          const sec = await tx.comboPaymentRequestSections.create({
            data: {
              requestId,
              sectionType: section.sectionType,
              sectionName: section.sectionName || null,
              payeeType: section.payeeType || null,
              payeePersonId: section.payeePersonId || null,
              payeeUserId: section.payeeUserId || null,
              payeeEmployeeId: section.payeeEmployeeId || null,
              payeeBusinessId: section.payeeBusinessId || null,
              payeeSupplierId: section.payeeSupplierId || null,
              notes: section.notes || null,
              sortOrder: section.sortOrder ?? sIdx,
            },
          })

          for (const [iIdx, item] of (section.items || []).entries()) {
            await tx.comboPaymentRequestItems.create({
              data: {
                requestId,
                sectionId: sec.id,
                description: item.description,
                quantity: item.quantity ?? null,
                unit: item.unit || null,
                estimatedAmount: item.estimatedAmount ?? null,
                categoryId: item.categoryId || null,
                subcategoryId: item.subcategoryId || null,
                payeeType: item.payeeType || null,
                payeePersonId: item.payeePersonId || null,
                payeeUserId: item.payeeUserId || null,
                payeeEmployeeId: item.payeeEmployeeId || null,
                payeeBusinessId: item.payeeBusinessId || null,
                payeeSupplierId: item.payeeSupplierId || null,
                notes: item.notes || null,
                sortOrder: item.sortOrder ?? iIdx,
              },
            })
          }
        }
      }

      return tx.comboPaymentRequests.update({
        where: { id: requestId },
        data: {
          ...(title !== undefined ? { title: title.trim() } : {}),
          ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
          requestedAmount,
        },
        include: {
          creator: { select: { id: true, name: true } },
          sections: {
            orderBy: { sortOrder: 'asc' },
            include: { items: { orderBy: { sortOrder: 'asc' } } },
          },
        },
      })
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating combo request:', error)
    return NextResponse.json({ error: 'Failed to update combo request' }, { status: 500 })
  }
}
