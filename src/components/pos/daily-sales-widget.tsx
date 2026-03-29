'use client'

import { useState } from 'react'
import { formatDate } from '@/lib/date-format'
import Link from 'next/link'

interface DailySalesData {
  businessDay: {
    date: string
    start: string
    end: string
  }
  summary: {
    totalOrders: number
    totalSales: number
    subtotal: number
    totalTax: number
    totalDiscount: number
    averageOrderValue: number
    receiptsIssued: number
  }
  paymentMethods: Record<string, { count: number; total: number }>
  employeeSales: Array<{
    name: string
    employeeNumber: string
    orders: number
    sales: number
  }>
  categoryBreakdown: Array<{
    name: string
    itemCount: number
    totalSales: number
  }>
  orderStatusBreakdown?: Record<string, { count: number; total: number }>
  hourlyBreakdown?: Array<{
    hour: number
    orders: number
    sales: number
  }>
}

interface DailySalesWidgetProps {
  dailySales: DailySalesData | null
  yesterdaySales?: any
  dayBeforeYesterdaySales?: any
  recentTransactions?: any[]
  loadingRecent?: boolean
  businessType?: string
  onRefresh?: () => void
  businessId?: string
  canCloseBooks?: boolean
  managerName?: string
}

export function DailySalesWidget({ dailySales, yesterdaySales, dayBeforeYesterdaySales, recentTransactions = [], loadingRecent = false, businessType = 'retail', onRefresh, businessId, canCloseBooks = false, managerName }: DailySalesWidgetProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [showRecentTransactions, setShowRecentTransactions] = useState(false)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [closingBooks, setClosingBooks] = useState(false)
  const [booksClosed, setBooksClosed] = useState(false)
  const [closeBooksError, setCloseBooksError] = useState<string | null>(null)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [payrollResult, setPayrollResult] = useState<{ amount: number; skipped: boolean; reason: string; targetAmount: number } | null>(null)

  if (!dailySales) {
    return null
  }

  const { summary, businessDay, paymentMethods, employeeSales, categoryBreakdown } = dailySales

  const cashData    = paymentMethods?.['CASH']    ?? paymentMethods?.['Cash']    ?? null
  const ecocashData = paymentMethods?.['ECOCASH'] ?? paymentMethods?.['Ecocash'] ?? paymentMethods?.['EcoCash'] ?? null
  const hasChannelBreakdown = cashData || ecocashData

  return (
    <div className="card bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 p-4 rounded-lg shadow">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-primary flex items-center gap-2">
          📈 Today's Sales
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
            ({formatDate(businessDay.start)} - {formatDate(businessDay.end)})
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-xs px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300"
              title="Refresh sales data"
            >
              🔄 Refresh
            </button>
          )}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
          >
            {showDetails ? '▼ Hide Details' : '▶ Show Details'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {!showDetails && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Sales</div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                ${summary.totalSales.toFixed(2)}
              </div>
              {yesterdaySales && (() => {
                const yVal = yesterdaySales.summary?.totalSales ?? 0
                const diff = summary.totalSales - yVal
                const pct = yVal > 0 ? (diff / yVal) * 100 : null
                return (
                  <div className={`text-xs mt-0.5 ${diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {diff >= 0 ? '↑' : '↓'} vs yesterday ${yVal.toFixed(2)}
                    {pct !== null && ` (${Math.abs(pct).toFixed(0)}%)`}
                  </div>
                )
              })()}
              {dayBeforeYesterdaySales && (() => {
                const dbVal = dayBeforeYesterdaySales.summary?.totalSales ?? 0
                const diff = summary.totalSales - dbVal
                const pct = dbVal > 0 ? (diff / dbVal) * 100 : null
                return (
                  <div className={`text-xs mt-0.5 ${diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {diff >= 0 ? '↑' : '↓'} vs 2 days ago ${dbVal.toFixed(2)}
                    {pct !== null && ` (${Math.abs(pct).toFixed(0)}%)`}
                  </div>
                )
              })()}
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Orders</div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {summary.totalOrders}
              </div>
              {yesterdaySales && (() => {
                const yOrders = yesterdaySales.summary?.totalOrders ?? 0
                const diff = summary.totalOrders - yOrders
                return (
                  <div className={`text-xs mt-0.5 ${diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {diff >= 0 ? '↑' : '↓'} {Math.abs(diff)} vs yesterday ({yOrders})
                  </div>
                )
              })()}
              {dayBeforeYesterdaySales && (() => {
                const dbOrders = dayBeforeYesterdaySales.summary?.totalOrders ?? 0
                const diff = summary.totalOrders - dbOrders
                return (
                  <div className={`text-xs mt-0.5 ${diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {diff >= 0 ? '↑' : '↓'} {Math.abs(diff)} vs 2 days ago ({dbOrders})
                  </div>
                )
              })()}
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Order</div>
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                ${summary.averageOrderValue.toFixed(2)}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Receipts</div>
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {summary.receiptsIssued}
              </div>
            </div>
          </div>

          {/* Cash / EcoCash breakdown */}
          {hasChannelBreakdown && (
            <div className="flex gap-2">
              {cashData && (
                <div className="flex-1 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-sm flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">💵 Cash</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">${cashData.total.toFixed(2)}</span>
                    <span className="text-xs text-gray-400 ml-1">({cashData.count} orders)</span>
                  </div>
                </div>
              )}
              {ecocashData && (
                <div className="flex-1 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-sm flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">📱 EcoCash</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">${ecocashData.total.toFixed(2)}</span>
                    <span className="text-xs text-gray-400 ml-1">({ecocashData.count} orders)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Collapsible Recent Orders (last 5) */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
            <button
              onClick={() => setShowRecentTransactions(v => !v)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">📋 Recent Orders</span>
              <div className="flex items-center gap-2">
                {loadingRecent
                  ? <span className="text-xs text-gray-400">loading...</span>
                  : <span className="text-xs text-gray-500 dark:text-gray-400">{recentTransactions.length} orders</span>
                }
                <span className={`text-xs text-gray-400 transition-transform duration-200 ${showRecentTransactions ? 'rotate-180' : ''}`}>▼</span>
              </div>
            </button>

            {showRecentTransactions && (
              <div className="divide-y divide-gray-100 dark:divide-gray-700 border-t border-gray-100 dark:border-gray-700">
                {recentTransactions.length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500 text-center">No orders yet today</div>
                )}
                {recentTransactions.map((order: any, index: number) => {
                  const isExpanded = expandedOrderId === order.id
                  const items = order.business_order_items || []
                  return (
                    <div key={order.id}>
                      <button
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`flex-shrink-0 text-xs text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>&#9654;</span>
                            <span className="flex-shrink-0 text-sm font-medium text-gray-900 dark:text-white">#{order.orderNumber}</span>
                            <span className={`flex-shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                              order.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : order.status === 'REFUNDED'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>{order.status}</span>
                            {index === 0 && <span className="flex-shrink-0 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium">latest</span>}
                            {!isExpanded && items.length > 0 && (() => {
                              const fi = items[0]
                              const fn = fi?.product_variants?.business_products?.name || fi?.attributes?.productName || fi?.notes
                              return fn ? (
                                <span className="text-xs text-gray-400 dark:text-gray-500 truncate">· {fi.quantity}× {fn}</span>
                              ) : null
                            })()}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 pl-5">
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {order.paymentMethod && <span className="ml-2">{order.paymentMethod}</span>}
                            {items.length > 0 && <span className="ml-2">{items.length} item{items.length > 1 ? 's' : ''}</span>}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-green-600 dark:text-green-400 whitespace-nowrap">
                          ${Number(order.totalAmount || 0).toFixed(2)}
                        </div>
                      </button>

                      {isExpanded && items.length > 0 && (
                        <div className="px-4 pb-3 pl-9">
                          <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-2 space-y-1">
                            {items.map((item: any, idx: number) => {
                              const name = item.product_variants?.business_products?.name
                                || item.attributes?.productName
                                || item.notes
                                || 'Item'
                              return (
                                <div key={item.id || idx} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                    <span className="text-gray-400">{item.quantity}×</span>
                                    <span>{name}</span>
                                  </div>
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    ${Number(item.totalPrice || 0).toFixed(2)}
                                  </span>
                                </div>
                              )
                            })}
                            <div className="border-t border-gray-200 dark:border-gray-600 pt-1 mt-1 flex justify-between text-xs font-bold text-gray-900 dark:text-white">
                              <span>Total</span>
                              <span>${Number(order.totalAmount || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detailed Breakdown (Collapsible) */}
      {showDetails && (
        <div className="space-y-3 mt-3">
          {/* Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Subtotal</div>
              <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                ${summary.subtotal.toFixed(2)}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tax</div>
              <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                ${summary.totalTax.toFixed(2)}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Discounts</div>
              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                ${summary.totalDiscount.toFixed(2)}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Sales</div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                ${summary.totalSales.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Cash / EcoCash breakdown */}
          {hasChannelBreakdown && (
            <div className="flex gap-2">
              {cashData && (
                <div className="flex-1 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-sm flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">💵 Cash</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">${cashData.total.toFixed(2)}</span>
                    <span className="text-xs text-gray-400 ml-1">({cashData.count} orders)</span>
                  </div>
                </div>
              )}
              {ecocashData && (
                <div className="flex-1 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-sm flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">📱 EcoCash</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">${ecocashData.total.toFixed(2)}</span>
                    <span className="text-xs text-gray-400 ml-1">({ecocashData.count} orders)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment Methods */}
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Payment Methods</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(paymentMethods).map(([method, data]: [string, any]) => (
                <div key={method} className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="text-xs text-gray-500 dark:text-gray-400">{method}</div>
                  <div className="text-sm font-bold text-primary">${data.total.toFixed(2)}</div>
                  <div className="text-xs text-gray-400">({data.count} orders)</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Categories */}
          {categoryBreakdown && categoryBreakdown.length > 0 && (
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Top Categories</h3>
              <div className="space-y-1">
                {categoryBreakdown.slice(0, 5).map((cat: any) => (
                  <div key={cat.name} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{cat.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({cat.itemCount} items)
                      </span>
                      <span className="font-semibold text-primary">${cat.totalSales.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Salespeople */}
          {employeeSales && employeeSales.length > 0 && (
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Top Salespeople
              </h3>
              <div className="space-y-1">
                {employeeSales.slice(0, 5).map((employee: any, index: number) => (
                  <div key={employee.name} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                      <span className="text-gray-700 dark:text-gray-300">{employee.name}</span>
                      {employee.employeeNumber && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({employee.employeeNumber})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {employee.orders} orders
                      </span>
                      <span className="font-semibold text-primary">${employee.sales.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 flex-wrap">
            <Link
              href={`/${businessType}/reports/end-of-day`}
              className="flex-1 text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              📊 Generate End-of-Day Report
            </Link>
            <Link
              href={`/${businessType}/reports/history`}
              className="flex-1 text-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              📅 View Report History
            </Link>
            {canCloseBooks && businessId && !booksClosed && (
              <>
                {!showCloseConfirm ? (
                  <button
                    onClick={() => setShowCloseConfirm(true)}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    🔒 Close Books for Today
                  </button>
                ) : (
                  <div className="w-full mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-400 mb-2 font-medium">
                      Close books for {businessDay.date}? This will prevent any more manual entries for this date.
                    </p>
                    {closeBooksError && (
                      <p className="text-sm text-red-600 mb-2">{closeBooksError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          setClosingBooks(true)
                          setCloseBooksError(null)
                          try {
                            const res = await fetch('/api/universal/close-books', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                businessId,
                                date: businessDay.date,
                                managerName: managerName || 'Manager',
                              }),
                            })
                            const data = await res.json()
                            if (!res.ok) {
                              setCloseBooksError(data.error || 'Failed to close books')
                            } else {
                              if (data.payrollContribution) setPayrollResult(data.payrollContribution)
                              setBooksClosed(true)
                              setShowCloseConfirm(false)
                            }
                          } catch {
                            setCloseBooksError('Network error')
                          } finally {
                            setClosingBooks(false)
                          }
                        }}
                        disabled={closingBooks}
                        className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                      >
                        {closingBooks ? 'Closing...' : 'Confirm Close'}
                      </button>
                      <button
                        onClick={() => { setShowCloseConfirm(false); setCloseBooksError(null) }}
                        className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            {booksClosed && (
              <div className="w-full mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center space-y-1">
                <div className="text-sm text-green-700 dark:text-green-400 font-medium">
                  🔒 Books closed for {businessDay.date}
                </div>
                {payrollResult && (
                  payrollResult.skipped ? (
                    <div className="text-xs text-amber-600 dark:text-amber-400">
                      💼 Payroll contribution skipped — {payrollResult.reason}
                      {payrollResult.targetAmount > 0 && ` (target: $${payrollResult.targetAmount})`}
                    </div>
                  ) : (
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      💼 Payroll auto-contribution: <span className="font-semibold">${payrollResult.amount}</span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
