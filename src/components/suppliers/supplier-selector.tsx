'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSession } from 'next-auth/react'
import { hasPermission } from '@/lib/permission-utils'
import { SupplierEditor } from './supplier-editor'

// Helper to check if a string is a valid emoji character (not text)
function isValidEmoji(str: string | null | undefined): boolean {
  if (!str || str.trim().length === 0) return false;
  const emojiRegex = /[\p{Emoji}\p{Emoji_Presentation}]/u;
  return emojiRegex.test(str);
}

interface Supplier {
  id: string
  name: string
  emoji?: string | null
  supplierNumber: string
}

interface SupplierSelectorProps {
  businessId: string
  value?: string | null
  onChange: (supplierId: string | null) => void
  placeholder?: string
  canCreate?: boolean
  className?: string
}

export function SupplierSelector({
  businessId,
  value,
  onChange,
  placeholder = 'Select supplier...',
  canCreate = false,
  className = ''
}: SupplierSelectorProps) {
  const { data: session } = useSession()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  const userCanCreate = session?.user ? hasPermission(session.user, 'canCreateSuppliers') : false
  const allowCreate = canCreate && userCanCreate

  // Track client-side mounting for portal
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    fetchSuppliers()
  }, [businessId])

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('isActive', 'true')
      params.append('limit', '100')

      const response = await fetch(`/api/business/${businessId}/suppliers?${params}`)
      if (!response.ok) throw new Error('Failed to fetch suppliers')

      const data = await response.json()
      setSuppliers(data.suppliers || [])
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      setSuppliers([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (supplierId: string | null) => {
    onChange(supplierId)
    setShowDropdown(false)
    setSearchQuery('')
  }

  const handleCreate = () => {
    setShowDropdown(false)
    setShowEditor(true)
  }

  const handleSave = async (createdSupplierId?: string) => {
    setShowEditor(false)
    await fetchSuppliers()
    // Auto-select the newly created supplier
    if (createdSupplierId) {
      onChange(createdSupplierId)
    }
  }

  const selectedSupplier = suppliers.find(s => s.id === value)

  const filteredSuppliers = searchQuery
    ? suppliers.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.supplierNumber.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : suppliers

  return (
    <>
      <div className={`relative ${className}`}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-left flex items-center justify-between hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
          >
            <span className="flex items-center gap-2">
              {selectedSupplier ? (
                <>
                  {isValidEmoji(selectedSupplier.emoji) && <span>{selectedSupplier.emoji}</span>}
                  <span>{selectedSupplier.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({selectedSupplier.supplierNumber})
                  </span>
                </>
              ) : (
                <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
              )}
            </span>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${showDropdown ? 'transform rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col">
              {/* Info Banner */}
              <div className="px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    Suppliers are shared across all businesses of the same type
                  </p>
                </div>
              </div>

              {/* Search */}
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search suppliers..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  autoFocus
                />
              </div>

              {/* Options List */}
              <div className="overflow-y-auto flex-1">
                {loading ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent"></div>
                  </div>
                ) : (
                  <>
                    {/* Clear Selection Option */}
                    {value && (
                      <button
                        type="button"
                        onClick={() => handleSelect(null)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 text-sm border-b border-gray-200 dark:border-gray-700"
                      >
                        <span className="italic">No supplier</span>
                      </button>
                    )}

                    {/* Suppliers List */}
                    {filteredSuppliers.length > 0 ? (
                      filteredSuppliers.map(supplier => (
                        <button
                          key={supplier.id}
                          type="button"
                          onClick={() => handleSelect(supplier.id)}
                          className={`w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2 ${
                            value === supplier.id ? 'bg-blue-100 dark:bg-blue-900/40' : ''
                          }`}
                        >
                          {isValidEmoji(supplier.emoji) && <span className="text-lg">{supplier.emoji}</span>}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {supplier.name}
                              </span>
                              <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-medium rounded" title="Shared across same business type">
                                SHARED
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {supplier.supplierNumber}
                            </div>
                          </div>
                          {value === supplier.id && (
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                        {searchQuery ? 'No suppliers found' : 'No suppliers available'}
                      </div>
                    )}

                    {/* Create New Option */}
                    {allowCreate && (
                      <button
                        type="button"
                        onClick={handleCreate}
                        className="w-full px-3 py-2 text-left hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 font-medium text-sm border-t border-gray-200 dark:border-gray-700 flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create New Supplier
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Click outside to close */}
        {showDropdown && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
        )}
      </div>

      {/* Editor Modal - rendered via portal to avoid nested forms */}
      {showEditor && isMounted && createPortal(
        <SupplierEditor
          businessId={businessId}
          onSave={handleSave}
          onCancel={() => setShowEditor(false)}
        />,
        document.body
      )}
    </>
  )
}
