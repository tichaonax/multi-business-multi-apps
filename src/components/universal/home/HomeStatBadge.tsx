'use client'

export interface OrderSummary {
  totalOrders: number
  totalAmount: number
  completedRevenue: number
  pendingRevenue: number
  pendingOrders: number
}

interface HomeStatBadgeProps {
  summary: OrderSummary | null
  loading: boolean
  variant: 'pos' | 'orders'
  canViewFinancials: boolean
}

const fmt = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)

/**
 * Inline stat badge for business home page POS/Orders quick-action cards.
 * Shows today's summary data; financial details only shown to users with
 * canAccessFinancialData permission.
 */
export function HomeStatBadge({ summary, loading, variant, canViewFinancials }: HomeStatBadgeProps) {
  if (loading) {
    return (
      <div className="mt-2 mb-2 space-y-1">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-28" />
        {canViewFinancials && <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20" />}
      </div>
    )
  }

  if (!summary) return null

  if (variant === 'pos') {
    return (
      <div className="mt-2 mb-2">
        {canViewFinancials ? (
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-green-600 dark:text-green-400">
              Today: {fmt(summary.totalAmount)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {summary.totalOrders} orders · Done: {fmt(summary.completedRevenue)}
            </p>
            {summary.pendingOrders > 0 && (
              <p className="text-xs text-orange-500 dark:text-orange-400">
                {summary.pendingOrders} pending · {fmt(summary.pendingRevenue)}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
            {summary.totalOrders} orders today
          </p>
        )}
      </div>
    )
  }

  // orders variant
  return (
    <div className="mt-2 mb-2">
      <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
        Today: {summary.totalOrders} orders
      </p>
      {canViewFinancials && summary.totalOrders > 0 && (
        <div className="space-y-0.5 mt-0.5">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Revenue: {fmt(summary.totalAmount)}
          </p>
          {summary.pendingOrders > 0 && (
            <p className="text-xs text-orange-500 dark:text-orange-400">
              {summary.pendingOrders} pending
            </p>
          )}
        </div>
      )}
    </div>
  )
}
