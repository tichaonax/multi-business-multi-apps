'use client'

import { useState, useEffect } from 'react'
import { useDateFormat } from '@/contexts/settings-context'
import { formatDateByFormat, parseDateFromFormat } from '@/lib/country-codes'

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
}

const presets = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7', label: 'Last 7 Days', days: 7 },
  { key: '30', label: 'Last 30 Days', days: 30 },
  { key: '90', label: 'Last 90 Days', days: 90 },
]

export function DateRangeSelector({ value, onChange, showAllTime, allTime, onAllTimeChange }: DateRangeSelectorProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [showSingleDate, setShowSingleDate] = useState(false)
  const [singleDateValue, setSingleDateValue] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<string | null>('30')
  const { format: dateFormat } = useDateFormat()

  // Local text state so the user can type freely
  const [startText, setStartText] = useState('')
  const [endText, setEndText] = useState('')
  const [startError, setStartError] = useState(false)
  const [endError, setEndError] = useState(false)

  // Pending dates for custom range — committed only when Search is clicked
  const [pendingStart, setPendingStart] = useState<Date>(value.start)
  const [pendingEnd, setPendingEnd] = useState<Date>(value.end)

  // Keep text inputs and pending state in sync when the value prop changes (preset clicks, etc.)
  useEffect(() => {
    setStartText(formatDateByFormat(value.start, dateFormat))
    setEndText(formatDateByFormat(value.end, dateFormat))
    setPendingStart(value.start)
    setPendingEnd(value.end)
  }, [value.start, value.end, dateFormat])

  // Synchronize selectedPreset with the value prop
  useEffect(() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfYesterday = new Date(startOfToday)
    startOfYesterday.setDate(startOfToday.getDate() - 1)
    const valueStartDay = new Date(value.start.getFullYear(), value.start.getMonth(), value.start.getDate())
    const daysDiff = Math.round((value.end.getTime() - value.start.getTime()) / (1000 * 60 * 60 * 24))

    if (valueStartDay.getTime() === startOfToday.getTime()) {
      setSelectedPreset('today')
      setShowCustom(false)
    } else if (valueStartDay.getTime() === startOfYesterday.getTime() && daysDiff <= 1) {
      setSelectedPreset('yesterday')
      setShowCustom(false)
    } else {
      const matchingPreset = presets.find(p => p.days === daysDiff)
      if (matchingPreset) {
        setSelectedPreset(matchingPreset.key)
        setShowCustom(false)
      } else {
        setSelectedPreset(null)
        // Only open custom panel if single-date picker isn't active
        if (!showSingleDate) setShowCustom(true)
      }
    }
  }, [value, showSingleDate])

  const handleAllTimeClick = () => {
    setShowCustom(false)
    setShowSingleDate(false)
    setSelectedPreset(null)
    onAllTimeChange?.(true)
  }

  const handlePresetClick = (key: string, days?: number) => {
    setShowSingleDate(false)
    onAllTimeChange?.(false)
    const now = new Date()
    let start: Date
    let end: Date = now

    if (key === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (key === 'yesterday') {
      const yesterday = new Date(now)
      yesterday.setDate(now.getDate() - 1)
      start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
      end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
    } else {
      start = new Date(now)
      start.setDate(now.getDate() - (days || 7))
    }

    setSelectedPreset(key)
    setShowCustom(false)
    onChange({ start, end })
  }

  const handleDateTextChange = (type: 'start' | 'end', text: string) => {
    if (type === 'start') {
      setStartText(text)
      setStartError(false)
    } else {
      setEndText(text)
      setEndError(false)
    }
  }

  // Validate on blur and update pending state — does NOT call onChange
  const handleDateTextBlur = (type: 'start' | 'end') => {
    const text = type === 'start' ? startText : endText
    const isoString = parseDateFromFormat(text, dateFormat)

    if (!isoString) {
      if (type === 'start') {
        setStartText(formatDateByFormat(pendingStart, dateFormat))
        setStartError(true)
        setTimeout(() => setStartError(false), 2000)
      } else {
        setEndText(formatDateByFormat(pendingEnd, dateFormat))
        setEndError(true)
        setTimeout(() => setEndError(false), 2000)
      }
      return
    }

    const newDate = new Date(isoString + 'T12:00:00')
    if (type === 'start') {
      setPendingStart(newDate)
    } else {
      setPendingEnd(newDate)
    }
    setSelectedPreset(null)
  }

  // Commit the custom range — called by the Search button
  const handleCustomSearch = () => {
    onAllTimeChange?.(false)
    onChange({ start: pendingStart, end: pendingEnd })
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Date Range:
        </label>

        {/* Preset Buttons */}
        <div className="flex flex-wrap gap-2">
          {showAllTime && (
            <button
              onClick={handleAllTimeClick}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                allTime
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All time
            </button>
          )}
          {presets.map((preset) => (
            <button
              key={preset.key}
              onClick={() => handlePresetClick(preset.key, preset.days)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPreset === preset.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {preset.label}
            </button>
          ))}

          <button
            onClick={() => {
              setShowCustom(!showCustom)
              setShowSingleDate(false)
              setSelectedPreset(null)
              onAllTimeChange?.(false)
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showCustom
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Custom Range
          </button>

          <button
            onClick={() => {
              setShowSingleDate(!showSingleDate)
              setShowCustom(false)
              setSelectedPreset(null)
              onAllTimeChange?.(false)
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showSingleDate
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Specific Date
          </button>
        </div>
      </div>

      {/* Single Date Picker */}
      {showSingleDate && (
        <div className="mt-4 flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <label className="text-sm text-gray-600 dark:text-gray-400">Date:</label>
          <input
            type="date"
            value={singleDateValue}
            onChange={e => {
              const v = e.target.value
              setSingleDateValue(v)
              if (v) {
                const d = new Date(v + 'T12:00:00')
                onAllTimeChange?.(false)
                onChange({ start: d, end: d })
              }
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
      )}

      {/* Custom Date Inputs */}
      {showCustom && (
        <div className="mt-4 flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">From:</label>
            <input
              type="text"
              value={startText}
              placeholder={dateFormat}
              onChange={(e) => handleDateTextChange('start', e.target.value)}
              onBlur={() => handleDateTextBlur('start')}
              className={`px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-32 ${
                startError
                  ? 'border-red-500 dark:border-red-400'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">To:</label>
            <input
              type="text"
              value={endText}
              placeholder={dateFormat}
              onChange={(e) => handleDateTextChange('end', e.target.value)}
              onBlur={() => handleDateTextBlur('end')}
              className={`px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-32 ${
                endError
                  ? 'border-red-500 dark:border-red-400'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
          </div>

          <span className="text-xs text-gray-400 dark:text-gray-500">
            Format: {dateFormat.toUpperCase()}
          </span>

          <button
            onClick={handleCustomSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </div>
      )}
    </div>
  )
}
