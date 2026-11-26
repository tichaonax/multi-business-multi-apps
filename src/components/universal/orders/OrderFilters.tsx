import { OrderFilters as OrderFiltersType } from './types'
import { DateRangePicker, type RangeChange, type RangeSelection } from '@/components/ui/date-range-picker'
import { presetRange, type DateRange, type PresetKey } from '@/lib/date-range-presets'
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

  // MBM-345: the standard date range popup. Today / This week / Month to date /
  // All time stay the server's named ranges (dateRange); anything else is sent
  // as whole local days (startDate / endDate).
  const NAMED: Partial<Record<PresetKey, string>> = { today: 'today', week: 'week', mtd: 'month' }
  const KEY_OF: Record<string, PresetKey> = { today: 'today', week: 'week', month: 'mtd' }
  const dr = filters.dateRange || 'today'
  const pickerValue: DateRange | null = dr === 'all' ? null
    : dr === 'custom' && filters.startDate && filters.endDate ? { start: new Date(filters.startDate), end: new Date(filters.endDate) }
      : KEY_OF[dr] ? presetRange(KEY_OF[dr]) : presetRange('today')
  const pickerSelection: RangeSelection | undefined = dr === 'all' ? { kind: 'all' } : KEY_OF[dr] ? { kind: 'preset', key: KEY_OF[dr] } : undefined
  const onRange = (range: DateRange | null, change: RangeChange) => {
    const sel = change.selection
    if (sel.kind === 'all' || !range) { onFiltersChange({ ...filters, dateRange: 'all', startDate: undefined, endDate: undefined }); return }
    const named = sel.kind === 'preset' ? NAMED[sel.key] : undefined
    if (named) { onFiltersChange({ ...filters, dateRange: named, startDate: undefined, endDate: undefined }); return }
    const start = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate())
    const end = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate(), 23, 59, 59, 999)
    onFiltersChange({ ...filters, dateRange: 'custom', startDate: start.toISOString(), endDate: end.toISOString() })
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
          <DateRangePicker value={pickerValue} selection={pickerSelection} onChange={onRange} allowAllTime
            className="w-full inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-left dark:bg-gray-700 dark:text-white hover:border-blue-400" />
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
          onClick={() => onFiltersChange({ searchTerm: '', statusFilter: 'all', typeFilter: 'all', paymentFilter: 'all', dateRange: 'today' })}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Clear Filters
        </button>
      </div>
    </div>
  )
}