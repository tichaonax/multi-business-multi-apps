// MBM-333 — business-loan combo requests.
//
// A combo marked as a business loan is, on approval, lent to the target
// business and paid out there item by item. One transaction, in order:
//   1. LOAN_DISBURSEMENT payment on the source account (money out)
//   2. AccountOutgoingLoans row, BUSINESS, ACTIVE — the debt only, no money
//   3. LOAN_RECEIVED deposit on the target expense account (money in)
//   4. One APPROVED payment per item on the target account (money out there,
//      keeping each item's amount, payee and category)
//   5. The combo is APPROVED and linked to the payment and loan
// Source −X; target +X then −X across the items; the loan holds the X owed.
// Same records as an approved MBM-312 business loan, so repayments, the
// Lent-out tab, overdue alerts and the loans report work unchanged.
import { prisma } from '@/lib/prisma'
import { updateExpenseAccountBalanceTx } from '@/lib/expense-account-utils'

/** OL-YYYY-NNNNNN — display label for outgoing loans (not unique across machines). */
export function generateLoanNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 900000) + 100000
  return `OL-${year}-${random}`
}

export async function uniqueLoanNumber(): Promise<string> {
  let loanNumber = generateLoanNumber()
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.accountOutgoingLoans.findFirst({ where: { loanNumber }, select: { id: true } })
    if (!exists) break
    loanNumber = generateLoanNumber()
  }
  return loanNumber
}

export interface ComboLoanFields {
  isBusinessLoan: boolean
  loanBusinessId: string | null
  loanExpenseAccountId: string | null
}

/**
 * Reads the loan fields from a create/edit body. Returns undefined when the
 * body doesn't mention them (leave as is), or an error message.
 */
export async function readComboLoanFields(
  sourceAccountId: string,
  body: any
): Promise<{ fields?: ComboLoanFields; error?: string }> {
  if (body?.isBusinessLoan === undefined) return {}
  if (!body.isBusinessLoan) return { fields: { isBusinessLoan: false, loanBusinessId: null, loanExpenseAccountId: null } }

  const loanBusinessId = typeof body.loanBusinessId === 'string' ? body.loanBusinessId : ''
  const loanExpenseAccountId = typeof body.loanExpenseAccountId === 'string' ? body.loanExpenseAccountId : ''
  if (!loanBusinessId) return { error: 'Choose the business the loan goes to' }
  if (!loanExpenseAccountId) return { error: "Choose the business's expense account that receives the loan" }

  const [source, business, target] = await Promise.all([
    prisma.expenseAccounts.findUnique({ where: { id: sourceAccountId }, select: { businessId: true } }),
    prisma.businesses.findUnique({ where: { id: loanBusinessId }, select: { isActive: true } }),
    prisma.expenseAccounts.findUnique({ where: { id: loanExpenseAccountId }, select: { businessId: true, isActive: true } }),
  ])
  if (!business?.isActive) return { error: 'The loan business was not found or is inactive' }
  if (source?.businessId && source.businessId === loanBusinessId) return { error: "A loan can't go to this account's own business" }
  if (!target || !target.isActive || target.businessId !== loanBusinessId) {
    return { error: "The receiving expense account must be an active account of the loan business" }
  }
  if (loanExpenseAccountId === sourceAccountId) return { error: "The receiving account can't be the account the money comes from" }
  return { fields: { isBusinessLoan: true, loanBusinessId, loanExpenseAccountId } }
}

type Payee = { payeeType: string | null; payeePersonId: string | null; payeeUserId: string | null; payeeEmployeeId: string | null; payeeBusinessId: string | null; payeeSupplierId: string | null }

function payeeIdOf(p: Payee): string | null {
  switch (p.payeeType) {
    case 'PERSON': return p.payeePersonId
    case 'USER': return p.payeeUserId
    case 'EMPLOYEE': return p.payeeEmployeeId
    case 'BUSINESS': return p.payeeBusinessId
    case 'SUPPLIER': return p.payeeSupplierId
    default: return null
  }
}

/** The item's own payee, else its section's (the form lets a section carry one payee for all its items). */
export function itemPayee(item: Payee, section: Payee | null): Payee {
  if (item.payeeType && payeeIdOf(item)) return item
  if (section?.payeeType && payeeIdOf(section)) return section
  return item
}

type LoanCombo = {
  id: string
  accountId: string
  title: string
  submittedAt: Date | null
  createdAt: Date
  loanBusinessId: string | null
  loanExpenseAccountId: string | null
  sections: Array<Payee & { id: string; items: Array<Payee & { id: string; description: string; estimatedAmount: any; categoryId: string | null; subcategoryId: string | null; restaurantExpenseLineId?: string | null }> }>
}

/** Plain-words problems that stop a loan combo from being approved (empty = fine). */
export function loanComboProblems(combo: LoanCombo): string[] {
  const problems: string[] = []
  if (!combo.loanBusinessId || !combo.loanExpenseAccountId) problems.push('The loan business or its receiving account is missing')
  const items = combo.sections.flatMap(s => s.items.map(i => ({ i, s })))
  if (items.length === 0) problems.push('There are no items')
  for (const { i, s } of items) {
    if (!(Number(i.estimatedAmount ?? 0) > 0)) problems.push(`"${i.description}" has no amount`)
    if (!payeeIdOf(itemPayee(i, s))) problems.push(`"${i.description}" has no payee`)
    // MBM-319 recorded restaurant expenses are confirmed paid through the
    // combo's own item flow, which a loan combo doesn't use
    if (i.restaurantExpenseLineId) problems.push(`"${i.description}" pays a recorded restaurant expense, which can't go through a loan`)
  }
  return problems
}

/**
 * Steps 1–5 above, inside the caller's transaction. Approves the full
 * requested total (decision Q1: loan combos are approved in full; to approve
 * less the cashier returns the request for changes).
 */
export async function approveComboAsBusinessLoanTx(
  tx: any,
  combo: LoanCombo,
  opts: { userId: string; approverEmployeeId: string | null; amount: number; approvalNote: string | null; loanNumber: string }
) {
  const now = new Date()
  const { userId, amount } = opts
  const targetBusinessId = combo.loanBusinessId!
  const targetAccountId = combo.loanExpenseAccountId!

  // 1. Money out of the source account
  const disbursement = await tx.expenseAccountPayments.create({
    data: {
      expenseAccountId: combo.accountId,
      payeeType: 'BUSINESS',
      payeeBusinessId: targetBusinessId,
      amount,
      paymentDate: combo.submittedAt ?? combo.createdAt,
      notes: `🤝 Loan for combo request: ${combo.title}`,
      isFullPayment: true,
      status: 'SUBMITTED', // as MBM-312 loan disbursements
      paymentType: 'LOAN_DISBURSEMENT',
      createdBy: userId,
      submittedBy: userId,
      submittedAt: now,
    },
  })

  // 2. The debt (no money)
  const loan = await tx.accountOutgoingLoans.create({
    data: {
      loanNumber: opts.loanNumber,
      expenseAccountId: combo.accountId,
      loanType: 'BUSINESS',
      recipientBusinessId: targetBusinessId,
      principalAmount: amount,
      remainingBalance: amount,
      disbursementDate: now,
      status: 'ACTIVE',
      purpose: `Combo request: ${combo.title}`,
      notes: opts.approvalNote,
      paymentType: 'MANUAL',
      approvedByEmployeeId: opts.approverEmployeeId,
      approvedAt: now,
      disbursementPaymentId: disbursement.id,
      createdBy: userId,
    },
  })
  await tx.expenseAccountPayments.update({ where: { id: disbursement.id }, data: { outgoingLoanId: loan.id } })

  // 3. Money into the target business's account, as a loan received
  await tx.expenseAccountDeposits.create({
    data: {
      expenseAccountId: targetAccountId,
      sourceType: 'LOAN_RECEIVED',
      sourceOutgoingLoanId: loan.id,
      amount,
      depositDate: now,
      autoGeneratedNote: `🤝 Loan received — combo request: ${combo.title} (${opts.loanNumber})`,
      createdBy: userId,
    },
  })

  // 4. One approved payment per item on the target account
  for (const section of combo.sections) {
    for (const item of section.items) {
      const p = itemPayee(item, section)
      const payment = await tx.expenseAccountPayments.create({
        data: {
          expenseAccountId: targetAccountId,
          payeeType: p.payeeType,
          payeePersonId: p.payeeType === 'PERSON' ? p.payeePersonId : null,
          payeeUserId: p.payeeType === 'USER' ? p.payeeUserId : null,
          payeeEmployeeId: p.payeeType === 'EMPLOYEE' ? p.payeeEmployeeId : null,
          payeeBusinessId: p.payeeType === 'BUSINESS' ? p.payeeBusinessId : null,
          payeeSupplierId: p.payeeType === 'SUPPLIER' ? p.payeeSupplierId : null,
          categoryId: item.categoryId,
          subcategoryId: item.subcategoryId,
          amount: Number(item.estimatedAmount),
          paymentDate: now,
          notes: `Combo request "${combo.title}" (loan ${opts.loanNumber}): ${item.description}`,
          isFullPayment: true,
          status: 'APPROVED',
          paymentType: 'REGULAR',
          createdBy: userId,
          submittedBy: userId,
          submittedAt: now,
        },
      })
      await tx.comboPaymentRequestItems.update({
        where: { id: item.id },
        data: { generatedPaymentId: payment.id, approvedAmount: Number(item.estimatedAmount) },
      })
    }
  }

  // 5. The combo itself
  const updated = await tx.comboPaymentRequests.update({
    where: { id: combo.id },
    data: {
      status: 'APPROVED',
      approvedAmount: amount,
      approvalNote: opts.approvalNote,
      approvedBy: userId,
      approvedAt: now,
      linkedPaymentId: disbursement.id,
      outgoingLoanId: loan.id,
    },
  })

  await updateExpenseAccountBalanceTx(tx, combo.accountId)
  await updateExpenseAccountBalanceTx(tx, targetAccountId)

  return { updated, loan }
}

const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`

/**
 * The cashier's "submitted" notification. A loan leads with the amount; a
 * request resubmitted after a return gets its own type (shown in a different
 * colour) and says how many times it has been resubmitted.
 */
export function comboSubmittedNotice(opts: {
  title: string
  submitterName: string
  amount: number
  loanBusinessName?: string | null
  resubmitCount?: number
}): { type: 'COMBO_REQUEST_SUBMITTED' | 'COMBO_REQUEST_RESUBMITTED'; title: string; message: string } {
  const amount = `$${opts.amount.toFixed(2)}`
  const resubmits = opts.resubmitCount ?? 0
  const verb = resubmits > 0 ? 'resubmitted' : 'submitted'
  const message = opts.loanBusinessName
    ? `${amount} · 🤝 loan to ${opts.loanBusinessName} — ${opts.submitterName} ${verb} "${opts.title}"`
    : `${opts.submitterName} ${verb} "${opts.title}" — ${amount}`
  if (resubmits > 0) {
    return {
      type: 'COMBO_REQUEST_RESUBMITTED',
      title: `🔁 Combo Request Resubmitted (${ordinal(resubmits)} time)${opts.loanBusinessName ? ' — Business Loan' : ''}`,
      message,
    }
  }
  return {
    type: 'COMBO_REQUEST_SUBMITTED',
    title: opts.loanBusinessName ? 'New Combo Request — Business Loan' : 'New Combo Request',
    message,
  }
}
