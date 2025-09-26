'use client'

import { useState, useEffect } from 'react'
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE, parsePhoneNumber, formatPhoneNumber, formatLocalNumber, type CountryCode } from '@/lib/country-codes'

interface PhoneNumberInputProps {
  value: string
  onChange: (fullPhoneNumber: string, countryCode: string, localNumber: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  className?: string
  error?: string
  disabled?: boolean
}

export function PhoneNumberInput({
  value,
  onChange,
  label = 'Phone Number',
  placeholder = '77 123 4567',
  required = false,
  className = '',
  error,
  disabled = false
}: PhoneNumberInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>()
  const [localNumber, setLocalNumber] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Parse initial value
  useEffect(() => {
    if (value) {
      const { countryCode, localNumber: parsedLocal } = parsePhoneNumber(value)
      const country = countryCode || COUNTRY_CODES.find(c => c.code === DEFAULT_COUNTRY_CODE)
      setSelectedCountry(country)
      // Format the parsed local number for display
      const formattedLocal = formatLocalNumber(parsedLocal, country?.code)
      setLocalNumber(formattedLocal)
    } else {
      setSelectedCountry(COUNTRY_CODES.find(c => c.code === DEFAULT_COUNTRY_CODE))
      setLocalNumber('')
    }
  }, [value])

  // Filter countries based on search
  const filteredCountries = COUNTRY_CODES.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.dialCode.includes(searchTerm) ||
    country.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCountrySelect = (country: CountryCode) => {
    setSelectedCountry(country)
    setIsDropdownOpen(false)
    setSearchTerm('')
    // Extract clean digits from the formatted local number
    let cleanedDigits = localNumber.replace(/\D/g, '')
    // If the user pasted/typed a number that already includes the dial code
    // (e.g. "263771234567"), strip the leading dial code digits to avoid
    // duplicating the country code when formatting/storing the full number.
    const dialDigits = country.dialCode.replace('+', '')
    if (cleanedDigits.startsWith(dialDigits)) {
      cleanedDigits = cleanedDigits.slice(dialDigits.length)
    }

    const fullNumber = formatPhoneNumber(country.code, cleanedDigits)
    onChange(fullNumber, country.code, cleanedDigits)
  }


  const handleLocalNumberChange = (newLocalNumber: string) => {
    // Remove all non-numeric characters for processing
    let cleanedDigits = newLocalNumber.replace(/\D/g, '')
    // If the input contains the country dial digits at the start (user may
    // have pasted a full number without the leading +), remove that prefix
    // so we only keep the local part for formatting.
    const countryDialDigits = selectedCountry?.dialCode.replace('+', '')
    if (countryDialDigits && cleanedDigits.startsWith(countryDialDigits)) {
      cleanedDigits = cleanedDigits.slice(countryDialDigits.length)
    }
    
    // Format the number for display
    const formattedLocal = formatLocalNumber(cleanedDigits, selectedCountry?.code)
    setLocalNumber(formattedLocal)
    
    if (selectedCountry) {
      // Store the unformatted version in the full phone number
      const fullNumber = formatPhoneNumber(selectedCountry.code, cleanedDigits)
      onChange(fullNumber, selectedCountry.code, cleanedDigits)
    }
  }

  return (
    // Ensure parent can shrink inside flex layouts (prevents overflow inside modals)
    <div className={`min-w-0 ${className}`}>
      {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      {/* Make the whole control the positioning context so the dropdown width
          is constrained by the control and doesn't overflow modals.
          Also allow shrinking with min-w-0. */}
      <div className="flex relative min-w-0">
        {/* Country Code Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={disabled}
            className="h-10 px-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 border-r-0 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-lg">{selectedCountry?.flag}</span>
            <span className="text-sm font-mono text-gray-800 dark:text-gray-100">{selectedCountry?.dialCode}</span>
            <svg className="w-4 h-4 text-gray-400 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown */}
          {isDropdownOpen && !disabled && (
            <div className="absolute top-full left-0 z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-hidden w-full" style={{ maxWidth: '320px' }}>
              <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="overflow-y-auto max-h-48">
                {filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 text-sm"
                  >
                    <span className="text-lg">{country.flag}</span>
                    <span className="flex-1 text-gray-900 dark:text-gray-100">{country.name}</span>
                    <span className="font-mono text-gray-700 dark:text-gray-300">{country.dialCode}</span>
                  </button>
                ))}

                {filteredCountries.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">No countries found</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Phone Number Input */}
        <input
          type="tel"
          value={localNumber}
          onChange={(e) => handleLocalNumberChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          // Allow the input to shrink inside flex containers (prevents overflow)
          className={`flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-r-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-red-300 dark:border-red-500' : ''
          }`}
        />
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
      )}

      {/* Help Text */}
      {selectedCountry && (
        <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 break-words whitespace-normal">
          Full number: {selectedCountry.dialCode} {localNumber}
        </p>
      )}
    </div>
  )
}