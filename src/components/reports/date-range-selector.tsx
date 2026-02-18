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
}

const presets = [
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
]

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<number | null>(30)
  const { format: dateFormat } = useDateFormat()

  // Local text state so the user can type freely; only committed on valid parse
  const [startText, setStartText] = useState('')
  const [endText, setEndText] = useState('')
  const [startError, setStartError] = useState(false)
  const [endError, setEndError] = useState(false)

  // Keep text inputs in sync when the value prop changes from outside (preset clicks, etc.)
  useEffect(() => {
    setStartText(formatDateByFormat(value.start, dateFormat))
    setEndText(formatDateByFormat(value.end, dateFormat))
  }, [value.start, value.end, dateFormat])

  // Synchronize selectedPreset with the value prop
  useEffect(() => {
    const daysDiff = Math.round((value.end.getTime() - value.start.getTime()) / (1000 * 60 * 60 * 24))
    const matchingPreset = presets.find(preset => preset.days === daysDiff)
    if (matchingPreset) {
      setSelectedPreset(matchingPreset.days)
      setShowCustom(false)
    } else {
      setSelectedPreset(null)
      setShowCustom(true)
    }
  }, [value])

  const handlePresetClick = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days)

    setSelectedPreset(days)
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

  const handleDateTextBlur = (type: 'start' | 'end') => {
    const text = type === 'start' ? startText : endText
    const isoString = parseDateFromFormat(text, dateFormat)

    if (!isoString) {
      // Reset to current valid value on bad input
      if (type === 'start') {
        setStartText(formatDateByFormat(value.start, dateFormat))
        setStartError(true)
        setTimeout(() => setStartError(false), 2000)
      } else {
        setEndText(formatDateByFormat(value.end, dateFormat))
        setEndError(true)
        setTimeout(() => setEndError(false), 2000)
      }
      return
    }

    // Parse as local date (YYYY-MM-DD at noon to avoid timezone shifts)
    const newDate = new Date(isoString + 'T12:00:00')

    if (type === 'start') {
      onChange({ start: newDate, end: value.end })
    } else {
      onChange({ start: value.start, end: newDate })
    }

    setSelectedPreset(null)
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Date Range:
        </label>

        {/* Preset Buttons */}
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.days}
              onClick={() => handlePresetClick(preset.days)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPreset === preset.days
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
              setSelectedPreset(null)
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showCustom
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Custom Range
          </button>
        </div>
      </div>

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
        </div>
      )}
    </div>
  )
}
