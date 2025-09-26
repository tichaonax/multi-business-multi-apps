'use client'

import { useState, useEffect, useRef } from 'react'
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE, getCountryByCode, formatDateByFormat, parseDateFromFormat, type CountryCode } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'

interface DateInputProps {
  value: string // ISO date string (YYYY-MM-DD)
  onChange: (isoDate: string, countryCode: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  className?: string
  error?: string
  disabled?: boolean
  showCountrySelector?: boolean
  defaultCountryCode?: string
}

export function DateInput({
  value,
  onChange,
  label = 'Date',
  placeholder,
  required = false,
  className = '',
  error,
  disabled = false,
  showCountrySelector = false, // Hide by default when using global format
  defaultCountryCode = DEFAULT_COUNTRY_CODE
}: DateInputProps) {
  const { format: globalDateFormat, defaultCountry } = useDateFormat()
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>()
  const [displayValue, setDisplayValue] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const hiddenDateInputRef = useRef<HTMLInputElement>(null)

  // Initialize country and display value
  useEffect(() => {
    const country = getCountryByCode(defaultCountry) || COUNTRY_CODES.find(c => c.code === DEFAULT_COUNTRY_CODE)
    setSelectedCountry(country)
    
    if (value) {
      // Use global date format instead of country-specific format
      const formatted = formatDateByFormat(value, globalDateFormat)
      setDisplayValue(formatted)
    }
  }, [defaultCountry, value, globalDateFormat])

  // Filter countries based on search
  const filteredCountries = COUNTRY_CODES.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.dateFormat.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCountrySelect = (country: CountryCode) => {
    setSelectedCountry(country)
    setIsDropdownOpen(false)
    setSearchTerm('')
    
    // Reformat current value with global format (not country-specific)
    if (value) {
      const formatted = formatDateByFormat(value, globalDateFormat)
      setDisplayValue(formatted)
    }
    
    // Notify parent of country change
    if (value) {
      onChange(value, country.code)
    }
  }

  const handleDateChange = (newDisplayValue: string) => {
    setDisplayValue(newDisplayValue)
    
    if (newDisplayValue) {
      // Try to parse the date using the global format instead of country format
      const isoDate = parseDateFromFormat(newDisplayValue, globalDateFormat)
      if (isoDate) {
        onChange(isoDate, selectedCountry?.code || defaultCountry)
      }
    } else {
      onChange('', selectedCountry?.code || defaultCountry)
    }
  }

  const getPlaceholder = () => {
    if (placeholder) return placeholder
    return globalDateFormat.toLowerCase()
  }

  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoDate = e.target.value // Already in YYYY-MM-DD format
    if (isoDate) {
      const formatted = formatDateByFormat(isoDate, globalDateFormat)
      setDisplayValue(formatted)
      onChange(isoDate, selectedCountry?.code || defaultCountry)
    }
  }

  const openDatePicker = () => {
    if (hiddenDateInputRef.current && !disabled) {
      hiddenDateInputRef.current.showPicker?.()
    }
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-secondary mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="flex">
        {/* Country Format Selector */}
        {showCountrySelector && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={disabled}
              className="h-10 px-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 border-r-0 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
            >
              <span className="text-lg">{selectedCountry?.flag}</span>
              <span className="text-xs font-mono text-primary">{selectedCountry?.dateFormat}</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown */}
            {isDropdownOpen && !disabled && (
              <div className="absolute top-full left-0 z-50 w-80 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-hidden">
                {/* Search */}
                <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                  <input
                    type="text"
                    placeholder="Search countries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Countries List */}
                <div className="overflow-y-auto max-h-48">
                  {filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => handleCountrySelect(country)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center space-x-3 text-sm"
                    >
                      <span className="text-lg">{country.flag}</span>
                      <div className="flex-1">
                        <div className="text-primary">{country.name}</div>
                        <div className="text-xs text-secondary">Format: {country.dateFormat}</div>
                      </div>
                    </button>
                  ))}
                  {filteredCountries.length === 0 && (
                    <div className="px-3 py-2 text-sm text-secondary">No countries found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Date Input with Picker Button */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={displayValue}
            onChange={(e) => handleDateChange(e.target.value)}
            placeholder={getPlaceholder()}
            required={required}
            disabled={disabled}
            className={`w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 ${showCountrySelector ? 'rounded-r-md' : 'rounded-md'} bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
              error ? 'border-red-300 dark:border-red-500' : ''
            }`}
          />
          
          {/* Date Picker Button */}
          <button
            type="button"
            onClick={openDatePicker}
            disabled={disabled}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Open date picker"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Hidden Native Date Picker */}
          <input
            ref={hiddenDateInputRef}
            type="date"
            value={value}
            onChange={handleDatePickerChange}
            className="absolute opacity-0 pointer-events-none"
            tabIndex={-1}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
      )}

      {/* Help Text */}
      <p className="text-xs text-secondary mt-1">
        Format: {globalDateFormat} (e.g., {formatDateByFormat(new Date(), globalDateFormat)})
      </p>
    </div>
  )
}