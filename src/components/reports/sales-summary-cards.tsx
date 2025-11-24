interface SalesSummaryCardsProps {
  totalSales: number
  totalTax: number
  averageOrderValue: number
}

export function SalesSummaryCards({
  totalSales,
  totalTax,
  averageOrderValue
}: SalesSummaryCardsProps) {
  return (
    <div className="space-y-4">
      {/* Total Sales Card */}
      <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">
          Total Sales
        </h3>
        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
          ${totalSales.toFixed(2)}
        </p>
      </div>

      {/* Taxes Collected Card */}
      <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
          Taxes Collected for period
        </h3>
        <p className="text-3xl font-bold text-red-600 dark:text-red-400">
          ${totalTax.toFixed(2)}
        </p>
      </div>

      {/* Average Per Order Card */}
      <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-2">
          Average Per Order
        </h3>
        <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
          ${averageOrderValue.toFixed(2)}
        </p>
      </div>
    </div>
  )
}
