import { OrderFilters as OrderFiltersType } from './types'
import { BUSINESS_ORDER_CONFIGS } from './BusinessOrderConfig'

interface OrderFiltersProps {
  filters: OrderFiltersType
  onFiltersChange: (filters: OrderFiltersType) => void
  businessType: string
}

export function OrderFilters({ filters, onFiltersChange, businessType }: OrderFiltersProps) {
  const config = BUSINESS_ORDER_CONFIGS[businessType]

  const updateFilter = (key: keyof OrderFiltersType, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-2">
            Status
          </label>
          <select
            value={filters.status || ''}
            onChange={(e) => updateFilter('status', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Statuses</option>
            {config.statuses.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-2">
            Date Range
          </label>
          <select
            value={filters.dateRange || 'today'}
            onChange={(e) => updateFilter('dateRange', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
        </div>

        {/* Search Filter */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-2">
            Search
          </label>
          <input
            type="text"
            placeholder="Order ID, customer name..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Sort Filter */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-2">
            Sort By
          </label>
          <select
            value={filters.sortBy || 'createdAt'}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="createdAt">Date Created</option>
            <option value="updatedAt">Last Updated</option>
            <option value="totalAmount">Total Amount</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>

      {/* Clear Filters Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => onFiltersChange({})}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Clear Filters
        </button>
      </div>
    </div>
  )
}