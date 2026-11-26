'use client'

// The reports' date range picker (51 pages). MBM-345: its bar now opens the
// standard date range popup (src/components/ui/date-range-picker.tsx) instead
// of expanding an inline panel. The props and the dates it gives are exactly
// as before (scripts/check-date-range-presets.ts), so no page changes; it
// also gains This week, Last week, Last month and Last year.

import { useRef, useState } from 'react'
import { DateRangePopup, labelFor, type RangeSelection } from '@/components/ui/date-range-picker'
import { matchPreset, monthRange, type DateRange } from '@/lib/date-range-presets'

export type { DateRange }

interface DateRangeSelectorProps {
  value: DateRange
  onChange: (range: DateRange) => void
  showAllTime?: boolean
  allTime?: boolean
  onAllTimeChange?: (allTime: boolean) => void
  // Controlled month/year — when provided, parent owns this state
  selectedMonth?: number | null
  selectedYear?: number
  onMonthYearChange?: (month: number | null, year: number) => void
  /** Kept for the pages that pass it; the popup replaces the collapsible panel. */
  defaultCollapsed?: boolean
}

const THIS_YEAR = new Date().getFullYear()

export function DateRangeSelector({
  value, onChange, showAllTime, allTime, onAllTimeChange,
  selectedMonth: controlledMonth, selectedYear: controlledYear, onMonthYearChange,
}: DateRangeSelectorProps) {
  const isControlled = onMonthYearChange !== undefined
  const btnRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)

  // Local month/year only when uncontrolled (as before)
  const [localMonth, setLocalMonth] = useState<number | null>(null)
  const [localYear, setLocalYear] = useState(THIS_YEAR)
  const selectedMonth = isControlled ? (controlledMonth ?? null) : localMonth
  const selectedYear = isControlled ? (controlledYear ?? THIS_YEAR) : localYear
  const setMonth = (m: number | null, y: number) => {
    if (isControlled) onMonthYearChange!(m, y)
    else { setLocalMonth(m); setLocalYear(y) }
  }

  // What was picked last (a day or From / To reads as dates, not a preset)
  const [picked, setPicked] = useState<RangeSelection | null>(null)
  const selection: RangeSelection | null =
    allTime ? { kind: 'all' }
      : selectedMonth !== null ? { kind: 'month', year: selectedYear, month: selectedMonth }
        : picked && picked.kind !== 'all' && picked.kind !== 'month'
          ? (picked.kind === 'preset' && matchPreset(value, [picked.key]) !== picked.key ? null : picked)
          : null

  const apply = (range: DateRange | null, change: { selection: RangeSelection }) => {
    const sel = change.selection
    setPicked(sel)
    setOpen(false)
    if (sel.kind === 'all') {
      setMonth(null, selectedYear)
      onAllTimeChange?.(true)
      return
    }
    onAllTimeChange?.(false)
    if (sel.kind === 'month') {
      setMonth(sel.month, sel.year)
      onChange(monthRange(sel.year, sel.month))
      return
    }
    setMonth(null, selectedYear)
    if (range) onChange(range)
  }

  return (
    <div className="mb-4">
      <button ref={btnRef} type="button" onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-gray-400">📅</span>
          <span className="shrink-0">Date Range:</span>
          <span className="text-blue-600 dark:text-blue-400 truncate">{labelFor(allTime ? null : value, selection)}</span>
        </span>
        <span className="text-gray-400 text-xs shrink-0">▾ change</span>
      </button>
      <DateRangePopup anchor={btnRef.current} open={open} onClose={() => setOpen(false)} title="Date range"
        value={allTime ? null : value} selection={selection} onApply={apply}
        allowAllTime={!!showAllTime} maxDate={null}
        years={[0, 1, 2, 3, 4].map(n => THIS_YEAR - n)} />
    </div>
  )
}
