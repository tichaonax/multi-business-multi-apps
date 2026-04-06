'use client'

import { useState, useEffect } from 'react'

interface InsightsData {
  type: 'bale' | 'inventory'
  productType?: string
  name: string
  sku: string | null
  category: string | null
  purchasedAt: string
  stockedBy: string | null
  costPrice: number
  unitPrice: number
  itemCount: number
  remainingCount: number
  sold: number
  revenue: number
  bogoFreeGiven: number
  transferred: number
  profit: number
  profitPct: number
  costRecoveredPct: number
  bogoActive: boolean
  bogoHistory: Array<{
    action: string
    newRatio: number
    previousRatio: number | null
    changedAt: string
    changedBy: string
  }>
  salesByDay: Array<{ date: string; units: number; revenue: number }>
}

interface ItemInsightsPanelProps {
  type: 'bale' | 'inventory'
  itemId: string
  businessId: string
  onClose: () => void
  /** Pass productId (from sales analytics) to resolve via the API instead of itemId */
  productId?: string
}

export function ItemInsightsPanel({ type, itemId, businessId, onClose, productId }: ItemInsightsPanelProps) {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const url = productId
      ? `/api/inventory/item-insights?productId=${encodeURIComponent(productId)}&businessId=${businessId}`
      : `/api/inventory/item-insights?type=${type}&id=${itemId}&businessId=${businessId}`
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setData(json.data)
        } else {
          setError(json.error ?? 'Failed to load insights')
        }
      })
      .catch(() => setError('Failed to load insights'))
      .finally(() => setLoading(false))
  }, [type, itemId, businessId, productId])

  const maxUnits = data ? Math.max(data.itemCount, 1) : 1
  const soldPct = data ? (data.sold / maxUnits) * 100 : 0
  const bogoPct = data ? (data.bogoFreeGiven / maxUnits) * 100 : 0
  const transferredPct = data ? (data.transferred / maxUnits) * 100 : 0
  const remainingPct = data ? (data.remainingCount / maxUnits) * 100 : 0

  const maxDaySales = data
    ? Math.max(...data.salesByDay.map((d) => d.units), 1)
    : 1

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📈</span>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {loading ? 'Loading Insights…' : data?.name ?? 'Item Insights'}
              </h2>
            </div>
            {data && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {data.type === 'bale' ? '🎁 Bale' : data.productType === 'SERVICE' ? '⚙️ Service' : '📦 Inventory Item'}
                {data.sku && <> · SKU: <span className="font-mono">{data.sku}</span></>}
                {data.category && <> · {data.category}</>}
                {data.purchasedAt && <> · Added {data.purchasedAt}</>}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none ml-4 flex-shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
            </div>
          )}

          {error && (
            <div className="text-center py-10 text-red-500 dark:text-red-400">{error}</div>
          )}

          {data && (
            <>
              {/* Section 1 — Stock Flow Bar (hidden for services) */}
              {data.productType !== 'SERVICE' && <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  Stock Flow — {data.itemCount} total units
                </h3>
                <div className="flex rounded-full overflow-hidden h-5 w-full mb-2">
                  {soldPct > 0 && (
                    <div
                      style={{ width: `${soldPct}%` }}
                      className="bg-green-500"
                      title={`${data.sold} sold`}
                    />
                  )}
                  {bogoPct > 0 && (
                    <div
                      style={{ width: `${bogoPct}%` }}
                      className="bg-amber-400"
                      title={`${data.bogoFreeGiven} BOGO free`}
                    />
                  )}
                  {transferredPct > 0 && (
                    <div
                      style={{ width: `${transferredPct}%` }}
                      className="bg-blue-400"
                      title={`${data.transferred} transferred`}
                    />
                  )}
                  {remainingPct > 0 && (
                    <div
                      style={{ width: `${remainingPct}%` }}
                      className="bg-gray-200 dark:bg-gray-600"
                      title={`${data.remainingCount} remaining`}
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500" />
                    {data.sold} sold
                  </span>
                  {data.bogoFreeGiven > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-400" />
                      {data.bogoFreeGiven} BOGO free
                    </span>
                  )}
                  {data.transferred > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-400" />
                      {data.transferred} transferred
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm bg-gray-200 dark:bg-gray-600" />
                    {data.remainingCount} remaining
                  </span>
                </div>
              </div>}

              {/* Section 2 — Finance Cards */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  Cost &amp; Revenue
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">💰 Unit Cost</div>
                    <div className="text-base font-bold text-gray-900 dark:text-white">
                      ${data.costPrice.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">per item</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">🏷️ Selling Price</div>
                    <div className="text-base font-bold text-gray-900 dark:text-white">
                      ${data.unitPrice.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">per item</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">📦 Total Cost</div>
                    <div className="text-base font-bold text-gray-900 dark:text-white">
                      ${(data.costPrice * data.itemCount).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{data.itemCount} units</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">📈 Revenue</div>
                    <div className="text-base font-bold text-gray-900 dark:text-white">
                      ${data.revenue.toFixed(2)}
                    </div>
                  </div>
                  <div
                    className={`rounded-lg p-3 text-center ${
                      data.profit >= 0
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : 'bg-red-50 dark:bg-red-900/20'
                    }`}
                  >
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">📊 Profit/Loss</div>
                    <div
                      className={`text-base font-bold ${
                        data.profit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {data.profit >= 0 ? '+' : ''}${data.profit.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {data.profit >= 0 ? '🟢' : '🔴'} {Math.abs(data.profitPct).toFixed(1)}%
                    </div>
                  </div>
                  <div
                    className={`rounded-lg p-3 text-center ${
                      data.costRecoveredPct >= 100
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : data.costRecoveredPct >= 50
                        ? 'bg-yellow-50 dark:bg-yellow-900/20'
                        : 'bg-red-50 dark:bg-red-900/20'
                    }`}
                  >
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">🔄 Cost Recovery</div>
                    <div
                      className={`text-base font-bold ${
                        data.costRecoveredPct >= 100
                          ? 'text-green-700 dark:text-green-400'
                          : data.costRecoveredPct >= 50
                          ? 'text-yellow-700 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {data.costRecoveredPct.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3 — Daily Sales Chart */}
              {data.salesByDay.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                    Daily Sales ({data.salesByDay.length} day{data.salesByDay.length !== 1 ? 's' : ''})
                  </h3>
                  <div className="overflow-x-auto">
                    <div className="flex items-end gap-1 min-w-0 h-24">
                      {data.salesByDay.map((day) => {
                        const pct = (day.units / maxDaySales) * 100
                        return (
                          <div
                            key={day.date}
                            className="flex flex-col items-center flex-1 min-w-[20px] group relative"
                            title={`${day.date}: ${day.units} units, $${day.revenue.toFixed(2)}`}
                          >
                            <div
                              style={{ height: `${Math.max(pct, 4)}%` }}
                              className="w-full bg-purple-500 dark:bg-purple-400 rounded-t group-hover:bg-purple-700 dark:group-hover:bg-purple-300 transition-colors"
                            />
                            {/* tooltip */}
                            <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                              {day.date}: {day.units} units · ${day.revenue.toFixed(2)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>{data.salesByDay[0].date}</span>
                      {data.salesByDay.length > 1 && (
                        <span>{data.salesByDay[data.salesByDay.length - 1].date}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Section 4 — BOGO History (bale only) */}
              {data.type === 'bale' && data.bogoHistory.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                    BOGO History
                  </h3>
                  <div className="space-y-2">
                    {data.bogoHistory.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <span className="text-amber-500 flex-shrink-0">🎁</span>
                        <span>
                          <span className="font-medium">{h.action === 'ENABLED' ? 'Enabled' : 'Ratio changed'}</span>
                          {' '}to 1+{h.newRatio}
                          {h.previousRatio && h.action !== 'ENABLED' && (
                            <> (was 1+{h.previousRatio})</>
                          )}
                          <span className="text-gray-400"> · {h.changedAt} by {h.changedBy}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 5 — Breakdown Table */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  Breakdown
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                      <th className="text-left py-1.5 font-medium">Category</th>
                      <th className="text-right py-1.5 font-medium">Units</th>
                      <th className="text-right py-1.5 font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    <tr>
                      <td className="py-1.5 text-gray-700 dark:text-gray-300">✅ Paid Sales</td>
                      <td className="text-right text-gray-900 dark:text-white font-medium">{data.sold}</td>
                      <td className="text-right text-gray-900 dark:text-white font-medium">${data.revenue.toFixed(2)}</td>
                    </tr>
                    {data.bogoFreeGiven > 0 && (
                      <tr>
                        <td className="py-1.5 text-gray-700 dark:text-gray-300">🎁 BOGO Free</td>
                        <td className="text-right text-gray-900 dark:text-white font-medium">{data.bogoFreeGiven}</td>
                        <td className="text-right text-gray-400">—</td>
                      </tr>
                    )}
                    {data.transferred > 0 && (
                      <tr>
                        <td className="py-1.5 text-gray-700 dark:text-gray-300">🔁 Transferred</td>
                        <td className="text-right text-gray-900 dark:text-white font-medium">{data.transferred}</td>
                        <td className="text-right text-gray-400">—</td>
                      </tr>
                    )}
                    <tr>
                      <td className="py-1.5 text-gray-700 dark:text-gray-300">📦 Remaining</td>
                      <td className="text-right text-gray-900 dark:text-white font-medium">{data.remainingCount}</td>
                      <td className="text-right text-gray-400">—</td>
                    </tr>
                    <tr className="border-t-2 border-gray-200 dark:border-gray-600 font-semibold">
                      <td className="py-2 text-gray-900 dark:text-white">Total</td>
                      <td className="text-right text-gray-900 dark:text-white">{data.itemCount}</td>
                      <td className="text-right text-gray-900 dark:text-white">${data.revenue.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
