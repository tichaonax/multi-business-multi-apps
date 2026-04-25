'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { formatPhoneNumberForDisplay } from '@/lib/country-codes'

type Row = {
  orderNumber: string
  orderId: string
  status: string
  paymentMode: string
  paymentCollected: string | null
  paymentCollectedAt: string | null
  collectedByName: string | null
  returnReason: string | null
  creditUsed: string
  customerName: string | null
  customerPhone: string | null
  createdAt: string
  orderTotal: string
}

type Summary = {
  totalOrders: number
  delivered: number
  returned: number
  pending: number
  totalDue: number
  totalCollected: number
  totalShortfall: number
  uncaptured: number
}

const STATUS_COLOR: Record<string, string> = {
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  RETURNED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  DISPATCHED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  READY: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
}

export default function DeliveryPaymentsPage() {
  const { currentBusinessId } = useBusinessPermissionsContext()
  const [date, setDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [rows, setRows] = useState<Row[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingPayment, setEditingPayment] = useState<string | null>(null) // orderId being edited
  const [editValue, setEditValue] = useState('')
  const [savingPayment, setSavingPayment] = useState<string | null>(null)

  const saveCollected = async (orderId: string) => {
    const amount = parseFloat(editValue)
    if (isNaN(amount) || amount < 0) return
    setSavingPayment(orderId)
    try {
      const res = await fetch(`/api/restaurant/delivery/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentCollected: amount }),
      })
      if (res.ok) {
        setEditingPayment(null)
        load()
      }
    } finally {
      setSavingPayment(null)
    }
  }

  const load = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/restaurant/delivery/payments?businessId=${currentBusinessId}&date=${date}`)
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed')
      setRows(data.rows)
      setSummary(data.summary)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, date])

  useEffect(() => { load() }, [load])

  const fmt = (n: number) => `$${n.toFixed(2)}`

  return (
    <BusinessTypeRoute requiredBusinessType="restaurant">
      <ContentLayout title="Delivery Payment Reconciliation">
        <div className="space-y-6">
          {/* Date picker */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={load}
              className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:opacity-90"
            >
              Refresh
            </button>
          </div>

          {/* Summary cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SummaryCard label="Delivered" value={summary.delivered} sub={`of ${summary.totalOrders} orders`} color="text-green-600 dark:text-green-400" />
              <SummaryCard label="Returned" value={summary.returned} sub="could not deliver" color="text-orange-500 dark:text-orange-400" />
              <SummaryCard label="Total Due" value={fmt(summary.totalDue)} sub="from delivered orders" color="text-gray-700 dark:text-gray-300" />
              <SummaryCard
                label="Collected"
                value={fmt(summary.totalCollected)}
                sub={summary.totalShortfall > 0.005 ? `Shortfall: ${fmt(summary.totalShortfall)}` : summary.uncaptured > 0 ? `${summary.uncaptured} not captured` : 'Fully reconciled'}
                color={summary.totalShortfall > 0.005 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}
              />
            </div>
          )}

          {/* Error */}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Table */}
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No delivery orders for this date.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Order</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Due</th>
                    <th className="px-4 py-3 text-right">Collected</th>
                    <th className="px-4 py-3 text-right">Shortfall</th>
                    <th className="px-4 py-3 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {rows.map(row => {
                    const total = Number(row.orderTotal)
                    const due = Math.max(0, total - Number(row.creditUsed || 0))
                    const collected = row.paymentCollected != null ? Number(row.paymentCollected) : null
                    const shortfall = collected != null ? due - collected : null
                    return (
                      <tr key={row.orderId} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-300">{row.orderNumber}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          <div>{row.customerName || '—'}</div>
                          {row.customerPhone && <div className="text-xs text-gray-400">{formatPhoneNumberForDisplay(row.customerPhone)}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[row.status] || ''}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{fmt(total)}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 font-medium">{row.status === 'DELIVERED' ? fmt(due) : '—'}</td>
                        <td className="px-4 py-3 text-right">
                          {row.status === 'DELIVERED' ? (
                            editingPayment === row.orderId ? (
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-gray-400 text-xs">$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  autoFocus
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') saveCollected(row.orderId); if (e.key === 'Escape') setEditingPayment(null) }}
                                  className="w-20 px-1.5 py-0.5 text-sm border border-blue-400 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-right focus:outline-none"
                                />
                                <button onClick={() => saveCollected(row.orderId)} disabled={savingPayment === row.orderId} className="text-xs text-green-600 hover:text-green-700 font-bold disabled:opacity-50">✓</button>
                                <button onClick={() => setEditingPayment(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEditingPayment(row.orderId); setEditValue(collected != null ? collected.toFixed(2) : '') }}
                                className="group text-right w-full"
                                title="Click to record collected amount"
                              >
                                {collected != null
                                  ? <span className={`${collected >= due ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'} group-hover:underline`}>{fmt(collected)}</span>
                                  : <span className="text-blue-500 dark:text-blue-400 italic text-xs group-hover:underline">+ Record</span>
                                }
                              </button>
                            )
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {shortfall != null && shortfall > 0.005
                            ? <span className="text-red-600 dark:text-red-400 font-medium">{fmt(shortfall)}</span>
                            : shortfall != null
                            ? <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] space-y-0.5">
                          {row.returnReason && <div className="text-orange-500">Return: {row.returnReason}</div>}
                          {Number(row.creditUsed) > 0 && <div>Credit: ${Number(row.creditUsed).toFixed(2)}</div>}
                          {row.collectedByName && collected != null && (
                            <div className="text-gray-500 dark:text-gray-400">
                              Recorded by: <span className="font-medium text-gray-600 dark:text-gray-300">{row.collectedByName}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ContentLayout>
    </BusinessTypeRoute>
  )
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color || 'text-gray-800 dark:text-gray-200'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
