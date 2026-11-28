'use client'

// MBM-361: the original request behind a loan deposit / its payments,
// READ-ONLY (no edit, approve, cancel or settle). Served through the account
// being viewed: GET /api/expense-account/[accountId]/loan-request/[requestId]
import { useEffect, useState } from 'react'
import { ModalPortal } from '@/components/ui/modal-portal'

interface LoanRequestView {
  id: string
  title: string
  status: string
  notes: string | null
  requestedAmount: number | null
  approvedAmount: number | null
  approvalNote: string | null
  requestedBy: string | null
  createdAt: string
  submittedAt: string | null
  approvedBy: string | null
  approvedAt: string | null
  cashierEditedBy: string | null
  cashierChanges: string | null
  lendingAccount: { accountName: string; accountNumber: string } | null
  borrowingAccount: { accountName: string; accountNumber: string } | null
  borrowingBusiness: string | null
  loan: { loanNumber: string; status: string; principalAmount: number | null; remainingBalance: number | null; disbursementDate: string } | null
  sections: Array<{
    id: string
    name: string
    payee: string | null
    items: Array<{
      id: string; description: string; quantity: number | null; unit: string | null; payee: string | null
      category: string | null; subcategory: string | null; amount: number | null
      payment: { id: string; status: string; amount: number | null; date: string } | null
      receipted: number; noReceiptReason: string | null
    }>
  }>
}

const money = (n: number | null | undefined) => (n === null || n === undefined ? '—' : '$' + n.toFixed(2))
const when = (d: string | null | undefined) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—')

export function LoanRequestViewModal({ accountId, requestId, onClose }: { accountId: string; requestId: string; onClose: () => void }) {
  const [data, setData] = useState<LoanRequestView | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    fetch(`/api/expense-account/${accountId}/loan-request/${requestId}`)
      .then(r => r.json().then(j => ({ ok: r.ok, j })))
      .then(({ ok, j }) => { if (!live) return; if (!ok) throw new Error(j?.error || 'Could not load the request'); setData(j.data) })
      .catch(e => { if (live) setError(e.message) })
    return () => { live = false }
  }, [accountId, requestId])

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex gap-3 py-1">
      <dt className="w-40 shrink-0 text-sm text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-900 dark:text-gray-100 min-w-0 break-words">{value}</dd>
    </div>
  )

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">📄 Original request</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{data?.title ?? ' '}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200">🔒 Read-only</span>
              <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl leading-none">✕</button>
            </div>
          </div>

          <div className="overflow-y-auto px-5 py-4 space-y-5">
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {!data && !error && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
            {data && (<>
              <dl>
                {row('Status', data.status.replace(/_/g, ' '))}
                {row('Requested by', `${data.requestedBy || '—'} · ${when(data.submittedAt || data.createdAt)}`)}
                {row('Approved by', data.approvedBy ? `${data.approvedBy} · ${when(data.approvedAt)}` : '—')}
                {data.approvalNote && row('Approval note', data.approvalNote)}
                {data.cashierEditedBy && row('Corrected by cashier', `${data.cashierEditedBy}${data.cashierChanges ? ': ' + data.cashierChanges : ''}`)}
                {data.notes && row('Notes', data.notes)}
                {row('Requested', money(data.requestedAmount))}
                {row('Approved', <span className="font-semibold text-green-700 dark:text-green-400">{money(data.approvedAmount)}</span>)}
                {row('Lent from', data.lendingAccount ? `${data.lendingAccount.accountName} (${data.lendingAccount.accountNumber})` : '—')}
                {row('Paid into', data.borrowingAccount ? `${data.borrowingAccount.accountName} (${data.borrowingAccount.accountNumber})${data.borrowingBusiness ? ' · ' + data.borrowingBusiness : ''}` : '—')}
                {data.loan && row('Loan', `#${data.loan.loanNumber} · ${data.loan.status.replace(/_/g, ' ')} · ${money(data.loan.remainingBalance)} of ${money(data.loan.principalAmount)} left to repay`)}
              </dl>

              {data.sections.map(s => (
                <div key={s.id}>
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    {s.name}{s.payee && s.payee !== s.name ? <span className="font-normal text-gray-500 dark:text-gray-400"> · {s.payee}</span> : null}
                  </h4>
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    {s.items.map(i => (
                      <li key={i.id} className="px-3 py-2 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <span className="min-w-0 text-gray-900 dark:text-gray-100">
                            {i.description}{i.quantity ? <span className="text-gray-500 dark:text-gray-400"> · {i.quantity}{i.unit ? ' ' + i.unit : ''}</span> : null}
                          </span>
                          <span className="font-semibold text-green-700 dark:text-green-400 whitespace-nowrap">{money(i.amount)}</span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-gray-500 dark:text-gray-400">
                          {i.payee && <span>Payee: {i.payee}</span>}
                          {i.category && <span>· {i.category}{i.subcategory ? ' › ' + i.subcategory : ''}</span>}
                          {i.payment && <span>· Paid {money(i.payment.amount)} ({i.payment.status.toLowerCase()})</span>}
                          <span className={i.amount && i.receipted >= i.amount ? 'text-green-700 dark:text-green-400' : ''}>
                            · Receipts {money(i.receipted)}{i.noReceiptReason ? ` · no receipt: ${i.noReceiptReason}` : ''}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>)}
          </div>

          <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Approved loans can&apos;t be changed here. Corrections will need a reconciliation.</p>
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600">Close</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
