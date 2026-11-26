import { NextRequest, NextResponse } from 'next/server'
import { isVehicleExpenseType } from '@/lib/vehicles/vehicle-expense-types'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { canUserViewAccount } from '@/lib/expense-account-access'
import { validateExpenseLinks, linkExpenseLineTx, releaseExpenseLinesTx, ExpenseLinkError } from '@/lib/restaurant-expense-combo'
import { refreshRestaurantExpenseNoticeForAccount } from '@/lib/restaurant-expense-notify'
import { comboItemReceiptedAmount, comboItemTargetAmount, isComboItemAccountedFor } from '@/lib/expense-account/combo-item-reconciliation'
import { readComboLoanFields } from '@/lib/expense-account/combo-business-loan'
import { describeComboChanges } from '@/lib/expense-account/combo-cashier-changes'

async function getComboRequest(requestId: string, accountId: string) {
  return prisma.comboPaymentRequests.findFirst({
    where: { id: requestId, accountId },
    include: {
      creator:        { select: { id: true, name: true } },
      approver:       { select: { id: true, name: true } },
      returnedByUser: { select: { id: true, name: true } },
      settler:        { select: { id: true, name: true } },
      linkedPayment:  { select: { id: true, status: true, amount: true } },
      // MBM-333: return history + business-loan links
      returns: { orderBy: { returnedAt: 'asc' }, include: { returnedByUser: { select: { id: true, name: true } } } },
      loanBusiness: { select: { id: true, name: true } },
      loanExpenseAccount: { select: { id: true, accountName: true, accountNumber: true } },
      cashierEditor: { select: { id: true, name: true } }, // MBM-336
      outgoingLoan: {
        select: {
          id: true, loanNumber: true, status: true, principalAmount: true, remainingBalance: true,
          disbursement_deposits: { select: { id: true, amount: true, depositDate: true, expenseAccountId: true } },
        },
      },
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
              category:      { select: { id: true, domainId: true, name: true, emoji: true, domain: { select: { name: true, emoji: true } } } }, // MBM-335: shown to the cashier
              subcategory:   { select: { id: true, name: true, emoji: true } },
              flaggedByUser: { select: { name: true } }, // MBM-335
              vehicle:       { select: { id: true, licensePlate: true, make: true, model: true } }, // MBM-344
              // MBM-303: sum of receipts already tagged to this item (see
              // "Add Receipt" / comboItemId), mapped down to receiptedAmount
              // below rather than exposing raw receipt rows here.
              // MBM-330: plus who each receipt paid — shown as "Paid to X · receipt $y"
              receipts:      {
                orderBy: { receiptDate: 'asc' },
                select: {
                  amount: true, payeeType: true, payeeName: true,
                  payeePersonId: true, payeeBusinessId: true, payeeSupplierId: true,
                  payeePerson: { select: { fullName: true } },
                  payeeBusiness: { select: { name: true } },
                  payeeSupplier: { select: { name: true } },
                },
              },
              // MBM-319: recorded restaurant expense this item pays (locked in the edit form)
              restaurant_expense_line: { select: { id: true, transaction: { select: { reference: true, purchasedAt: true } } } },
              // MBM-333: the payment made for this item at the loan business
              generatedPayment: { select: { id: true, status: true, amount: true, paidAt: true, expenseAccountId: true, expense_payment_receipts: { select: { amount: true } } } },
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
    // MBM-333: a business-loan request also needs the lending permission
    const canApproveLoan = !comboRequest.isBusinessLoan || permissions.canManageLending || user.role === 'admin'
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

    // Creator or admin can edit DRAFT or SUBMITTED (before approval)
    const canEditRequest = (comboRequest.createdBy === user.id || user.role === 'admin') &&
      ['DRAFT', 'SUBMITTED'].includes(comboRequest.status)
    // MBM-336: a cashier may correct a request waiting for approval
    const canCashierCorrect = isCashier && comboRequest.status === 'SUBMITTED' && comboRequest.createdBy !== user.id

    // MBM-303: fold each item's raw receipts down to receiptedAmount +
    // accountedFor — the detail page shows this directly, no client-side
    // summing needed.
    const sectionsWithReconciliation = comboRequest.sections.map(section => ({
      ...section,
      items: section.items.map(item => {
        const itemForCalc = {
          id: item.id,
          description: item.description,
          approvedAmount: item.approvedAmount !== null ? Number(item.approvedAmount) : null,
          estimatedAmount: item.estimatedAmount !== null ? Number(item.estimatedAmount) : null,
          noReceiptReason: item.noReceiptReason,
          // MBM-336: a business-loan item's receipts sit on its own payment at
          // the loan business — count those too
          receipts: [
            ...item.receipts.map(r => ({ amount: Number(r.amount) })),
            ...((item as any).generatedPayment?.expense_payment_receipts ?? []).map((r: any) => ({ amount: Number(r.amount) })),
          ],
        }
        const { receipts, ...itemWithoutReceipts } = item
        return {
          ...itemWithoutReceipts,
          // MBM-330: one entry per receipt tagged to this item
          receiptPayments: receipts.map(r => ({
            amount: Number(r.amount),
            payeeType: r.payeeType,
            payeeId: r.payeeType === 'PERSON' ? r.payeePersonId : r.payeeType === 'BUSINESS' ? r.payeeBusinessId : r.payeeType === 'SUPPLIER' ? r.payeeSupplierId : null,
            payeeName: r.payeePerson?.fullName ?? r.payeeBusiness?.name ?? r.payeeSupplier?.name ?? r.payeeName ?? null,
          })),
          receiptedAmount: comboItemReceiptedAmount(itemForCalc),
          targetAmount: comboItemTargetAmount(itemForCalc),
          accountedFor: isComboItemAccountedFor(itemForCalc),
        }
      }),
    }))

    return NextResponse.json({
      success: true,
      data: {
        ...comboRequest,
        sections: sectionsWithReconciliation,
        canApprove, canApproveLoan, canReturn, canRequestSettle, canConfirmSettle, remainingBalance, canEditRequest, canCashierCorrect,
      },
    })
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
    if (!['DRAFT', 'SUBMITTED'].includes(existing.status)) {
      return NextResponse.json({ error: 'Only DRAFT or SUBMITTED requests can be edited' }, { status: 400 })
    }
    // MBM-336: besides the creator (and admins), a cashier may correct a
    // request that is waiting for approval — that is recorded so the
    // approval needs a note and the requester sees what changed
    const isCreator = existing.createdBy === user.id
    const isCashier = getEffectivePermissions(user).canMakeExpensePayments || user.role === 'admin'
    const cashierEdit = !isCreator && isCashier && existing.status === 'SUBMITTED'
    if (!isCreator && user.role !== 'admin' && !cashierEdit) {
      return NextResponse.json({ error: existing.status === 'SUBMITTED' ? 'Only the creator or a cashier can edit this request' : 'Only the creator can edit this request' }, { status: 403 })
    }
    if (cashierEdit && user.role !== 'admin' && !(await canUserViewAccount(user.id, accountId))) {
      return NextResponse.json({ error: 'You do not have access to this expense account' }, { status: 403 })
    }

    const body = await request.json()
    const { title, notes, sections } = body

    // MBM-336: what the cashier changed, worked out before the items are replaced
    let cashierChangeLines: string[] = []
    if (cashierEdit) {
      const before = await prisma.comboPaymentRequests.findUnique({
        where: { id: requestId },
        select: { title: true, sections: { orderBy: { sortOrder: 'asc' }, include: { items: { orderBy: { sortOrder: 'asc' } } } } },
      })
      if (before) cashierChangeLines = await describeComboChanges(prisma, before, title, sections)
    }

    // MBM-333: business-loan fields (target business + receiving account)
    const loan = await readComboLoanFields(accountId, body)
    if (loan.error) return NextResponse.json({ error: loan.error }, { status: 400 })

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

    if (sections !== undefined) {
      const linkError = await validateExpenseLinks(accountId, sections, requestId)
      if (linkError) return NextResponse.json({ error: linkError }, { status: 400 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Replace sections + items if provided
      if (sections !== undefined) {
        // MBM-319: free linked recorded expenses first; the payload re-links them
        await releaseExpenseLinesTx(tx, { requestId })
        // MBM-335: items are re-created below — keep the cashier's flags by
        // the item id the form sends back. The requester may only answer a
        // flag (mark fixed + reply), never change or remove it.
        const oldFlags = new Map(
          (await tx.comboPaymentRequestItems.findMany({
            where: { requestId, flagNote: { not: null } },
            select: { id: true, flagNote: true, flaggedBy: true, flaggedAt: true, flagResolvedAt: true, flagResponse: true },
          })).map(f => [f.id, f])
        )
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
            const created = await tx.comboPaymentRequestItems.create({
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
                // MBM-344: a vehicle cost (synced to Fleet Management on approval)
                vehicleId: item.vehicleId || null,
                vehicleExpenseType: item.vehicleId ? (isVehicleExpenseType(item.vehicleExpenseType) ? item.vehicleExpenseType : 'OTHER') : null,
                vehicleLicenseType: item.vehicleId ? item.vehicleLicenseType || null : null,
                vehicleLicenseExpiry: item.vehicleId && item.vehicleLicenseExpiry ? new Date(item.vehicleLicenseExpiry) : null,
                notes: item.notes || null,
                sortOrder: item.sortOrder ?? iIdx,
                ...(() => {
                  const flag = item.id ? oldFlags.get(item.id) : undefined
                  if (!flag) return {}
                  const resolved = item.flagResolved === true
                  return {
                    flagNote: flag.flagNote,
                    flaggedBy: flag.flaggedBy,
                    flaggedAt: flag.flaggedAt,
                    flagResolvedAt: resolved ? (flag.flagResolvedAt ?? new Date()) : null,
                    flagResponse: resolved && typeof item.flagResponse === 'string' && item.flagResponse.trim() ? item.flagResponse.trim() : (resolved ? flag.flagResponse : null),
                  }
                })(),
              },
            })
            if (item.expenseLineId) await linkExpenseLineTx(tx, item.expenseLineId, created.id)
          }
        }
      }

      return tx.comboPaymentRequests.update({
        where: { id: requestId },
        data: {
          ...(title !== undefined ? { title: title.trim() } : {}),
          ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
          ...(loan.fields ?? {}),
          ...(loan.fields?.isBusinessLoan ? { overrideAmount: null } : {}),
          requestedAmount,
          // MBM-336: keep a running list of the cashier's corrections
          ...(cashierChangeLines.length > 0 ? {
            cashierEditedBy: user.id,
            cashierEditedAt: new Date(),
            cashierChanges: [existing.cashierChanges, ...cashierChangeLines.map(l => `• ${l}`)].filter(Boolean).join('\n'),
          } : {}),
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

    // MBM-319: linked recorded expenses are no longer pending — update the notice
    if ((sections || []).some((s: any) => (s.items || []).some((i: any) => i.expenseLineId))) {
      refreshRestaurantExpenseNoticeForAccount(accountId).catch(() => {})
    }
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof ExpenseLinkError) return NextResponse.json({ error: error.message }, { status: 409 })
    console.error('Error updating combo request:', error)
    return NextResponse.json({ error: 'Failed to update combo request' }, { status: 500 })
  }
}
