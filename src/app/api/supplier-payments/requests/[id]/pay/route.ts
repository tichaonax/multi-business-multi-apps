import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { v4 as uuidv4 } from 'uuid'

function deriveRequestStatus(statuses: string[]): string {
  const hasPaid = statuses.includes('PAID')
  const hasApproved = statuses.includes('APPROVED')
  const hasPending = statuses.includes('PENDING')
  if (!hasPending && !hasApproved) return hasPaid ? 'PAID' : 'DENIED'
  if (hasPaid) return 'PARTIAL'
  if (hasApproved) return 'APPROVED'
  return 'PENDING'
}

// POST /api/supplier-payments/requests/[id]/pay
// Body (with items): { itemIds: string[], expenseAccountId?: string, notes?: string }
// Body (no items):   { amount: number, expenseAccountId?: string, notes?: string }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { itemIds, expenseAccountId, notes, amount } = body

    const req = await prisma.supplierPaymentRequests.findUnique({
      where: { id },
      include: {
        items: { select: { id: true, amount: true, approvedAmount: true, status: true } },
        supplier: { select: { id: true, name: true } },
      },
    })

    if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    const permissions = getEffectivePermissions(user, req.businessId)
    if (!permissions.canApproveSupplierPayments) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    if (!['APPROVED', 'PARTIAL'].includes(req.status)) {
      return NextResponse.json({ error: 'Only APPROVED or PARTIAL requests can be paid' }, { status: 400 })
    }

    // Determine the payment amount
    let parsedAmount: number
    let itemAmountOverride = false  // true when manager entered a custom amount

    if (req.items.length > 0) {
      // Item-based payment
      if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        return NextResponse.json({ error: 'itemIds is required when the request has line items' }, { status: 400 })
      }
      const itemsToPay = req.items.filter(i => itemIds.includes(i.id))
      if (itemsToPay.length === 0) {
        return NextResponse.json({ error: 'No matching items found' }, { status: 400 })
      }
      const notApproved = itemsToPay.filter(i => i.status !== 'APPROVED')
      if (notApproved.length > 0) {
        return NextResponse.json({ error: 'All selected items must be in APPROVED status' }, { status: 400 })
      }
      // Use approvedAmount if set (manager approved less), otherwise fall back to original amount
      const itemSum = itemsToPay.reduce((sum, i) => {
        const cap = i.approvedAmount != null ? parseFloat(i.approvedAmount.toString()) : parseFloat(i.amount.toString())
        return sum + cap
      }, 0)

      if (amount !== undefined && amount !== null) {
        // Manager provided an explicit amount — validate and use it
        parsedAmount = parseFloat(amount)
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          return NextResponse.json({ error: 'Payment amount must be greater than zero' }, { status: 400 })
        }
        if (parsedAmount > itemSum + 0.001) {
          return NextResponse.json({ error: `Payment amount ($${parsedAmount.toFixed(2)}) cannot exceed the selected items total ($${itemSum.toFixed(2)})` }, { status: 400 })
        }
        itemAmountOverride = parsedAmount < itemSum - 0.001
        if (itemAmountOverride && (!notes || notes.trim().length < 3)) {
          return NextResponse.json({ error: 'A reason is required when paying less than the requested amount' }, { status: 400 })
        }
      } else {
        parsedAmount = itemSum
      }
    } else {
      // Legacy amount-based payment
      parsedAmount = parseFloat(amount)
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
      }
      const remaining = parseFloat(req.amount.toString()) - parseFloat(req.paidAmount.toString())
      if (parsedAmount > remaining) {
        return NextResponse.json({ error: `Payment exceeds remaining balance ($${remaining.toFixed(2)})` }, { status: 400 })
      }
    }

    // primaryAccountId is always the account on the request — the actual supplier payment comes from here.
    // selectedAccountId is what the manager chose in the UI (may differ from primary).
    const primaryAccountId = req.expenseAccountId
    const selectedAccountId = expenseAccountId || primaryAccountId
    const isCrossAccount = selectedAccountId !== primaryAccountId

    // Validate the selected account exists and is active
    const selectedAccount = await prisma.expenseAccounts.findFirst({
      where: { id: selectedAccountId, isActive: true },
      select: { id: true, accountName: true, businessId: true },
    })
    if (!selectedAccount) {
      return NextResponse.json({ error: 'Expense account not found or inactive' }, { status: 404 })
    }

    // If cross-account, pre-fetch the source business name for the transfer ledger
    let fromBusinessName = selectedAccount.accountName
    if (isCrossAccount && selectedAccount.businessId) {
      const biz = await prisma.businesses.findUnique({
        where: { id: selectedAccount.businessId },
        select: { name: true },
      })
      if (biz?.name) fromBusinessName = `${biz.name} — ${selectedAccount.accountName}`
    }

    const result = await prisma.$transaction(async (tx: any) => {
      if (isCrossAccount) {
        // === Cross-account flow ===
        // 1. Authoritative balance check on the SELECTED (source) account
        const selDeposits = await tx.expenseAccountDeposits.aggregate({
          where: { expenseAccountId: selectedAccountId },
          _sum: { amount: true },
        })
        const selPayments = await tx.expenseAccountPayments.aggregate({
          where: { expenseAccountId: selectedAccountId, status: { in: ['PAID', 'SUBMITTED', 'APPROVED'] } },
          _sum: { amount: true },
        })
        const selBalance = Number(selDeposits._sum.amount || 0) - Number(selPayments._sum.amount || 0)
        if (parsedAmount > selBalance) {
          throw new Error(`Insufficient balance. Available: $${selBalance.toFixed(2)}, Required: $${parsedAmount.toFixed(2)}`)
        }

        // 2. Deduct from selected account (transfer out)
        await tx.expenseAccountPayments.create({
          data: {
            id: uuidv4(),
            expenseAccountId: selectedAccountId,
            payeeType: 'ACCOUNT_TRANSFER',
            amount: parsedAmount,
            paymentDate: new Date(),
            paymentType: 'TRANSFER_OUT',
            notes: `Auto-transfer to primary account for supplier payment #${id.slice(-8)}`,
            status: 'SUBMITTED',
            createdBy: user.id,
            submittedBy: user.id,
            submittedAt: new Date(),
            isFullPayment: false,
          },
        })

        // 3. Deposit into primary account (transfer in)
        const transferDeposit = await tx.expenseAccountDeposits.create({
          data: {
            expenseAccountId: primaryAccountId,
            sourceType: 'ACCOUNT_TRANSFER',
            amount: parsedAmount,
            depositDate: new Date(),
            autoGeneratedNote: `Auto-transfer from "${selectedAccount.accountName}" for supplier payment #${id.slice(-8)}`,
            createdBy: user.id,
          },
        })

        // 4. Record in BusinessTransferLedger for future settlement
        // isAutoTransfer = true: not editable, return must be in full
        await tx.businessTransferLedger.create({
          data: {
            id: uuidv4(),
            toAccountId: primaryAccountId,
            fromBusinessId: selectedAccount.businessId ?? req.businessId,
            fromBusinessName,
            toBusinessId: req.businessId,
            depositId: transferDeposit.id,
            originalAmount: parsedAmount,
            outstandingAmount: parsedAmount,
            transferDate: new Date(),
            status: 'OUTSTANDING',
            isAutoTransfer: true,
            createdBy: user.id,
          },
        })
        // Primary account now has the funds — proceed to supplier payment below.
      } else {
        // === Direct payment: authoritative balance check on primary account ===
        const depositsAgg = await tx.expenseAccountDeposits.aggregate({
          where: { expenseAccountId: primaryAccountId },
          _sum: { amount: true },
        })
        const paymentsAgg = await tx.expenseAccountPayments.aggregate({
          where: { expenseAccountId: primaryAccountId, status: { in: ['PAID', 'SUBMITTED', 'APPROVED'] } },
          _sum: { amount: true },
        })
        const trueBalance = Number(depositsAgg._sum.amount || 0) - Number(paymentsAgg._sum.amount || 0)
        if (parsedAmount > trueBalance) {
          throw new Error(`Insufficient balance. Available: $${trueBalance.toFixed(2)}, Required: $${parsedAmount.toFixed(2)}`)
        }
      }

      // Mark selected items as PAID (item-based flow)
      if (itemIds && itemIds.length > 0) {
        const itemUpdateData: any = { status: 'PAID' }
        if (itemAmountOverride && notes?.trim()) {
          // Store manager's note on each paid item so POS user can see the reason
          itemUpdateData.managerNote = `Paid $${parsedAmount.toFixed(2)} of $${
            req.items.filter(i => itemIds.includes(i.id))
              .reduce((s, i) => s + parseFloat(i.amount.toString()), 0)
              .toFixed(2)
          } requested. ${notes.trim()}`
        }
        await tx.supplierPaymentRequestItems.updateMany({
          where: { id: { in: itemIds }, requestId: id },
          data: itemUpdateData,
        })
      }

      // Recalculate paidAmount and request status
      let newPaidAmount: number
      let newStatus: string

      if (req.items.length > 0) {
        const allItems = await tx.supplierPaymentRequestItems.findMany({
          where: { requestId: id },
          select: { status: true, amount: true },
        })
        if (itemAmountOverride) {
          // Manager paid a custom amount — use cumulative sum
          newPaidAmount = parseFloat(req.paidAmount.toString()) + parsedAmount
        } else {
          // Full item amounts — derive from PAID items
          newPaidAmount = allItems
            .filter((i: any) => i.status === 'PAID')
            .reduce((sum: number, i: any) => sum + parseFloat(i.amount.toString()), 0)
        }
        newStatus = deriveRequestStatus(allItems.map((i: any) => i.status))
        // If the manager paid a partial amount, all items are still marked PAID by deriveRequestStatus
        // but the actual paidAmount is less than the submitted total — keep it PARTIAL.
        if (newStatus === 'PAID' && newPaidAmount < parseFloat(req.amount.toString()) - 0.001) {
          newStatus = 'PARTIAL'
        }
      } else {
        newPaidAmount = parseFloat(req.paidAmount.toString()) + parsedAmount
        const totalAmount = parseFloat(req.amount.toString())
        newStatus = newPaidAmount >= totalAmount ? 'PAID' : 'PARTIAL'
      }

      // Create expense account payment — always debits the PRIMARY account
      const expensePayment = await tx.expenseAccountPayments.create({
        data: {
          id: uuidv4(),
          expenseAccountId: primaryAccountId,
          payeeType: 'SUPPLIER',
          payeeSupplierId: req.supplierId,
          amount: parsedAmount,
          paymentDate: new Date(),
          notes: notes?.trim() || `Supplier payment request #${req.id.slice(-8)}`,
          status: 'SUBMITTED',
          createdBy: user.id,
          submittedBy: user.id,
          submittedAt: new Date(),
          isFullPayment: newStatus === 'PAID',
        },
      })

      // Create partial payment record
      const partial = await tx.supplierPaymentRequestPartials.create({
        data: {
          id: uuidv4(),
          requestId: id,
          paymentId: expensePayment.id,
          amount: parsedAmount,
          paidBy: user.id,
        },
      })

      const updatedRequest = await tx.supplierPaymentRequests.update({
        where: { id },
        data: { paidAmount: newPaidAmount, status: newStatus },
      })

      return { expensePayment, partial, updatedRequest }
    })

    return NextResponse.json({
      success: true,
      data: {
        requestId: id,
        status: result.updatedRequest.status,
        paidAmount: parseFloat(result.updatedRequest.paidAmount.toString()),
        remainingAmount: parseFloat(req.amount.toString()) - parseFloat(result.updatedRequest.paidAmount.toString()),
        expensePaymentId: result.expensePayment.id,
      },
    })
  } catch (error: any) {
    console.error('Error paying supplier payment request:', error)
    if (error.message?.startsWith('Insufficient balance')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
