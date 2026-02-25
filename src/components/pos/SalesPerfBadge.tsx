'use client'

export interface SalesPerfThresholds {
  /** Sales amount at which status becomes Fair (amber). Below this = Low (red). */
  fairMin: number
  /** Sales amount at which status becomes Good (green). */
  goodMin: number
  /** Sales amount at which the progress bar fills to 100%. */
  maxBar: number
}

export const DEFAULT_SALES_PERF_THRESHOLDS: SalesPerfThresholds = {
  fairMin: 100,
  goodMin: 150,
  maxBar: 200,
}

interface SalesPerfBadgeProps {
  sales: number
  size?: 'sm' | 'md'
  thresholds?: SalesPerfThresholds
}

export function SalesPerfBadge({
  sales,
  size = 'md',
  thresholds = DEFAULT_SALES_PERF_THRESHOLDS,
}: SalesPerfBadgeProps) {
  const isGreen = sales >= thresholds.goodMin
  const isAmber = sales >= thresholds.fairMin
  const emoji = isGreen ? '🟢' : isAmber ? '🟡' : '🔴'
  const label = isGreen ? 'Good' : isAmber ? 'Fair' : 'Low'
  const barColor = isGreen
    ? 'bg-green-500'
    : isAmber
    ? 'bg-amber-400'
    : 'bg-red-500'
  const textColor = isGreen
    ? 'text-green-600 dark:text-green-400'
    : isAmber
    ? 'text-amber-500 dark:text-amber-400'
    : 'text-red-500'
  const fillPct = Math.min(100, (sales / thresholds.maxBar) * 100)

  if (size === 'sm') {
    return (
      <span
        className="inline-flex items-center gap-0.5 flex-shrink-0"
        title={`${label} ($${sales.toFixed(2)})`}
      >
        <span className="text-[10px] leading-none">{emoji}</span>
      </span>
    )
  }

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <span className="text-sm leading-none">{emoji}</span>
      <div className="w-14 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${fillPct}%` }}
        />
      </div>
      <span className={`text-xs font-semibold ${textColor}`}>{label}</span>
    </div>
  )
}
