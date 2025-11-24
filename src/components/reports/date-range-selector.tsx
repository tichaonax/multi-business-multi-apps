'use client'

import { useState, useEffect } from 'react'

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

  const handleCustomRangeChange = (type: 'start' | 'end', dateString: string) => {
    const newDate = new Date(dateString)

    if (type === 'start') {
      onChange({ start: newDate, end: value.end })
    } else {
      onChange({ start: value.start, end: newDate })
    }

    setSelectedPreset(null)
  }

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
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
              type="date"
              value={formatDateForInput(value.start)}
              onChange={(e) => handleCustomRangeChange('start', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">To:</label>
            <input
              type="date"
              value={formatDateForInput(value.end)}
              onChange={(e) => handleCustomRangeChange('end', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      )}
    </div>
  )
}
