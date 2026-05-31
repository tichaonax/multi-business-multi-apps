'use client'

import { useState, useEffect } from 'react'

export interface DateRange {
  start: Date
  end: Date
}

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
}

const presets = [
  { key: 'today',     label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7',  label: 'Last 7 Days',  days: 7 },
  { key: '30', label: 'Last 30 Days', days: 30 },
  { key: '90', label: 'Last 90 Days', days: 90 },
  { key: '6m', label: '6 Months',  months: 6 },
  { key: '1y', label: '1 Year',    months: 12 },
  { key: '2y', label: '2 Years',   months: 24 },
  { key: '5y', label: '5 Years',   months: 60 },
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const THIS_YEAR = new Date().getFullYear()
const YEARS = [THIS_YEAR, THIS_YEAR - 1, THIS_YEAR - 2]

function toPickerValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function DateRangeSelector({
  value, onChange, showAllTime, allTime, onAllTimeChange,
  selectedMonth: controlledMonth, selectedYear: controlledYear, onMonthYearChange,
}: DateRangeSelectorProps) {
  const isControlled = onMonthYearChange !== undefined

  // Local state used only when uncontrolled
  const [localMonth, setLocalMonth] = useState<number | null>(null)
  const [localYear, setLocalYear] = useState(THIS_YEAR)

  const selectedMonth = isControlled ? (controlledMonth ?? null) : localMonth
  const selectedYear  = isControlled ? (controlledYear  ?? THIS_YEAR) : localYear

  const [showCustom, setShowCustom] = useState(false)
  const [showSingleDate, setShowSingleDate] = useState(false)
  const [singleDateValue, setSingleDateValue] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<string | null>('30')

  const [pendingStart, setPendingStart] = useState<Date>(value.start)
  const [pendingEnd, setPendingEnd] = useState<Date>(value.end)
  const [startPickerValue, setStartPickerValue] = useState(toPickerValue(value.start))
  const [endPickerValue, setEndPickerValue] = useState(toPickerValue(value.end))

  useEffect(() => {
    setPendingStart(value.start)
    setPendingEnd(value.end)
    setStartPickerValue(toPickerValue(value.start))
    setEndPickerValue(toPickerValue(value.end))
  }, [value.start, value.end])

  // Sync preset highlight with incoming value — but only when month picker is not active
  useEffect(() => {
    if (selectedMonth !== null) return // month picker is driving the range — don't override

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfYesterday = new Date(startOfToday)
    startOfYesterday.setDate(startOfToday.getDate() - 1)
    const valueStartDay = new Date(value.start.getFullYear(), value.start.getMonth(), value.start.getDate())
    const daysDiff = Math.round((value.end.getTime() - value.start.getTime()) / (1000 * 60 * 60 * 24))

    if (valueStartDay.getTime() === startOfToday.getTime()) {
      setSelectedPreset('today'); setShowCustom(false); return
    }
    if (valueStartDay.getTime() === startOfYesterday.getTime() && daysDiff <= 1) {
      setSelectedPreset('yesterday'); setShowCustom(false); return
    }
    const dayPreset = presets.find(p => p.days !== undefined && p.days === daysDiff)
    if (dayPreset) { setSelectedPreset(dayPreset.key); setShowCustom(false); return }

    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000
    const monthPreset = presets.find(p => {
      if (!p.months) return false
      const expectedStart = new Date(now)
      expectedStart.setMonth(expectedStart.getMonth() - p.months)
      const expectedStartDay = new Date(expectedStart.getFullYear(), expectedStart.getMonth(), expectedStart.getDate())
      return Math.abs(valueStartDay.getTime() - expectedStartDay.getTime()) <= TWO_DAYS_MS
    })
    if (monthPreset) { setSelectedPreset(monthPreset.key); setShowCustom(false); return }

    setSelectedPreset(null)
    if (!showSingleDate) setShowCustom(true)
  }, [value, showSingleDate, selectedMonth])

  function setMonth(m: number | null, y: number) {
    if (isControlled) onMonthYearChange!(m, y)
    else { setLocalMonth(m); setLocalYear(y) }
  }

  const handleAllTimeClick = () => {
    setShowCustom(false); setShowSingleDate(false); setSelectedPreset(null)
    setMonth(null, selectedYear)
    onAllTimeChange?.(true)
  }

  const handlePresetClick = (key: string, days?: number, months?: number) => {
    setShowSingleDate(false)
    setMonth(null, selectedYear)
    onAllTimeChange?.(false)
    const now = new Date()
    let start: Date, end: Date = now

    if (key === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (key === 'yesterday') {
      const y = new Date(now); y.setDate(now.getDate() - 1)
      start = new Date(y.getFullYear(), y.getMonth(), y.getDate())
      end   = new Date(y.getFullYear(), y.getMonth(), y.getDate())
    } else if (months) {
      start = new Date(now); start.setMonth(start.getMonth() - months)
    } else {
      start = new Date(now); start.setDate(now.getDate() - (days || 7))
    }

    setSelectedPreset(key); setShowCustom(false); onChange({ start, end })
  }

  const handleCustomSearch = () => {
    onAllTimeChange?.(false)
    setMonth(null, selectedYear)
    onChange({ start: pendingStart, end: pendingEnd })
  }

  function handleMonthYearChange(month: number | null, year: number) {
    setMonth(month, year)
    if (month === null) return

    const start = new Date(year, month, 1)
    const end   = new Date(year, month + 1, 0)
    setSelectedPreset(null); setShowCustom(false); setShowSingleDate(false)
    onAllTimeChange?.(false)
    onChange({ start, end })
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range:</label>

        <div className="flex flex-wrap gap-2">
          {showAllTime && (
            <button onClick={handleAllTimeClick} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${allTime ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
              All time
            </button>
          )}
          {presets.map((preset) => (
            <button key={preset.key} onClick={() => handlePresetClick(preset.key, preset.days, preset.months)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedPreset === preset.key ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
              {preset.label}
            </button>
          ))}
          <button onClick={() => { setShowCustom(!showCustom); setShowSingleDate(false); setSelectedPreset(null); setMonth(null, selectedYear); onAllTimeChange?.(false) }} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showCustom ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
            Custom Range
          </button>
          <button onClick={() => { setShowSingleDate(!showSingleDate); setShowCustom(false); setSelectedPreset(null); setMonth(null, selectedYear); onAllTimeChange?.(false) }} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showSingleDate ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
            Specific Date
          </button>
        </div>
      </div>

      {/* Month / Year picker */}
      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <label className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Month:</label>
        <select
          value={selectedMonth ?? ''}
          onChange={e => {
            const val = e.target.value
            handleMonthYearChange(val === '' ? null : parseInt(val), selectedYear)
          }}
          className={`text-sm rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border transition-colors ${selectedMonth !== null ? 'border-blue-500 ring-1 ring-blue-400 dark:border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}
        >
          <option value="">— Month —</option>
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>

        <select
          value={selectedYear}
          onChange={e => handleMonthYearChange(selectedMonth, parseInt(e.target.value))}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        {selectedMonth !== null && (
          <button onClick={() => setMonth(null, selectedYear)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            ✕ clear month
          </button>
        )}
      </div>

      {showSingleDate && (
        <div className="mt-4 flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <label className="text-sm text-gray-600 dark:text-gray-400">Date:</label>
          <input type="date" value={singleDateValue} onChange={e => { const v = e.target.value; setSingleDateValue(v); if (v) { onAllTimeChange?.(false); onChange({ start: new Date(v + 'T12:00:00'), end: new Date(v + 'T12:00:00') }) } }} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
        </div>
      )}

      {showCustom && (
        <div className="mt-4 flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">From:</label>
            <input type="date" value={startPickerValue} max={endPickerValue} onChange={e => { const v = e.target.value; setStartPickerValue(v); if (v) setPendingStart(new Date(v + 'T12:00:00')); setSelectedPreset(null) }} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">To:</label>
            <input type="date" value={endPickerValue} min={startPickerValue} onChange={e => { const v = e.target.value; setEndPickerValue(v); if (v) setPendingEnd(new Date(v + 'T12:00:00')); setSelectedPreset(null) }} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
          </div>
          <button onClick={handleCustomSearch} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Search</button>
        </div>
      )}
    </div>
  )
}
