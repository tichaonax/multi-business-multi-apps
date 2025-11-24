interface Product {
  productName: string
  emoji: string
  unitsSold?: number
  revenue?: number
}

interface Category {
  categoryPath: string
  emoji: string
  revenue: number
}

interface SalesRep {
  employeeName: string
  revenue: number
}

interface TopPerformersCardsProps {
  topProductsByUnits: Product[]
  topProductsByRevenue: Product[]
  topCategories: Category[]
  topSalesReps: SalesRep[]
}

export function TopPerformersCards({
  topProductsByUnits,
  topProductsByRevenue,
  topCategories,
  topSalesReps
}: TopPerformersCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Top 3 Products by Units */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-4">
        <h3 className="text-sm font-bold text-purple-900 dark:text-purple-300 mb-3">
          Top 3 Products by Units Sold
        </h3>
        <div className="space-y-2">
          {topProductsByUnits.length > 0 ? (
            topProductsByUnits.map((product, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <span className="text-purple-700 dark:text-purple-400">
                  {product.emoji} {product.productName}
                </span>
                <span className="font-bold text-purple-900 dark:text-purple-200">
                  {product.unitsSold}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-purple-600 dark:text-purple-400">No data available</p>
          )}
        </div>
      </div>

      {/* Top 3 Products by $ */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-3">
          Top 3 Product by $
        </h3>
        <div className="space-y-2">
          {topProductsByRevenue.length > 0 ? (
            topProductsByRevenue.map((product, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <span className="text-blue-700 dark:text-blue-400">
                  {product.emoji} {product.productName}
                </span>
                <span className="font-bold text-blue-900 dark:text-blue-200">
                  ${product.revenue?.toFixed(2)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-blue-600 dark:text-blue-400">No data available</p>
          )}
        </div>
      </div>

      {/* Top Category */}
      <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-4">
        <h3 className="text-sm font-bold text-green-900 dark:text-green-300 mb-3">
          Top Category
        </h3>
        <div className="space-y-2">
          {topCategories.length > 0 ? (
            topCategories.map((category, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <span className="text-green-700 dark:text-green-400">
                  {category.emoji} {category.categoryPath}
                </span>
                <span className="font-bold text-green-900 dark:text-green-200">
                  ${category.revenue.toFixed(2)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-green-600 dark:text-green-400">No data available</p>
          )}
        </div>
      </div>

      {/* Top Sales Rep */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h3 className="text-sm font-bold text-yellow-900 dark:text-yellow-300 mb-3">
          Top Sales Rep
        </h3>
        <div className="space-y-2">
          {topSalesReps.length > 0 ? (
            topSalesReps.map((rep, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <span className="text-yellow-700 dark:text-yellow-400">
                  {rep.employeeName}
                </span>
                <span className="font-bold text-yellow-900 dark:text-yellow-200">
                  ${rep.revenue.toFixed(2)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-yellow-600 dark:text-yellow-400">No data available</p>
          )}
        </div>
      </div>
    </div>
  )
}
