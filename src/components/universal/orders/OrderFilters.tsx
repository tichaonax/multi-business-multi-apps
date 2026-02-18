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

  const handleDateRangeChange = (value: string) => {
    if (value === 'custom') {
      // Switch to custom — preserve any existing dates, clear preset
      onFiltersChange({ ...filters, dateRange: 'custom' })
    } else {
      // Switch to preset — clear custom dates
      onFiltersChange({ ...filters, dateRange: value, startDate: undefined, endDate: undefined })
    }
  }

  const isCustom = filters.dateRange === 'custom'

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
            onChange={(e) => handleDateRangeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
            <option value="custom">Custom Range</option>
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

      {/* Custom date pickers — shown only when Custom Range is selected */}
      {isCustom && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              From
            </label>
            <input
              type="date"
              value={filters.startDate ? filters.startDate.split('T')[0] : ''}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              To
            </label>
            <input
              type="date"
              value={filters.endDate ? filters.endDate.split('T')[0] : ''}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  endDate: e.target.value
                    ? new Date(new Date(e.target.value).setHours(23, 59, 59, 999)).toISOString()
                    : undefined
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* Clear Filters Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => onFiltersChange({ searchTerm: '', statusFilter: 'all', typeFilter: 'all', paymentFilter: 'all', dateRange: 'today' })}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Clear Filters
        </button>
      </div>
    </div>
  )
}