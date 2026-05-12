'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { formatCurrency } from '@/lib/date-format'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { getCategoryEmoji } from '@/lib/category-emojis'
import ReceiptDetailModal from '@/components/receipts/receipt-detail-modal'

interface OrderItem {
  id: string
  productVariantId: string | null
  quantity: number
  unitPrice: number
  discountAmount: number
  totalPrice: number
  productName: string
  variantName: string
  attributes: any
}

interface Order {
  id: string
  orderNumber: string
  createdAt: string
  totalAmount: number
  paymentMethod: string
  status: string
  business_customers: { id: string; name: string; customerNumber: string } | null
  employees: { id: string; fullName: string; employeeNumber: string } | null
  items: OrderItem[]
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  ECOCASH: 'EcoCash',
  CARD: 'Card',
  MOBILE_MONEY: 'Mobile Money',
  BANK_TRANSFER: 'Bank Transfer',
  STORE_CREDIT: 'Store Credit',
  LAYAWAY: 'Layaway',
  NET_30: 'Net 30',
}

function paymentBadge(method: string) {
  const label = PAYMENT_LABELS[method] ?? method
  if (method === 'CASH') return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">{label}</span>
  if (method === 'ECOCASH') return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">{label}</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">{label}</span>
}

function statusBadge(status: string) {
  if (status === 'COMPLETED') return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">Completed</span>
  if (status === 'PENDING') return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">Pending</span>
  if (status === 'CANCELLED') return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Cancelled</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">{status}</span>
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getItemEmoji(item: OrderItem): string {
  if (item.attributes?.emoji) return item.attributes.emoji
  if (item.attributes?.categoryName) return getCategoryEmoji(item.attributes.categoryName)
  return getCategoryEmoji(item.productName)
}

function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <p className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100">{order.orderNumber}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {formatTime(order.createdAt)} · {formatDate(order.createdAt)}
              {order.employees?.fullName && <span className="ml-2">· {order.employees.fullName}</span>}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none p-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {order.items.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No item details available</p>
          ) : (
            <ul className="space-y-2">
              {order.items.map(item => (
                <li key={item.id} className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span className="text-2xl leading-none mt-0.5 flex-shrink-0">{getItemEmoji(item)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.productName}</p>
                    {item.variantName && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.variantName}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {item.quantity} × {formatCurrency(Number(item.unitPrice))}
                      {Number(item.discountAmount) > 0 && (
                        <span className="ml-1 text-red-500">−{formatCurrency(Number(item.discountAmount))}</span>
                      )}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">{formatCurrency(Number(item.totalPrice))}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-2xl sm:rounded-b-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {paymentBadge(order.paymentMethod)}
              {statusBadge(order.status)}
            </div>
            <p className="text-base font-bold text-gray-900 dark:text-gray-100">{formatCurrency(Number(order.totalAmount))}</p>
          </div>
          {order.business_customers && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Customer: {order.business_customers.name} #{order.business_customers.customerNumber}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function OrdersPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { currentBusinessId, currentBusiness } = useBusinessPermissionsContext()

  const initFrom = searchParams.get('from')
  const initTo = searchParams.get('to')

  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    start: initFrom ? new Date(initFrom) : new Date(Date.now() - 24 * 60 * 60 * 1000),
    end: initTo ? new Date(initTo) : new Date(),
  }))
  const [allTime, setAllTime] = useState(false)
  const [search, setSearch] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [meta, setMeta] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [receiptOrderId, setReceiptOrderId] = useState<string | null>(null)

  const businessId = searchParams.get('businessId') || currentBusinessId

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ businessId, limit: '200', includeItems: 'true' })
      if (!allTime) {
        const start = new Date(dateRange.start)
        start.setHours(0, 0, 0, 0)
        const end = new Date(dateRange.end)
        end.setHours(23, 59, 59, 999)
        params.set('startDate', start.toISOString())
        params.set('endDate', end.toISOString())
      }
      const res = await fetch(`/api/universal/orders?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setOrders(json.data || [])
      setMeta(json.meta || null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [businessId, dateRange, allTime])

  useEffect(() => { load() }, [load])

  const filtered = orders.filter(o => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      o.orderNumber?.toLowerCase().includes(q) ||
      o.business_customers?.name?.toLowerCase().includes(q) ||
      o.business_customers?.customerNumber?.toLowerCase().includes(q) ||
      o.employees?.fullName?.toLowerCase().includes(q) ||
      o.paymentMethod?.toLowerCase().includes(q)
    )
  })

  const cashTotal = filtered.filter(o => o.paymentMethod === 'CASH' && o.status === 'COMPLETED').reduce((s, o) => s + Number(o.totalAmount), 0)
  const ecocashTotal = filtered.filter(o => o.paymentMethod === 'ECOCASH' && o.status === 'COMPLETED').reduce((s, o) => s + Number(o.totalAmount), 0)
  const grandTotal = filtered.filter(o => o.status === 'COMPLETED').reduce((s, o) => s + Number(o.totalAmount), 0)

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-4">
          <button
            onClick={() => router.back()}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">Orders Report</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            {currentBusiness?.businessName} — orders for the selected period
          </p>
        </div>

        {/* Date range selector */}
        <DateRangeSelector
          value={dateRange}
          onChange={range => { setAllTime(false); setDateRange(range) }}
          showAllTime
          allTime={allTime}
          onAllTimeChange={setAllTime}
        />

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by order number, customer name, employee..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Summary cards */}
        {!loading && (
          <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Orders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{filtered.length}</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(grandTotal)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Cash</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(cashTotal)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">EcoCash</p>
              <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{formatCurrency(ecocashTotal)}</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-4 text-sm text-red-800 dark:text-red-200">{error}</div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-lg font-semibold">No orders found</p>
            <p className="text-sm mt-1">Try adjusting the date range or search term.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Order #</th>
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Date / Time</th>
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Customer</th>
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Employee</th>
                  <th className="text-center p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Payment</th>
                  <th className="text-center p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Status</th>
                  <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Amount</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr
                    key={o.id}
                    className="border-b border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
                    onClick={() => setSelectedOrder(o)}
                  >
                    <td className="p-3 font-mono text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">{o.orderNumber}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="text-gray-900 dark:text-gray-100 font-medium">{formatTime(o.createdAt)}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">{formatDate(o.createdAt)}</span>
                    </td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">
                      {o.business_customers ? (
                        <span>{o.business_customers.name}<span className="text-xs text-gray-400 ml-1">#{o.business_customers.customerNumber}</span></span>
                      ) : <span className="text-gray-400 text-xs">Walk-in</span>}
                    </td>
                    <td className="p-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {o.employees?.fullName ?? <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="p-3 text-center">{paymentBadge(o.paymentMethod)}</td>
                    <td className="p-3 text-center">{statusBadge(o.status)}</td>
                    <td className="p-3 text-right font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">{formatCurrency(Number(o.totalAmount))}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={e => { e.stopPropagation(); setReceiptOrderId(o.id) }}
                        className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="View receipt"
                      >
                        🧾
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <td colSpan={6} className="p-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Grand Total (completed):</td>
                  <td className="p-3 text-right font-bold text-gray-900 dark:text-gray-100">{formatCurrency(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Order detail modal */}
      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}

      {/* Receipt detail modal */}
      {receiptOrderId && (
        <ReceiptDetailModal
          receiptId={receiptOrderId}
          onClose={() => setReceiptOrderId(null)}
        />
      )}
    </div>
  )
}

export default function OrdersReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>}>
      <OrdersPageInner />
    </Suspense>
  )
}
