'use client'

import { useState, useEffect } from 'react'

interface Payee {
  id: string
  type: 'USER' | 'EMPLOYEE' | 'PERSON' | 'BUSINESS'
  name: string
  identifier?: string // employee number, national ID, etc.
  email?: string
}

interface PayeeSelectorProps {
  value?: { type: string; id: string } | null
  onChange: (payee: { type: string; id: string; name: string } | null) => void
  onCreateIndividual?: () => void
  onCreateSupplier?: () => void
  disabled?: boolean
  error?: string
  refreshTrigger?: number  // Increment this to trigger a refresh
}

export function PayeeSelector({
  value,
  onChange,
  onCreateIndividual,
  onCreateSupplier,
  disabled = false,
  error,
  refreshTrigger = 0
}: PayeeSelectorProps) {
  const [payees, setPayees] = useState<Record<string, Payee[]>>({
    USER: [],
    EMPLOYEE: [],
    PERSON: [],
    BUSINESS: [],
    SUPPLIER: []
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // Load payees on mount and when refreshTrigger changes
  useEffect(() => {
    loadPayees()
  }, [refreshTrigger])

  const loadPayees = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/expense-account/payees', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setPayees({
          USER: data.data.users || [],
          EMPLOYEE: data.data.employees || [],
          PERSON: data.data.persons || [],
          BUSINESS: data.data.businesses || [],
          SUPPLIER: data.data.suppliers || []
        })
      }
    } catch (error) {
      console.error('Error loading payees:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSelectedPayeeDisplay = () => {
    if (!value) return 'Select a payee...'

    const typePayees = payees[value.type as keyof typeof payees] || []
    const selected = typePayees.find(p => p.id === value.id)

    if (!selected) {
      // If the selected payee isn't yet in the loaded payee lists (e.g., newly created),
      // show the provided value.name as a fallback so the user sees their selection immediately
      if ((value as any)?.name) {
        const v: any = value
        const badge = getTypeBadge(v.type)
        const identifier = v?.identifier ? ` (${v.identifier})` : ''
        return (
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${badge.className}`}>
              {badge.label}
            </span>
            <span>{v.name}{identifier}</span>
          </div>
        )
      }
      return 'Select a payee...'
    }

    const badge = getTypeBadge(selected.type)
    const identifier = selected.identifier ? ` (${selected.identifier})` : ''

    return (
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 text-xs font-medium rounded ${badge.className}`}>
          {badge.label}
        </span>
        <span>{selected.name}{identifier}</span>
      </div>
    )
  }

  const getTypeBadge = (type: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      USER: { label: 'User', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
      EMPLOYEE: { label: 'Employee', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
      PERSON: { label: 'Individual', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
      BUSINESS: { label: 'Business', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
      SUPPLIER: { label: 'Supplier', className: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300' }
    }
    return badges[type] || { label: type, className: 'bg-gray-100 text-gray-800' }
  }

  const filterPayees = (payeeList: Payee[]) => {
    if (!searchQuery) return payeeList

    const query = searchQuery.toLowerCase()
    return payeeList.filter(payee =>
      payee.name.toLowerCase().includes(query) ||
      payee.identifier?.toLowerCase().includes(query) ||
      payee.email?.toLowerCase().includes(query)
    )
  }

  const handleSelect = (type: string, payee: Payee) => {
    onChange({ type, id: payee.id, name: payee.name })
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleClear = () => {
    onChange(null)
  }

  const allPayeesCount = Object.values(payees).reduce((sum, list) => sum + (list?.length || 0), 0)

  if (loading) {
    return (
      <div className="w-full">
        <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-600 rounded"></div>
        <p className="mt-1 text-xs text-gray-500">Loading payees...</p>
      </div>
    )
  }

  return (
    <div className="relative w-full">
      {/* Selected Value Display / Trigger */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`flex-1 px-3 py-2 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          } ${disabled ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : 'bg-white dark:bg-gray-800'}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {getSelectedPayeeDisplay()}
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            title="Clear selection"
            className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-96 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search payees..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* Payee List */}
          <div className="max-h-60 overflow-y-auto">
            {allPayeesCount === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No payees found
              </div>
            ) : (
              <>
                {/* Users */}
                {filterPayees(payees.USER).length > 0 && (
                  <div>
                    <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                      Users
                    </div>
                    {filterPayees(payees.USER).map(payee => (
                      <button
                        key={payee.id}
                        type="button"
                        onClick={() => handleSelect('USER', payee)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{payee.name}</div>
                          {payee.email && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{payee.email}</div>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getTypeBadge('USER').className}`}>
                          {getTypeBadge('USER').label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Employees */}
                {filterPayees(payees.EMPLOYEE).length > 0 && (
                  <div>
                    <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                      Employees
                    </div>
                    {filterPayees(payees.EMPLOYEE).map(payee => (
                      <button
                        key={payee.id}
                        type="button"
                        onClick={() => handleSelect('EMPLOYEE', payee)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{payee.name}</div>
                          {payee.identifier && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">Employee #: {payee.identifier}</div>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getTypeBadge('EMPLOYEE').className}`}>
                          {getTypeBadge('EMPLOYEE').label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Individuals/Persons */}
                {filterPayees(payees.PERSON).length > 0 && (
                  <div>
                    <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                      Individuals
                    </div>
                    {filterPayees(payees.PERSON).map(payee => (
                      <button
                        key={payee.id}
                        type="button"
                        onClick={() => handleSelect('PERSON', payee)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{payee.name}</div>
                          {payee.identifier && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">ID: {payee.identifier}</div>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getTypeBadge('PERSON').className}`}>
                          {getTypeBadge('PERSON').label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Businesses */}
                {filterPayees(payees.BUSINESS).length > 0 && (
                  <div>
                    <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                      Businesses
                    </div>
                    {filterPayees(payees.BUSINESS).map(payee => (
                      <button
                        key={payee.id}
                        type="button"
                        onClick={() => handleSelect('BUSINESS', payee)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{payee.name}</div>
                          {payee.identifier && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{payee.identifier}</div>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getTypeBadge('BUSINESS').className}`}>
                          {getTypeBadge('BUSINESS').label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Suppliers */}
                {filterPayees(payees.SUPPLIER).length > 0 && (
                  <div>
                    <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                      Suppliers
                    </div>
                    {filterPayees(payees.SUPPLIER).map(payee => (
                      <button
                        key={payee.id}
                        type="button"
                        onClick={() => handleSelect('SUPPLIER', payee)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{payee.name}</div>
                          {payee.identifier && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">#{payee.identifier}</div>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getTypeBadge('SUPPLIER').className}`}>
                          {getTypeBadge('SUPPLIER').label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              {onCreateIndividual && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    onCreateIndividual()
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  + Individual
                </button>
              )}
              {onCreateSupplier && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    onCreateSupplier()
                  }}
                  className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium"
                >
                  + Supplier
                </button>
              )}
            </div>
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="ml-auto text-sm text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
