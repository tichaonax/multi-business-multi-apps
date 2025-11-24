'use client'

import { useState, useEffect, useRef } from 'react'
import { useToastContext } from '@/components/ui/toast'

interface SearchResult {
  id: string
  type: 'user' | 'employee'
  name: string
  email?: string
  phone?: string
  employeeNumber?: string
  hasUserAccount: boolean
  driverLicenseNumber?: string
  driverLicenseTemplateId?: string
  dateOfBirth?: string
  address?: string
  userId?: string
}

interface UserEmployeeSearchProps {
  onSelect: (result: SearchResult) => void
  onClear?: () => void
  selectedResult?: SearchResult | null
  placeholder?: string
  className?: string
}

export function UserEmployeeSearch({
  onSelect,
  onClear,
  selectedResult,
  placeholder = 'Search for user or employee...',
  className = ''
}: UserEmployeeSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const toast = useToastContext()

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch search results
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTerm.length < 2) {
        setResults([])
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/vehicles/drivers/search-people?search=${encodeURIComponent(searchTerm)}&limit=10`
        )
        const data = await response.json()

        if (data.success) {
          setResults(data.data || [])
          setIsOpen(true)
        } else {
          toast.push(data.error || 'Failed to search')
          setResults([])
        }
      } catch (error) {
        console.error('Search error:', error)
        toast.push('Failed to search people')
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300) // Debounce

    return () => clearTimeout(timer)
  }, [searchTerm, toast])

  const handleSelect = (result: SearchResult) => {
    onSelect(result)
    setSearchTerm('')
    setResults([])
    setIsOpen(false)
    inputRef.current?.blur()
  }

  const handleClear = () => {
    setSearchTerm('')
    setResults([])
    setIsOpen(false)
    onClear?.()
    inputRef.current?.focus()
  }

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Selected result display */}
      {selectedResult && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-primary">{selectedResult.name}</span>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    selectedResult.type === 'user'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  }`}
                >
                  {selectedResult.type === 'user' ? 'User' : 'Employee'}
                </span>
                {selectedResult.type === 'employee' && !selectedResult.hasUserAccount && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">
                    No User Account
                  </span>
                )}
              </div>
              <div className="text-sm text-secondary space-y-1">
                {selectedResult.email && <div>Email: {selectedResult.email}</div>}
                {selectedResult.employeeNumber && <div>Employee #: {selectedResult.employeeNumber}</div>}
                {selectedResult.phone && <div>Phone: {selectedResult.phone}</div>}
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="ml-4 px-3 py-1 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Search input (hidden when result selected) */}
      {!selectedResult && (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setIsOpen(true)
            }}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
          />
          {isLoading && (
            <div className="absolute right-3 top-2.5">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          )}

          {/* Search results dropdown */}
          {isOpen && results.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-80 overflow-y-auto">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  type="button"
                  onClick={() => handleSelect(result)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-primary">{result.name}</span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        result.type === 'user'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      }`}
                    >
                      {result.type === 'user' ? 'User' : 'Employee'}
                    </span>
                    {result.type === 'employee' && !result.hasUserAccount && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">
                        No User Account
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-secondary">
                    {result.email && <div>Email: {result.email}</div>}
                    {result.employeeNumber && <div>Employee #: {result.employeeNumber}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results message */}
          {isOpen && searchTerm.length >= 2 && !isLoading && results.length === 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg p-4 text-center text-secondary">
              No users or employees found matching "{searchTerm}"
            </div>
          )}
        </div>
      )}

      {!selectedResult && searchTerm.length < 2 && searchTerm.length > 0 && (
        <p className="mt-1 text-xs text-gray-500">Type at least 2 characters to search</p>
      )}
    </div>
  )
}
