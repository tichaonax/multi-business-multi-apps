'use client'

// MBM-330 — under a combo request line item: who each receipt tagged to it
// actually paid, e.g. "✅ Paid to Mr Sunday · receipt $25.00". A known payee
// links to their Payee History.
import { payeeHistoryHref } from '@/lib/expense-account/payee-history-link'

export interface ComboItemReceiptPayment {
  amount: number
  payeeType: string | null
  payeeId: string | null
  payeeName: string | null
}

export function ComboItemPaidTo({ payments }: { payments?: ComboItemReceiptPayment[] | null }) {
  if (!payments || payments.length === 0) return null
  return (
    <div className="mt-0.5 space-y-0.5">
      {payments.map((p, idx) => {
        const href = payeeHistoryHref(p.payeeType, p.payeeId, p.payeeName)
        return (
          <p key={idx} className="text-xs text-emerald-700 dark:text-emerald-400">
            ✅ Paid to{' '}
            {p.payeeName ? (
              href ? (
                <a href={href} className="font-medium underline decoration-dotted hover:decoration-solid" title={`Open ${p.payeeName}'s payee history`}>
                  {p.payeeName}
                </a>
              ) : (
                <span className="font-medium">{p.payeeName}</span>
              )
            ) : (
              <span className="italic text-gray-500 dark:text-gray-400">no payee recorded</span>
            )}
            {' · '}receipt ${p.amount.toFixed(2)}
          </p>
        )
      })}
    </div>
  )
}
