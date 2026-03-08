'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToastContext } from '@/components/ui/toast'

interface PaymentRequest {
  id: string
  payeeType: string
  payeeUser?: { name: string } | null
  payeeEmployee?: { fullName: string } | null
  payeePerson?: { fullName: string } | null
  payeeBusiness?: { name: string } | null
  payeeSupplier?: { name: string } | null
  category?: { name: string; emoji?: string | null } | null
  subcategory?: { name: string } | null
  amount: number
  notes?: string | null
  createdBy?: { name: string } | null
  createdAt: string
}

interface PrintData {
  batchId: string
  businessName: string
  accountName: string
  cashierName: string
  submittedAt: string
  totalAmount: number
  paymentCount: number
  payments: {
    id: string
    payeeName: string
    categoryName: string
    subcategoryName?: string | null
    amount: number
    notes?: string | null
    createdBy: string
  }[]
}

interface Props {
  accountId: string
  accountName: string
  businessId: string
  onClose: () => void
  onSuccess: () => void
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

function payeeName(p: PaymentRequest): string {
  if (p.payeeUser) return p.payeeUser.name
  if (p.payeeEmployee) return p.payeeEmployee.fullName
  if (p.payeePerson) return p.payeePerson.fullName
  if (p.payeeBusiness) return p.payeeBusiness.name
  if (p.payeeSupplier) return p.payeeSupplier.name
  return 'General'
}

export function PaymentBatchModal({ accountId, accountName, businessId, onClose, onSuccess }: Props) {
  const toast = useToastContext()
  const [requests, setRequests] = useState<PaymentRequest[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [businessBalance, setBusinessBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notes, setNotes] = useState('')
  const [printData, setPrintData] = useState<PrintData | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [reqRes, bizRes] = await Promise.all([
        fetch(`/api/expense-account/${accountId}/payment-requests`, { credentials: 'include' }),
        fetch(`/api/business/${businessId}/account`, { credentials: 'include' }),
      ])
      if (reqRes.ok) {
        const d = await reqRes.json()
        const items: PaymentRequest[] = d.data ?? []
        setRequests(items)
        setSelected(new Set(items.map((p) => p.id)))
      }
      if (bizRes.ok) {
        const d = await bizRes.json()
        setBusinessBalance(Number(d.data?.account?.balance ?? d.data?.balance ?? 0))
      }
    } finally {
      setLoading(false)
    }
  }, [accountId, businessId])

  useEffect(() => { loadData() }, [loadData])

  const toggleAll = () => {
    if (selected.size === requests.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(requests.map((p) => p.id)))
    }
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectedPayments = requests.filter((p) => selected.has(p.id))
  const totalSelected = selectedPayments.reduce((s, p) => s + p.amount, 0)
  const hasInsufficientFunds = businessBalance !== null && totalSelected > businessBalance
  const canSubmit = selected.size > 0 && !hasInsufficientFunds && !submitting

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/expense-account/${accountId}/payment-batch`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIds: Array.from(selected), notes: notes.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to submit batch')
      toast.push(`Batch of ${json.data.paymentCount} payments submitted successfully`, { type: 'success' })
      setPrintData(json.data.printData)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handlePrint() {
    if (!printData) return
    const win = window.open('', '_blank', 'width=600,height=700')
    if (!win) return
    const rows = printData.payments
      .map(
        (p) =>
          `<tr>
            <td style="padding:4px 8px;border-bottom:1px solid #eee">${p.payeeName}</td>
            <td style="padding:4px 8px;border-bottom:1px solid #eee">${p.categoryName}${p.subcategoryName ? ` › ${p.subcategoryName}` : ''}</td>
            <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">${fmt(p.amount)}</td>
            <td style="padding:4px 8px;border-bottom:1px solid #eee">${p.notes ?? ''}</td>
          </tr>`
      )
      .join('')
    win.document.write(`<!DOCTYPE html><html><head><title>Payment Batch</title>
      <style>body{font-family:sans-serif;font-size:12px;margin:20px}h2{margin-bottom:4px}table{width:100%;border-collapse:collapse}th{text-align:left;background:#f5f5f5;padding:4px 8px;border-bottom:2px solid #ddd}.total{font-weight:bold;font-size:14px;margin-top:12px}</style>
      </head><body>
      <h2>Payment Batch Summary</h2>
      <p><strong>Business:</strong> ${printData.businessName} &nbsp; <strong>Account:</strong> ${printData.accountName}</p>
      <p><strong>Submitted by:</strong> ${printData.cashierName} &nbsp; <strong>Date:</strong> ${new Date(printData.submittedAt).toLocaleString()}</p>
      <table><thead><tr><th>Payee</th><th>Category</th><th>Amount</th><th>Notes</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <p class="total">Total: ${fmt(printData.totalAmount)} (${printData.paymentCount} payments)</p>
      <script>window.print();window.onafterprint=()=>window.close();</script>
      </body></html>`)
    win.document.close()
  }

  if (printData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-2">✅</div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Batch Submitted</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {printData.paymentCount} payments · {fmt(printData.totalAmount)}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg"
            >
              🖨 Print Summary
            </button>
            <button
              onClick={onSuccess}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Submit Payment Batch</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{accountName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Balance info */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex gap-6 text-sm shrink-0">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Business Account: </span>
            <span className={`font-semibold ${businessBalance !== null && businessBalance < totalSelected ? 'text-red-600' : 'text-green-600 dark:text-green-400'}`}>
              {businessBalance !== null ? fmt(businessBalance) : '…'}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Selected Total: </span>
            <span className="font-semibold text-gray-900 dark:text-white">{fmt(totalSelected)}</span>
          </div>
          {hasInsufficientFunds && (
            <div className="text-red-600 dark:text-red-400 font-medium">Insufficient funds</div>
          )}
        </div>

        {/* Payment list */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-8">Loading…</p>
          ) : requests.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No pending payment requests</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                  <th className="pb-2 pr-3 w-8">
                    <input
                      type="checkbox"
                      checked={selected.size === requests.length}
                      onChange={toggleAll}
                      className="rounded"
                    />
                  </th>
                  <th className="pb-2 text-left">Payee</th>
                  <th className="pb-2 text-left">Category</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggle(p.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="py-2">
                      <p className="font-medium text-gray-900 dark:text-white">{payeeName(p)}</p>
                      {p.notes && <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-xs">{p.notes}</p>}
                    </td>
                    <td className="py-2 text-gray-600 dark:text-gray-400">
                      {p.category ? `${p.category.emoji ?? ''} ${p.category.name}`.trim() : '—'}
                      {p.subcategory && <span className="text-xs text-gray-400"> › {p.subcategory.name}</span>}
                    </td>
                    <td className="py-2 text-right font-medium text-red-600 dark:text-red-400">
                      {fmt(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Notes + Submit */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 space-y-3 shrink-0">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Cashier notes (optional)"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
          />
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg"
            >
              {submitting ? 'Submitting…' : `Submit ${selected.size} Payment${selected.size !== 1 ? 's' : ''} · ${fmt(totalSelected)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
