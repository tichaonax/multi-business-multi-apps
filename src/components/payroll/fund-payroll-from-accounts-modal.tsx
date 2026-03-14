"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useToastContext } from '@/components/ui/toast'
import { generatePayrollFundingVoucher, type PayrollFundingVoucherData } from '@/lib/pdf-utils'

interface CashBoxSource {
  id: string          // businessId
  accountName: string // e.g. "HXI Eats Cash Box"
  balance: number
  businessId: string
  business: { id: string; name: string; type: string } | null
}

interface FundPayrollFromAccountsModalProps {
  totalRequired: number
  currentPayrollBalance: number
  onSuccess: () => void
  onClose: () => void
}

/** Distribute `needed` across sources proportionally, using floor for whole numbers.
 *  Any remainder (due to flooring) is added to the source with the highest balance. */
function proportionalFill(sources: CashBoxSource[], needed: number): Record<string, number> {
  if (sources.length === 0 || needed <= 0) return {}
  const totalAvail = sources.reduce((s, b) => s + b.balance, 0)
  // Round UP to nearest whole dollar — no pennies
  const target = Math.min(Math.ceil(needed), Math.floor(totalAvail))

  const amounts: Record<string, number> = {}
  let allocated = 0

  for (const src of sources) {
    const share = Math.floor(target * (src.balance / totalAvail))
    amounts[src.id] = share
    allocated += share
  }

  // Distribute remaining whole dollars (from flooring) to highest-balance sources
  let remainder = target - allocated
  const sorted = [...sources].sort((a, b) => b.balance - a.balance)
  for (const src of sorted) {
    if (remainder <= 0) break
    if (amounts[src.id] < src.balance) {
      amounts[src.id] += 1
      remainder -= 1
    }
  }

  return amounts
}

function makeVoucherId(): string {
  const now = new Date()
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '')
  const rand = String(Math.floor(Math.random() * 9000) + 1000)
  return `PCW-${datePart}-${rand}`
}

export function FundPayrollFromAccountsModal({
  totalRequired,
  currentPayrollBalance,
  onSuccess,
  onClose,
}: FundPayrollFromAccountsModalProps) {
  const { data: session } = useSession()
  const toast = useToastContext()
  const [sources, setSources] = useState<CashBoxSource[]>([])
  const [amounts, setAmounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [voucher, setVoucher] = useState<PayrollFundingVoucherData | null>(null)

  const shortfall = Math.max(0, totalRequired - currentPayrollBalance)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/payroll/account/funding-sources', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          const loaded: CashBoxSource[] = data.data?.accounts ?? []
          setSources(loaded)
          // Auto-prefill proportionally to cover exactly the shortfall
          setAmounts(proportionalFill(loaded, shortfall))
        }
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [])

  const totalEntered = Object.values(amounts).reduce((s, v) => s + (v || 0), 0)
  const newPayrollBalance = currentPayrollBalance + totalEntered
  const totalAvailable = sources.reduce((s, b) => s + b.balance, 0)
  const isCovering = newPayrollBalance >= totalRequired

  const handleSubmit = async () => {
    const transfers = sources
      .map((s) => ({ businessId: s.id, amount: amounts[s.id] || 0 }))
      .filter((t) => t.amount > 0)

    if (transfers.length === 0) {
      toast.error('No amounts to transfer')
      return
    }

    for (const t of transfers) {
      const src = sources.find((s) => s.id === t.businessId)
      if (src && t.amount > src.balance) {
        toast.error(`Amount exceeds cash box balance for ${src.business?.name}`)
        return
      }
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/payroll/account/fund', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transfers }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.push(data.message || 'Payroll account funded successfully', { type: 'success' })
        onSuccess()
        // Build voucher data and show success screen
        const voucherData: PayrollFundingVoucherData = {
          voucherId: makeVoucherId(),
          issuedAt: new Date().toISOString(),
          issuedBy: (session?.user as any)?.name ?? 'System',
          totalAmount: totalEntered,
          lines: transfers.map((t) => ({
            businessName: sources.find((s) => s.id === t.businessId)?.business?.name ?? t.businessId,
            amount: t.amount,
          })),
        }
        setVoucher(voucherData)
      } else {
        toast.error(data.error || 'Transfer failed')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success / Voucher screen ──────────────────────────────────────────────
  if (voucher) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg flex flex-col">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 text-center">
            <div className="text-3xl mb-2">✅</div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Payroll Funded Successfully</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              ${voucher.totalAmount.toFixed(2)} transferred from {voucher.lines.length} cash box{voucher.lines.length > 1 ? 'es' : ''}
            </p>
          </div>

          {/* Withdrawal summary */}
          <div className="px-6 py-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Withdrawal Breakdown</p>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {voucher.lines.map((line) => (
                  <tr key={line.businessName}>
                    <td className="py-1.5 text-gray-700 dark:text-gray-300">{line.businessName} <span className="text-gray-400 text-xs">Cash Box</span></td>
                    <td className="py-1.5 text-right font-semibold text-gray-900 dark:text-gray-100">${line.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 dark:border-gray-600">
                  <td className="pt-2 font-bold text-gray-900 dark:text-gray-100">Total</td>
                  <td className="pt-2 text-right font-bold text-gray-900 dark:text-gray-100">${voucher.totalAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">Voucher ID: {voucher.voucherId}</p>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Done
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => generatePayrollFundingVoucher(voucher, 'save')}
                className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                💾 Save PDF
              </button>
              <button
                onClick={() => generatePayrollFundingVoucher(voucher, 'print')}
                className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                🖨️ Print Voucher
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Funding form ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">💵</span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Fund Payroll Account</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">From business cash box accounts — pre-filled proportionally</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Balance summary */}
        <div className="px-6 pt-4 flex-shrink-0">
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">🏦 In Account</p>
              <p className="font-bold text-blue-800 dark:text-blue-200">${currentPayrollBalance.toFixed(2)}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">Shortfall</p>
              <p className="font-bold text-red-800 dark:text-red-200">${shortfall.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Entering</p>
              <p className="font-bold text-gray-900 dark:text-gray-100">${totalEntered.toFixed(2)}</p>
            </div>
            <div className={`border rounded-lg px-3 py-2 ${isCovering ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'}`}>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">New Balance</p>
              <p className={`font-bold ${isCovering ? 'text-green-800 dark:text-green-200' : 'text-amber-800 dark:text-amber-200'}`}>
                ${newPayrollBalance.toFixed(2)}
              </p>
            </div>
          </div>
          {totalAvailable < shortfall && !loading && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              ⚠ Total available across all cash boxes (${totalAvailable.toFixed(2)}) is less than the shortfall. Partial funding only.
            </p>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Loading cash box balances...</p>
          ) : sources.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No business cash boxes with available balance found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2 font-medium">Business</th>
                  <th className="pb-2 font-medium text-right">Cash Box Balance</th>
                  <th className="pb-2 font-medium text-right">Transfer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {sources.map((src) => {
                  const entered = amounts[src.id] || 0
                  const isOver = entered > src.balance
                  return (
                    <tr key={src.id}>
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{src.business?.name ?? src.accountName}</p>
                        <p className="text-xs text-gray-400">Cash Box</p>
                      </td>
                      <td className="py-2.5 pr-3 text-right font-medium text-gray-900 dark:text-gray-100">
                        ${src.balance.toFixed(2)}
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="relative inline-block">
                          <span className="absolute left-2 top-2 text-gray-400 text-xs">$</span>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            max={src.balance}
                            value={entered === 0 ? '' : Math.ceil(entered)}
                            onChange={(e) => {
                              const val = Math.floor(parseFloat(e.target.value) || 0)
                              setAmounts((prev) => ({ ...prev, [src.id]: val }))
                            }}
                            className={`w-28 pl-5 pr-2 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 ${
                              isOver ? 'border-red-400 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="0"
                          />
                        </div>
                        {isOver && (
                          <p className="text-xs text-red-500 mt-0.5">Exceeds balance</p>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || totalEntered <= 0}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {submitting ? 'Transferring...' : `Fund $${totalEntered.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
