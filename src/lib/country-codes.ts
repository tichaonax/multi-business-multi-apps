export interface CountryCode {
  code: string
  dialCode: string
  name: string
  flag: string
  dateFormat: string
}

export const COUNTRY_CODES: CountryCode[] = [
  // Africa
  { code: 'ZW', dialCode: '+263', name: 'Zimbabwe', flag: '🇿🇼', dateFormat: 'dd/mm/yyyy' },
  { code: 'ZA', dialCode: '+27', name: 'South Africa', flag: '🇿🇦', dateFormat: 'yyyy/mm/dd' },
  { code: 'BW', dialCode: '+267', name: 'Botswana', flag: '🇧🇼', dateFormat: 'dd/mm/yyyy' },
  { code: 'ZM', dialCode: '+260', name: 'Zambia', flag: '🇿🇲', dateFormat: 'dd/mm/yyyy' },
  { code: 'MW', dialCode: '+265', name: 'Malawi', flag: '🇲🇼', dateFormat: 'dd/mm/yyyy' },
  { code: 'MZ', dialCode: '+258', name: 'Mozambique', flag: '🇲🇿', dateFormat: 'dd/mm/yyyy' },
  { code: 'NA', dialCode: '+264', name: 'Namibia', flag: '🇳🇦', dateFormat: 'dd/mm/yyyy' },
  { code: 'KE', dialCode: '+254', name: 'Kenya', flag: '🇰🇪', dateFormat: 'dd/mm/yyyy' },
  { code: 'UG', dialCode: '+256', name: 'Uganda', flag: '🇺🇬', dateFormat: 'dd/mm/yyyy' },
  { code: 'TZ', dialCode: '+255', name: 'Tanzania', flag: '🇹🇿', dateFormat: 'dd/mm/yyyy' },
  { code: 'NG', dialCode: '+234', name: 'Nigeria', flag: '🇳🇬', dateFormat: 'dd/mm/yyyy' },
  { code: 'GH', dialCode: '+233', name: 'Ghana', flag: '🇬🇭', dateFormat: 'dd/mm/yyyy' },
  { code: 'EG', dialCode: '+20', name: 'Egypt', flag: '🇪🇬', dateFormat: 'dd/mm/yyyy' },
  { code: 'MA', dialCode: '+212', name: 'Morocco', flag: '🇲🇦', dateFormat: 'dd/mm/yyyy' },
  { code: 'ET', dialCode: '+251', name: 'Ethiopia', flag: '🇪🇹', dateFormat: 'dd/mm/yyyy' },
  
  // Popular international
  { code: 'US', dialCode: '+1', name: 'United States', flag: '🇺🇸', dateFormat: 'mm/dd/yyyy' },
  { code: 'GB', dialCode: '+44', name: 'United Kingdom', flag: '🇬🇧', dateFormat: 'dd/mm/yyyy' },
  { code: 'CA', dialCode: '+1', name: 'Canada', flag: '🇨🇦', dateFormat: 'dd/mm/yyyy' },
  { code: 'AU', dialCode: '+61', name: 'Australia', flag: '🇦🇺', dateFormat: 'dd/mm/yyyy' },
  { code: 'IN', dialCode: '+91', name: 'India', flag: '🇮🇳', dateFormat: 'dd/mm/yyyy' },
  { code: 'CN', dialCode: '+86', name: 'China', flag: '🇨🇳', dateFormat: 'yyyy/mm/dd' },
  { code: 'DE', dialCode: '+49', name: 'Germany', flag: '🇩🇪', dateFormat: 'dd.mm.yyyy' },
  { code: 'FR', dialCode: '+33', name: 'France', flag: '🇫🇷', dateFormat: 'dd/mm/yyyy' },
  { code: 'IT', dialCode: '+39', name: 'Italy', flag: '🇮🇹', dateFormat: 'dd/mm/yyyy' },
  { code: 'ES', dialCode: '+34', name: 'Spain', flag: '🇪🇸', dateFormat: 'dd/mm/yyyy' },
  { code: 'NL', dialCode: '+31', name: 'Netherlands', flag: '🇳🇱', dateFormat: 'dd-mm-yyyy' },
  { code: 'BR', dialCode: '+55', name: 'Brazil', flag: '🇧🇷', dateFormat: 'dd/mm/yyyy' },
  { code: 'JP', dialCode: '+81', name: 'Japan', flag: '🇯🇵', dateFormat: 'yyyy/mm/dd' },
  { code: 'KR', dialCode: '+82', name: 'South Korea', flag: '🇰🇷', dateFormat: 'yyyy-mm-dd' },
  { code: 'SG', dialCode: '+65', name: 'Singapore', flag: '🇸🇬', dateFormat: 'dd/mm/yyyy' },
  { code: 'AE', dialCode: '+971', name: 'United Arab Emirates', flag: '🇦🇪', dateFormat: 'dd/mm/yyyy' },
]

// Default country code (Zimbabwe in this case)
export const DEFAULT_COUNTRY_CODE = 'ZW'

// Helper function to get country by dial code
export function getCountryByDialCode(dialCode: string): CountryCode | undefined {
  return COUNTRY_CODES.find(country => country.dialCode === dialCode)
}

// Helper function to get country by code
export function getCountryByCode(code: string): CountryCode | undefined {
  return COUNTRY_CODES.find(country => country.code === code)
}

// Helper function to parse phone number and extract country code
export function parsePhoneNumber(phoneNumber: string): { countryCode?: CountryCode; localNumber: string } {
  if (!phoneNumber.startsWith('+')) {
    return { localNumber: phoneNumber }
  }

  // Find the longest matching dial code
  let matchedCountry: CountryCode | undefined
  let localNumber = phoneNumber

  for (const country of COUNTRY_CODES) {
    if (phoneNumber.startsWith(country.dialCode)) {
      if (!matchedCountry || country.dialCode.length > matchedCountry.dialCode.length) {
        matchedCountry = country
        localNumber = phoneNumber.substring(country.dialCode.length).trim()
      }
    }
  }

  return { countryCode: matchedCountry, localNumber }
}

// Format local phone number for readability
export function formatLocalNumber(number: string, countryCode?: string): string {
  // Remove all non-numeric characters
  const digits = number.replace(/\D/g, '')
  
  if (!digits) return ''

  // Country-specific formatting patterns
  switch (countryCode) {
    case 'ZW': // Zimbabwe: 77 123 4567 or 71 234 5678
    case 'ZA': // South Africa: 82 123 4567
    case 'BW': // Botswana: 71 123 456
      if (digits.length <= 2) return digits
      if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`
      return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`
    
    case 'KE': // Kenya: 712 345 678
    case 'UG': // Uganda: 701 234 567
    case 'TZ': // Tanzania: 712 345 678
      if (digits.length <= 3) return digits
      if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`
    
    case 'US': // United States: (555) 123-4567
    case 'CA': // Canada: (416) 555-0199
      if (digits.length <= 3) return digits
      if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
    
    case 'GB': // UK: 7700 900123
      if (digits.length <= 4) return digits
      return `${digits.slice(0, 4)} ${digits.slice(4, 10)}`
    
    case 'IN': // India: 98765 43210
      if (digits.length <= 5) return digits
      return `${digits.slice(0, 5)} ${digits.slice(5, 10)}`
    
    case 'AU': // Australia: 0412 345 678
      if (digits.length <= 4) return digits
      if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`
    
    case 'DE': // Germany: 0151 12345678
    case 'FR': // France: 06 12 34 56 78
    case 'IT': // Italy: 320 123 4567
    case 'ES': // Spain: 612 34 56 78
      if (digits.length <= 3) return digits
      if (digits.length <= 5) return `${digits.slice(0, 3)} ${digits.slice(3)}`
      if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`
      return `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`
    
    default: // Generic formatting: 123 456 7890
      if (digits.length <= 3) return digits
      if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`
  }
}

// Helper function to format phone number with country code
export function formatPhoneNumber(countryCode: string, localNumber: string): string {
  const country = getCountryByCode(countryCode)
  if (!country) return localNumber
  
  return `${country.dialCode} ${localNumber}`
}

// Enhanced function to format full phone number for display
export function formatPhoneNumberForDisplay(phoneNumber: string): string {
  if (!phoneNumber) return ''
  
  const { countryCode, localNumber } = parsePhoneNumber(phoneNumber)
  
  if (countryCode) {
    const formattedLocal = formatLocalNumber(localNumber, countryCode.code)
    return `${countryCode.dialCode} ${formattedLocal}`
  }
  
  // If no country code detected, try to format as local number with default country
  const defaultCountry = getCountryByCode(DEFAULT_COUNTRY_CODE)
  const formattedLocal = formatLocalNumber(phoneNumber, DEFAULT_COUNTRY_CODE)
  return defaultCountry ? `${defaultCountry.dialCode} ${formattedLocal}` : phoneNumber
}

// Normalize an arbitrary phone input into a consistent stored format.
// Accepts numbers entered with or without + and with or without dial code.
// Returns a string like "+263 77 123 4567" or an empty string for invalid input.
export function normalizePhoneInput(input: string, fallbackCountryCode: string = DEFAULT_COUNTRY_CODE): string {
  if (!input) return ''

  // Clean to digits (keep leading + to detect E.164-like inputs)
  const trimmed = input.trim()

  // If input starts with +, parse country and local directly
  if (trimmed.startsWith('+')) {
    const { countryCode, localNumber } = parsePhoneNumber(trimmed)
    const country = countryCode || getCountryByCode(fallbackCountryCode)
    const formattedLocal = formatLocalNumber(localNumber, country?.code)
    return country ? `${country.dialCode} ${formattedLocal}` : trimmed
  }

  // Otherwise, remove non-digits and try to detect a leading dial code
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return ''

  // Try to find the longest matching dial code among countries
  let matched: CountryCode | undefined
  for (const c of COUNTRY_CODES) {
    const dialDigits = c.dialCode.replace('+', '')
    if (digits.startsWith(dialDigits)) {
      if (!matched || dialDigits.length > matched.dialCode.replace('+', '').length) {
        matched = c
      }
    }
  }

  const country = matched || getCountryByCode(fallbackCountryCode)
  const dialDigits = country?.dialCode.replace('+', '') || ''
  // Strip the dial digits if present so we keep only the local part
  const local = dialDigits && digits.startsWith(dialDigits) ? digits.slice(dialDigits.length) : digits
  const formattedLocal = formatLocalNumber(local, country?.code)
  return country ? `${country.dialCode} ${formattedLocal}` : digits
}

// Date formatting functions
export function formatDateByCountry(date: Date | string, countryCode: string): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return ''
  
  const country = getCountryByCode(countryCode)
  const format = country?.dateFormat || 'dd/mm/yyyy' // Default to dd/mm/yyyy
  
  // Use UTC methods to avoid timezone conversion issues with ISO date strings
  const day = dateObj.getUTCDate().toString().padStart(2, '0')
  const month = (dateObj.getUTCMonth() + 1).toString().padStart(2, '0')
  const year = dateObj.getUTCFullYear().toString()
  
  switch (format) {
    case 'mm/dd/yyyy':
      return `${month}/${day}/${year}`
    case 'yyyy/mm/dd':
      return `${year}/${month}/${day}`
    case 'yyyy-mm-dd':
      return `${year}-${month}-${day}`
    case 'dd.mm.yyyy':
      return `${day}.${month}.${year}`
    case 'dd-mm-yyyy':
      return `${day}-${month}-${year}`
    case 'dd/mm/yyyy':
    default:
      return `${day}/${month}/${year}`
  }
}

// Parse date string in country format back to ISO date
export function parseDateFromCountryFormat(dateString: string, countryCode: string): string | null {
  if (!dateString) return null
  
  const country = getCountryByCode(countryCode)
  const format = country?.dateFormat || 'dd/mm/yyyy'
  
  let day: string, month: string, year: string
  
  // Remove any non-numeric separators and split
  const parts = dateString.replace(/[^\d]/g, ' ').split(/\s+/).filter(p => p)
  if (parts.length !== 3) return null
  
  switch (format) {
    case 'mm/dd/yyyy':
      [month, day, year] = parts
      break
    case 'yyyy/mm/dd':
    case 'yyyy-mm-dd':
      [year, month, day] = parts
      break
    case 'dd.mm.yyyy':
    case 'dd-mm-yyyy':
    case 'dd/mm/yyyy':
    default:
      [day, month, year] = parts
      break
  }
  
  // Validate ranges
  const dayNum = parseInt(day, 10)
  const monthNum = parseInt(month, 10)
  const yearNum = parseInt(year, 10)
  
  if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900 || yearNum > 2100) {
    return null
  }
  
  // Return in ISO format (YYYY-MM-DD)
  return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

// Get date format example for display
export function getDateFormatExample(countryCode: string): string {
  const country = getCountryByCode(countryCode)
  const format = country?.dateFormat || 'dd/mm/yyyy'
  
  const today = new Date()
  return formatDateByCountry(today, countryCode)
}

// Format date by specific format string (for global date format)
export function formatDateByFormat(date: Date | string, format: string): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return ''
  
  // Use UTC methods to avoid timezone conversion issues with ISO date strings
  const day = dateObj.getUTCDate().toString().padStart(2, '0')
  const month = (dateObj.getUTCMonth() + 1).toString().padStart(2, '0')
  const year = dateObj.getUTCFullYear().toString()
  
  switch (format) {
    case 'mm/dd/yyyy':
      return `${month}/${day}/${year}`
    case 'yyyy/mm/dd':
      return `${year}/${month}/${day}`
    case 'yyyy-mm-dd':
      return `${year}-${month}-${day}`
    case 'dd.mm.yyyy':
      return `${day}.${month}.${year}`
    case 'dd-mm-yyyy':
      return `${day}-${month}-${year}`
    case 'dd/mm/yyyy':
    default:
      return `${day}/${month}/${year}`
  }
}

// Parse date string from specific format back to ISO date
export function parseDateFromFormat(dateString: string, format: string): string | null {
  if (!dateString) return null
  
  let day: string, month: string, year: string
  
  // Remove any non-numeric separators and split
  const parts = dateString.replace(/[^\d]/g, ' ').split(/\s+/).filter(p => p)
  if (parts.length !== 3) return null
  
  switch (format) {
    case 'mm/dd/yyyy':
      [month, day, year] = parts
      break
    case 'yyyy/mm/dd':
    case 'yyyy-mm-dd':
      [year, month, day] = parts
      break
    case 'dd.mm.yyyy':
    case 'dd-mm-yyyy':
    case 'dd/mm/yyyy':
    default:
      [day, month, year] = parts
      break
  }
  
  // Validate ranges
  const dayNum = parseInt(day, 10)
  const monthNum = parseInt(month, 10)
  const yearNum = parseInt(year, 10)
  
  if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900 || yearNum > 2100) {
    return null
  }
  
  // Return in ISO format (YYYY-MM-DD)
  return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}