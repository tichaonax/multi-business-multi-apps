import { prisma } from '@/lib/prisma'

export interface AttributedPayee {
  payeeKey: string
  payeeType: string | null
  payeeId: string | null
  payeeName: string | null
  amount: number
}

type ReceiptPayeeFields = {
  payeeType?: string | null
  payeeName?: string | null
  payeePersonId?: string | null
  payeeBusinessId?: string | null
  payeeSupplierId?: string | null
  payeePerson?: { fullName: string } | null
  payeeBusiness?: { name: string } | null
  payeeSupplier?: { name: string } | null
}

type PaymentPayeeFields = {
  payeeType: string
  payeePersonId?: string | null
  payeeBusinessId?: string | null
  payeeSupplierId?: string | null
  payeeUserId?: string | null
  payeeEmployeeId?: string | null
  payeePerson?: { fullName: string } | null
  payeeBusiness?: { name: string } | null
  payeeSupplier?: { name: string } | null
  payeeUser?: { name: string } | null
  payeeEmployee?: { fullName: string } | null
}

/** Just the display name — for simple row-level rendering (receipts report, etc). */
export function resolveReceiptPayeeName(receipt: ReceiptPayeeFields): string | null {
  if (receipt.payeeType === 'PERSON') return receipt.payeePerson?.fullName ?? null
  if (receipt.payeeType === 'BUSINESS') return receipt.payeeBusiness?.name ?? null
  if (receipt.payeeType === 'SUPPLIER') return receipt.payeeSupplier?.name ?? null
  if (receipt.payeeType === 'FREEFORM') return receipt.payeeName ?? null
  return null
}

// Stable dedup key — two receipts to the same Person/Business/Supplier record
// (or the same freeform name) must group together even though names alone
// could theoretically collide across different real payees.
function resolveReceiptPayeeKey(receipt: ReceiptPayeeFields): { payeeKey: string; payeeType: string; payeeId: string | null; payeeName: string | null } | null {
  if (receipt.payeeType === 'PERSON' && receipt.payeePersonId) {
    return { payeeKey: `PERSON:${receipt.payeePersonId}`, payeeType: 'PERSON', payeeId: receipt.payeePersonId, payeeName: receipt.payeePerson?.fullName ?? null }
  }
  if (receipt.payeeType === 'BUSINESS' && receipt.payeeBusinessId) {
    return { payeeKey: `BUSINESS:${receipt.payeeBusinessId}`, payeeType: 'BUSINESS', payeeId: receipt.payeeBusinessId, payeeName: receipt.payeeBusiness?.name ?? null }
  }
  if (receipt.payeeType === 'SUPPLIER' && receipt.payeeSupplierId) {
    return { payeeKey: `SUPPLIER:${receipt.payeeSupplierId}`, payeeType: 'SUPPLIER', payeeId: receipt.payeeSupplierId, payeeName: receipt.payeeSupplier?.name ?? null }
  }
  if (receipt.payeeType === 'FREEFORM' && receipt.payeeName) {
    return { payeeKey: `FREEFORM:${receipt.payeeName}`, payeeType: 'FREEFORM', payeeId: null, payeeName: receipt.payeeName }
  }
  return null
}

function resolvePaymentPayeeKey(payment: PaymentPayeeFields): { payeeKey: string; payeeType: string; payeeId: string | null; payeeName: string | null } | null {
  if (payment.payeeType === 'PERSON' && payment.payeePersonId) {
    return { payeeKey: `PERSON:${payment.payeePersonId}`, payeeType: 'PERSON', payeeId: payment.payeePersonId, payeeName: payment.payeePerson?.fullName ?? null }
  }
  if (payment.payeeType === 'BUSINESS' && payment.payeeBusinessId) {
    return { payeeKey: `BUSINESS:${payment.payeeBusinessId}`, payeeType: 'BUSINESS', payeeId: payment.payeeBusinessId, payeeName: payment.payeeBusiness?.name ?? null }
  }
  if (payment.payeeType === 'SUPPLIER' && payment.payeeSupplierId) {
    return { payeeKey: `SUPPLIER:${payment.payeeSupplierId}`, payeeType: 'SUPPLIER', payeeId: payment.payeeSupplierId, payeeName: payment.payeeSupplier?.name ?? null }
  }
  if (payment.payeeType === 'USER' && payment.payeeUserId) {
    return { payeeKey: `USER:${payment.payeeUserId}`, payeeType: 'USER', payeeId: payment.payeeUserId, payeeName: payment.payeeUser?.name ?? null }
  }
  if (payment.payeeType === 'EMPLOYEE' && payment.payeeEmployeeId) {
    return { payeeKey: `EMPLOYEE:${payment.payeeEmployeeId}`, payeeType: 'EMPLOYEE', payeeId: payment.payeeEmployeeId, payeeName: payment.payeeEmployee?.fullName ?? null }
  }
  return null
}

/**
 * For a batch of ExpenseAccountPayments ids, returns how much actually went
 * to each real-world payee — from that payment's own receipts when it has
 * any with payee info (a split payment credits each distinct payee only
 * their receipted amount), falling back to the payment's own single payee
 * field for payments with no itemized receipts yet (the only information
 * available before any receipt is added).
 */
export async function getPayeeAttributedAmounts(paymentIds: string[]): Promise<Map<string, AttributedPayee[]>> {
  const result = new Map<string, AttributedPayee[]>()
  if (paymentIds.length === 0) return result

  const receipts = await prisma.expensePaymentReceipts.findMany({
    where: { expensePaymentId: { in: paymentIds } },
    select: {
      expensePaymentId: true,
      amount: true,
      payeeType: true,
      payeeName: true,
      payeePersonId: true,
      payeeBusinessId: true,
      payeeSupplierId: true,
      payeePerson: { select: { fullName: true } },
      payeeBusiness: { select: { name: true } },
      payeeSupplier: { select: { name: true } },
    },
  })

  const byPayment = new Map<string, typeof receipts>()
  for (const r of receipts) {
    const list = byPayment.get(r.expensePaymentId) ?? []
    list.push(r)
    byPayment.set(r.expensePaymentId, list)
  }

  const paymentsNeedingFallback: string[] = []
  for (const paymentId of paymentIds) {
    const paymentReceipts = byPayment.get(paymentId) ?? []
    const withPayee = paymentReceipts
      .map(r => ({ receipt: r, resolved: resolveReceiptPayeeKey(r) }))
      .filter((x): x is { receipt: typeof paymentReceipts[number]; resolved: NonNullable<ReturnType<typeof resolveReceiptPayeeKey>> } => x.resolved !== null)

    if (withPayee.length === 0) {
      paymentsNeedingFallback.push(paymentId)
      continue
    }

    const grouped = new Map<string, AttributedPayee>()
    for (const { receipt, resolved } of withPayee) {
      const existing = grouped.get(resolved.payeeKey)
      if (existing) existing.amount += Number(receipt.amount)
      else grouped.set(resolved.payeeKey, { ...resolved, amount: Number(receipt.amount) })
    }
    result.set(paymentId, [...grouped.values()])
  }

  if (paymentsNeedingFallback.length > 0) {
    const payments = await prisma.expenseAccountPayments.findMany({
      where: { id: { in: paymentsNeedingFallback } },
      select: {
        id: true,
        amount: true,
        payeeType: true,
        payeePersonId: true,
        payeeBusinessId: true,
        payeeSupplierId: true,
        payeeUserId: true,
        payeeEmployeeId: true,
        payeePerson: { select: { fullName: true } },
        payeeBusiness: { select: { name: true } },
        payeeSupplier: { select: { name: true } },
        payeeUser: { select: { name: true } },
        payeeEmployee: { select: { fullName: true } },
      },
    })
    for (const p of payments) {
      const resolved = resolvePaymentPayeeKey(p)
      result.set(p.id, resolved ? [{ ...resolved, amount: Number(p.amount) }] : [])
    }
  }

  return result
}
