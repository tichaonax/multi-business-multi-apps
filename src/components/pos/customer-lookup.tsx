'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, UserPlus, User, Printer } from 'lucide-react'
import { CustomerLoyaltyCard, buildPrintCardHtml, openCardPrintWindow, formatPhone } from './customer-loyalty-card'
import { PrintCardToReceiptPrinter } from '@/components/ui/print-card-to-receipt-printer'

interface Customer {
  id: string
  customerNumber: string
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  customerType: string
}

interface CustomerLookupProps {
  businessId: string
  selectedCustomer: Customer | null
  onSelectCustomer: (customer: Customer | null) => void
  onCreateCustomer?: () => void
  allowWalkIn?: boolean
  businessName?: string
  businessPhone?: string
  umbrellaBusinessName?: string | null
}

export function CustomerLookup({
  businessId,
  selectedCustomer,
  onSelectCustomer,
  onCreateCustomer,
  allowWalkIn = true,
  businessName,
  businessPhone,
  umbrellaBusinessName: umbrellaBusinessNameProp,
}: CustomerLookupProps) {
  const [umbrellaBusinessName, setUmbrellaBusinessName] = useState<string | null>(umbrellaBusinessNameProp ?? null)
  const [searchQuery, setSearchQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isWalkIn, setIsWalkIn] = useState(false)
  const [showPrintPanel, setShowPrintPanel] = useState(false)
  const [pdfPrinted, setPdfPrinted] = useState(false)
  const [receiptPrinted, setReceiptPrinted] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch umbrella business name
  useEffect(() => {
    if (umbrellaBusinessNameProp) return
    fetch('/api/admin/umbrella-business')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        console.log('[CustomerLookup] umbrella-business response:', data)
        if (data?.umbrellaBusinessName) setUmbrellaBusinessName(data.umbrellaBusinessName)
      })
      .catch(() => {})
  }, [])

  // Search customers as user types
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setCustomers([])
      return
    }

    // Show dropdown immediately (with Walk-in) while waiting for API
    setShowDropdown(true)

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
    setSearchError(null)
    try {
      const response = await fetch(
        `/api/pos/customer-search?businessId=${encodeURIComponent(businessId)}&search=${encodeURIComponent(query)}&limit=10`
      )
      const data = await response.json()
      if (response.ok) {
        setCustomers(data.customers || [])
      } else {
        console.error('[CustomerLookup] Search error:', data.error)
        setSearchError(data.error || 'Search failed')
        setCustomers([])
      }
      setShowDropdown(true)
    } catch (error) {
      console.error('[CustomerLookup] Network error:', error)
      setSearchError('Network error — could not search customers')
      setCustomers([])
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
    setShowPrintPanel(false)
  }

  const printLoyaltyCard = async () => {
    if (!selectedCustomer) return
    const cardHtml = await buildPrintCardHtml(selectedCustomer, businessName, businessPhone, umbrellaBusinessName)
    openCardPrintWindow(`Loyalty Card — ${selectedCustomer.name}`, cardHtml)
    setPdfPrinted(true)
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
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-1">
              <User className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium text-primary">{selectedCustomer.name}</div>
                <div className="text-xs text-secondary">
                  ID: {selectedCustomer.customerNumber}
                  {selectedCustomer.phone && ` • ${formatPhone(selectedCustomer.phone)}`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => { setShowPrintPanel(v => !v); setPdfPrinted(false); setReceiptPrinted(false) }}
                title="Print loyalty card"
                className={`p-0.5 ${showPrintPanel ? 'text-blue-700 dark:text-blue-300' : 'text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'}`}
              >
                <Printer className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleClearCustomer}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-0.5"
                title="Clear customer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Print panel — shown when printer icon toggled */}
          {showPrintPanel && (
            <div className="border-t border-blue-200 dark:border-blue-700 pt-2 space-y-1.5">
              <button
                type="button"
                onClick={printLoyaltyCard}
                disabled={pdfPrinted}
                className="w-full py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-primary rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pdfPrinted ? '✅ Printed' : '🖨️ Print / Save as PDF'}
              </button>
              <PrintCardToReceiptPrinter
                cardElementId="customer-loyalty-card-lookup"
                businessId={businessId}
                label="Print to Receipt Printer"
                disabled={receiptPrinted}
                onPrintSuccess={() => setReceiptPrinted(true)}
              />
            </div>
          )}

          {/* Card rendered off-screen for print capture */}
          <div style={{ position: 'absolute', left: '-9999px', top: 0, pointerEvents: 'none' }}>
            <CustomerLoyaltyCard
              customer={{
                id: selectedCustomer.id,
                customerNumber: selectedCustomer.customerNumber,
                name: selectedCustomer.name,
                phone: selectedCustomer.phone,
              }}
              businessName={businessName}
              businessPhone={businessPhone}
              umbrellaBusinessName={umbrellaBusinessName}
              printId="customer-loyalty-card-lookup"
            />
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
        <div ref={containerRef} className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                // Barcode scanners type fast then press Enter — trigger immediately
                if (e.key === 'Enter' && searchQuery.trim().length >= 2) {
                  e.preventDefault()
                  searchCustomers(searchQuery.trim())
                }
              }}
              onFocus={() => {
                setShowDropdown(true)
              }}
              placeholder="Search by name, ID or scan loyalty card..."
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
              className="absolute left-0 right-0 top-full mt-1 z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto"
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
                            {customer.phone && ` • ${formatPhone(customer.phone)}`}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* No Results / Error */}
              {searchQuery.length >= 2 && customers.length === 0 && !loading && (
                <div className="px-4 py-3 text-sm text-center">
                  {searchError
                    ? <span className="text-red-500">{searchError}</span>
                    : <span className="text-secondary">No customers found. Try a different search term.</span>
                  }
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
