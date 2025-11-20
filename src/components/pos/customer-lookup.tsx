'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, UserPlus, User } from 'lucide-react'

interface Customer {
  id: string
  customerNumber: string
  name: string
  email?: string
  phone?: string
  customerType: string
}

interface CustomerLookupProps {
  businessId: string
  selectedCustomer: Customer | null
  onSelectCustomer: (customer: Customer | null) => void
  onCreateCustomer?: () => void
  allowWalkIn?: boolean
}

export function CustomerLookup({
  businessId,
  selectedCustomer,
  onSelectCustomer,
  onCreateCustomer,
  allowWalkIn = true
}: CustomerLookupProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isWalkIn, setIsWalkIn] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Search customers as user types
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setCustomers([])
      return
    }

    const delaySearch = setTimeout(() => {
      searchCustomers(searchQuery)
    }, 300) // Debounce 300ms

    return () => clearTimeout(delaySearch)
  }, [searchQuery, businessId])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !searchInputRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchCustomers = async (query: string) => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/customers?businessId=${businessId}&search=${encodeURIComponent(query)}&limit=10`
      )
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers || [])
        setShowDropdown(true)
      }
    } catch (error) {
      console.error('Error searching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer)
    setIsWalkIn(false)
    setSearchQuery('')
    setShowDropdown(false)
    setCustomers([])
  }

  const handleClearCustomer = () => {
    onSelectCustomer(null)
    setIsWalkIn(false)
    setSearchQuery('')
  }

  const handleSelectWalkIn = () => {
    onSelectCustomer(null)
    setIsWalkIn(true)
    setSearchQuery('')
    setShowDropdown(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-primary">
          Customer Information
        </label>
        {onCreateCustomer && (
          <button
            type="button"
            onClick={onCreateCustomer}
            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <UserPlus className="h-3 w-3" />
            Add New Customer
          </button>
        )}
      </div>

      {selectedCustomer ? (
        // Show selected customer
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-1">
              <User className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium text-primary">{selectedCustomer.name}</div>
                <div className="text-xs text-secondary">
                  ID: {selectedCustomer.customerNumber}
                  {selectedCustomer.phone && ` • ${selectedCustomer.phone}`}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearCustomer}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Clear customer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : isWalkIn ? (
        // Show walk-in customer selected
        <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-300 dark:border-gray-700 rounded-lg p-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-1">
              <User className="h-5 w-5 text-gray-500" />
              <div>
                <div className="font-medium text-primary">Walk-in Customer</div>
                <div className="text-xs text-secondary">No customer tracking</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearCustomer}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Change customer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        // Show search input
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (customers.length > 0) setShowDropdown(true)
              }}
              placeholder="Search by name or customer ID..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-primary focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>

          {/* Dropdown Results */}
          {showDropdown && (searchQuery.length >= 2 || allowWalkIn) && (
            <div
              ref={dropdownRef}
              className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto"
            >
              {/* Walk-in Customer Option */}
              {allowWalkIn && (
                <>
                  <button
                    type="button"
                    onClick={handleSelectWalkIn}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium text-primary">Walk-in Customer</div>
                        <div className="text-xs text-secondary">No customer tracking</div>
                      </div>
                    </div>
                  </button>
                </>
              )}

              {/* Search Results */}
              {customers.length > 0 && (
                <>
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleSelectCustomer(customer)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="font-medium text-primary">{customer.name}</div>
                          <div className="text-xs text-secondary">
                            {customer.customerNumber}
                            {customer.phone && ` • ${customer.phone}`}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* No Results */}
              {searchQuery.length >= 2 && customers.length === 0 && !loading && (
                <div className="px-4 py-3 text-sm text-secondary text-center">
                  No customers found. Try a different search term.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
