'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import ReceiptSearchBar from '@/components/receipts/receipt-search-bar'
import ReceiptDetailModal from '@/components/receipts/receipt-detail-modal'
import CrossBusinessAlert from '@/components/receipts/cross-business-alert'
import { ManagerOverrideModal, type OrderSummary as CancelOrderSummary } from '@/components/manager-override/manager-override-modal'
import { getLocalDateString } from '@/lib/utils'
import { useTimeDisplay } from '@/hooks/use-time-display'
import { ContentLayout } from '@/components/layout/content-layout'

interface ReceiptListItem {
  id: string
  orderNumber: string
  customerId: string | null
  customerName: string
  customerPhone: string | null
  salespersonName: string | null
  totalAmount: number
  discountAmount: number
  rewardCouponCode: string | null
  mealProgram?: boolean
  hasCombo?: boolean
  businessType: string
  paymentMethod: string | null
  status: string
  createdAt: string
  cancellationOutcome: 'CANCELLED' | 'DENIED' | null
  refundAmount: number | null
}

interface PaginationInfo {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export default function ReceiptHistoryPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
      <ReceiptHistoryPageContent />
    </Suspense>
  )
}

function ReceiptHistoryPageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [receipts, setReceipts] = useState<ReceiptListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [crossBusinessResults, setCrossBusinessResults] = useState<any[]>([])
  const [showCrossBusinessAlert, setShowCrossBusinessAlert] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<CancelOrderSummary | null>(null)
  const [cancelBusinessId, setCancelBusinessId] = useState<string>('')
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelLoading, setCancelLoading] = useState<string | null>(null) // receiptId being loaded
  const [dateFrom, setDateFrom] = useState('')       // ISO yyyy-mm-dd for API
  const [dateTo, setDateTo] = useState('')         // ISO yyyy-mm-dd for API
  const [dateFromDisplay, setDateFromDisplay] = useState('') // dd/mm/yyyy for input
  const [dateToDisplay, setDateToDisplay] = useState('')     // dd/mm/yyyy for input
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom' | ''>('')
  const { useServerTime } = useTimeDisplay()

  // Get businessId from URL params or localStorage
  useEffect(() => {
    const urlBusinessId = searchParams.get('businessId')
    const storedBusinessId = localStorage.getItem('lastAccessedBusinessId')
    setBusinessId(urlBusinessId || storedBusinessId || null)
  }, [searchParams])

  // Cross-business search
  const searchAcrossBusinesses = useCallback(async (query: string) => {
    try {
      const response = await fetch(
        `/api/universal/receipts/cross-business-search?query=${encodeURIComponent(query)}`
      )
      const data = await response.json()

      if (response.ok && data.results && data.results.length > 0) {
        setCrossBusinessResults(data.results)
        setShowCrossBusinessAlert(true)
      }
    } catch (err) {
      console.error('Cross-business search failed:', err)
    }
  }, [])

  // Fetch receipts
  const fetchReceipts = useCallback(async (query = '', offset = 0, from = dateFrom, to = dateTo) => {
    if (!businessId) {
      setError('Please select a business first')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        businessId,
        limit: '50',
        offset: offset.toString(),
      })

      if (query) {
        params.append('query', query)
      }
      if (from) {
        params.append('startDate', from)
      }
      if (to) {
        // set to end of day
        params.append('endDate', `${to}T23:59:59`)
      }

      const response = await fetch(`/api/universal/receipts/search?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch receipts')
      }

      setReceipts(data.orders || [])
      setPagination(data.pagination)

      // If no results and query looks like receipt number, try cross-business search
      if (data.orders.length === 0 && query && query.length >= 4) {
        await searchAcrossBusinesses(query)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [businessId, searchAcrossBusinesses, dateFrom, dateTo])

  // Initial load - only run once when businessId changes
  useEffect(() => {
    if (businessId) {
      fetchReceipts('', 0)
    }
  }, [businessId, fetchReceipts])

  // Handle search - memoized to prevent infinite loops
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    fetchReceipts(query, 0)
  }, [fetchReceipts])

  // Convert ISO date (yyyy-mm-dd) → display format (dd/mm/yyyy)
  function isoToDisplay(iso: string): string {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    if (!y || !m || !d) return iso
    return `${d}/${m}/${y}`
  }

  // Convert display format (dd/mm/yyyy) → ISO (yyyy-mm-dd); returns '' if invalid/incomplete
  function displayToIso(display: string): string {
    if (!display) return ''
    const parts = display.split('/')
    if (parts.length !== 3) return ''
    const [d, m, y] = parts
    if (!d || !m || !y || y.length !== 4) return ''
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    const date = new Date(iso)
    return isNaN(date.getTime()) ? '' : iso
  }

  // Apply a date preset
  function applyPreset(preset: 'today' | 'yesterday' | 'week' | 'month') {
    const now = new Date()
    const today = getLocalDateString(now)
    let from = today
    let to = today
    if (preset === 'yesterday') {
      const d = new Date(now)
      d.setDate(d.getDate() - 1)
      from = getLocalDateString(d)
      to = from
    } else if (preset === 'week') {
      const d = new Date(now)
      d.setDate(d.getDate() - 6)
      from = getLocalDateString(d)
    } else if (preset === 'month') {
      from = `${today.slice(0, 7)}-01`
    }
    setDateFrom(from)
    setDateTo(to)
    setDateFromDisplay(isoToDisplay(from))
    setDateToDisplay(isoToDisplay(to))
    setDatePreset(preset)
    fetchReceipts(searchQuery, 0, from, to)
  }

  function clearDates() {
    setDateFrom('')
    setDateTo('')
    setDateFromDisplay('')
    setDateToDisplay('')
    setDatePreset('')
    fetchReceipts(searchQuery, 0, '', '')
  }

  // Handle receipt click
  const handleReceiptClick = (receiptId: string) => {
    setSelectedReceiptId(receiptId)
    setShowDetailModal(true)
  }

  // Fetch order details and open cancel modal directly
  const handleCancelClick = useCallback(async (receiptId: string) => {
    setCancelError(null)
    setCancelLoading(receiptId)
    try {
      const res = await fetch(`/api/universal/receipts/${receiptId}`)
      const data = await res.json()
      if (!res.ok) { setCancelError(data.error || 'Failed to load order'); return }
      const order = data.order
      const isEcocash = (order.paymentMethod || '').toUpperCase() === 'ECOCASH'
      const ecocashFee = isEcocash ? Number(order.attributes?.ecocashFeeAmount ?? 0) : 0
      setCancelBusinessId(order.businessId || '')
      setCancelTarget({
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: Number(order.totalAmount),
        paymentMethod: order.paymentMethod || 'CASH',
        createdAt: order.createdAt,
        isEcocash,
        refundAmount: isEcocash ? Number(order.totalAmount) - ecocashFee * 2 : Number(order.totalAmount),
      })
    } catch { setCancelError('Connection error') } finally { setCancelLoading(null) }
  }, [])

  // Handle cross-business selection
  const handleCrossBusinessSelect = (result: any) => {
    setShowCrossBusinessAlert(false)
    if (result.orders && result.orders.length > 0) {
      const firstOrder = result.orders[0]
      handleReceiptClick(firstOrder.id)
    }
  }

  // Format currency
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num)
  }

  // Returns true if the order was placed today (local date)
  const isSameDayOrder = (createdAt: string) => {
    const d = new Date(createdAt)
    const t = new Date()
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
  }

  // Format date — server time shows UTC, local shows workstation timezone
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (useServerTime) {
      return date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      }) + ' UTC'
    }
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <ContentLayout title="Receipt History" subtitle="Search and reprint past receipts">
      <div className="max-w-6xl mx-auto">

        {/* Search Bar */}
        <div className="mb-4">
          <ReceiptSearchBar onSearch={handleSearch} loading={loading} />
        </div>

        {/* Date Filters */}
        <div className="mb-6 flex flex-wrap items-end gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          {/* Presets */}
          <div className="flex gap-2">
            {(['today', 'yesterday', 'week', 'month'] as const).map((p) => (
              <button
                key={p}
                onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  datePreset === p
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                {p === 'today' ? 'Today' : p === 'yesterday' ? 'Yesterday' : p === 'week' ? 'Last 7 Days' : 'This Month'}
              </button>
            ))}
          </div>
          {/* Date pickers */}
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  const iso = e.target.value
                  setDateFrom(iso)
                  // If no end date yet, or end is before new start, sync end to start
                  const newTo = (!dateTo || iso > dateTo) ? iso : dateTo
                  setDateTo(newTo)
                  setDateFromDisplay(isoToDisplay(iso))
                  setDateToDisplay(isoToDisplay(newTo))
                  setDatePreset('custom')
                  fetchReceipts(searchQuery, 0, iso, newTo)
                }}
                className="px-2 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => {
                  const iso = e.target.value
                  setDateTo(iso)
                  setDateToDisplay(isoToDisplay(iso))
                  setDatePreset('custom')
                  fetchReceipts(searchQuery, 0, dateFrom, iso)
                }}
                className="px-2 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
            {(dateFrom || dateTo) && (
              <button
                onClick={clearDates}
                className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Receipts List */}
        {!loading && receipts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Receipt #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Salesperson
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {receipts.map((receipt) => (
                  <tr
                    key={receipt.id}
                    onClick={() => handleReceiptClick(receipt.id)}
                    className={`cursor-pointer transition-colors ${
                      receipt.cancellationOutcome === 'CANCELLED'
                        ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20'
                        : receipt.cancellationOutcome === 'DENIED'
                        ? 'bg-orange-50 dark:bg-orange-900/10 hover:bg-orange-100 dark:hover:bg-orange-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {receipt.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      <div>{receipt.customerName}</div>
                      {receipt.customerPhone && receipt.customerName !== 'Walk-in Customer' && (
                        <div className="text-xs text-gray-400 dark:text-gray-500">{receipt.customerPhone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {receipt.salespersonName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                      <div>{formatCurrency(receipt.totalAmount)}</div>
                      {receipt.cancellationOutcome === 'CANCELLED' && receipt.refundAmount != null && (
                        <div className="text-xs text-red-600 dark:text-red-400 font-normal">
                          Refunded: {formatCurrency(receipt.refundAmount)}
                        </div>
                      )}
                      {receipt.mealProgram && (
                        <div className="text-xs text-amber-600 dark:text-amber-400 font-normal">🍱 Meal Program</div>
                      )}
                      {!receipt.mealProgram && receipt.rewardCouponCode && (
                        <div className="text-xs text-green-600 dark:text-green-400 font-normal">🎁 {receipt.rewardCouponCode}</div>
                      )}
                      {!receipt.mealProgram && !receipt.rewardCouponCode && receipt.discountAmount > 0 && (
                        <div className="text-xs text-green-600 dark:text-green-400 font-normal">-{formatCurrency(receipt.discountAmount)} discount</div>
                      )}
                      {receipt.hasCombo && (
                        <div className="text-xs font-normal mt-0.5">
                          <span className="inline-flex items-center gap-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-semibold">
                            ✦ Combo
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {formatDate(receipt.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          receipt.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}
                      >
                        {receipt.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {receipt.cancellationOutcome === 'CANCELLED' ? (
                        <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400 rounded-lg">
                          Refunded
                        </span>
                      ) : receipt.cancellationOutcome === 'DENIED' ? (
                        <span className="px-2 py-1 text-xs font-medium text-orange-700 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 rounded-lg">
                          Denied
                        </span>
                      ) : receipt.status === 'COMPLETED' && isSameDayOrder(receipt.createdAt) ? (
                        <button
                          onClick={() => handleCancelClick(receipt.id)}
                          disabled={cancelLoading === receipt.id}
                          className="px-3 py-1 text-xs font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {cancelLoading === receipt.id ? '…' : 'Cancel / Refund'}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination && pagination.hasMore && (
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => fetchReceipts(searchQuery, pagination.offset + pagination.limit, dateFrom, dateTo)}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                >
                  Load More ({pagination.total - pagination.offset - pagination.limit} remaining)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && receipts.length === 0 && !error && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No receipts found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery
                ? 'Try a different search term'
                : 'Start by creating an order'}
            </p>
          </div>
        )}
      </div>

      {/* Cancel error toast */}
      {cancelError && (
        <div className="fixed bottom-4 right-4 z-[200] bg-red-600 text-white px-4 py-2 rounded-lg text-sm shadow-lg">
          {cancelError}
          <button onClick={() => setCancelError(null)} className="ml-2 font-bold">×</button>
        </div>
      )}

      {/* Manager Override / Cancel modal */}
      {cancelTarget && (
        <ManagerOverrideModal
          order={cancelTarget}
          businessId={cancelBusinessId}
          onApproved={async (managerId, _managerName, finalRefundAmount, staffReason) => {
            try {
              const res = await fetch(`/api/orders/${cancelTarget.orderId}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ managerId, staffReason, finalRefundAmount, businessId: cancelBusinessId }),
              })
              const data = await res.json()
              if (!res.ok) { setCancelError(data.error || 'Could not cancel order'); setCancelTarget(null); return }
              setCancelTarget(null)
              fetchReceipts(searchQuery, 0) // Refresh list to show CANCELLED status
            } catch { setCancelError('Connection error'); setCancelTarget(null) }
          }}
          onAborted={() => setCancelTarget(null)}
        />
      )}

      {/* Modals */}
      {showDetailModal && selectedReceiptId && (
        <ReceiptDetailModal
          receiptId={selectedReceiptId}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedReceiptId(null)
          }}
        />
      )}

      {showCrossBusinessAlert && crossBusinessResults.length > 0 && (
        <CrossBusinessAlert
          results={crossBusinessResults}
          onSelect={handleCrossBusinessSelect}
          onClose={() => setShowCrossBusinessAlert(false)}
        />
      )}
    </ContentLayout>
  )
}
