'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { DATE_PRESET_LABELS, type DatePreset } from '@/lib/date-presets'

interface ListSearchFilterBarProps {
  /** Debounced text search. */
  onSearchChange: (query: string) => void
  searchLoading?: boolean
  searchPlaceholder?: string
  /** Pre-fill the box (e.g. from a URL param) without waiting on the first debounce tick. */
  initialValue?: string
  /** Rendered below the input, fed the live (pre-debounce) typed value so it reacts instantly. */
  searchHint?: (rawQuery: string) => ReactNode

  /** Date range — pass undefined to omit the whole date-filter row. */
  dateFrom?: string
  dateTo?: string
  datePreset?: DatePreset
  onPresetClick?: (preset: 'today' | 'yesterday' | 'week' | 'month') => void
  onFromChange?: (iso: string) => void
  onToChange?: (iso: string) => void
  onClearDates?: () => void

  /** Extra page-specific filter controls (e.g. a Contractor dropdown), rendered inline after the date pickers. */
  extraFilters?: ReactNode
}

/**
 * Shared search + date-range filter bar. Originally built for Receipt History
 * (see receipt-search-bar.tsx), generalized so other list pages (e.g. Vehicle
 * Service Jobs) can reuse the same pattern instead of re-implementing it.
 * Purely presentational/controlled — all state lives in the calling page.
 */
export function ListSearchFilterBar({
  onSearchChange,
  searchLoading = false,
  searchPlaceholder = 'Search...',
  initialValue = '',
  searchHint,
  dateFrom,
  dateTo,
  datePreset,
  onPresetClick,
  onFromChange,
  onToChange,
  onClearDates,
  extraFilters,
}: ListSearchFilterBarProps) {
  const [query, setQuery] = useState(initialValue)
  const [debouncedQuery, setDebouncedQuery] = useState(initialValue)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    onSearchChange(debouncedQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery])

  const showDateRow = dateFrom !== undefined && dateTo !== undefined

  return (
    <div>
      {/* Search input */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {searchLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          ) : (
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <input
          type="text"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') setQuery('') }}
          placeholder={searchPlaceholder}
          className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <svg className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        {query && searchHint && <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">{searchHint(query)}</div>}
      </div>

      {/* Date range + extra filters */}
      {(showDateRow || extraFilters) && (
        <div className="mb-6 flex flex-wrap items-end gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          {showDateRow && (
            <>
              <div className="flex gap-2">
                {(['today', 'yesterday', 'week', 'month'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => onPresetClick?.(p)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      datePreset === p
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {DATE_PRESET_LABELS[p]}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => onFromChange?.(e.target.value)}
                    className="px-2 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(e) => onToChange?.(e.target.value)}
                    className="px-2 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
                {(dateFrom || dateTo) && (
                  <button
                    onClick={onClearDates}
                    className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg"
                  >
                    Clear
                  </button>
                )}
              </div>
            </>
          )}
          {extraFilters}
        </div>
      )}
    </div>
  )
}
