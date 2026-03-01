'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
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
  const { hasPermission } = useBusinessPermissionsContext()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const wrapperRef = useRef<HTMLDivElement>(null)

  const userCanCreate = hasPermission('canCreateSuppliers')
  const allowCreate = canCreate && userCanCreate

  const positionDropdown = useCallback(() => {
    if (!wrapperRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const dropdownHeight = 280 // approximate max-height
    if (spaceBelow >= dropdownHeight || spaceBelow >= 160) {
      // Open downward
      setDropdownStyle({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    } else {
      // Open upward
      setDropdownStyle({ bottom: window.innerHeight - rect.top + 4, left: rect.left, width: rect.width })
    }
  }, [])

  const openDropdown = useCallback(() => {
    positionDropdown()
    setShowDropdown(true)
  }, [positionDropdown])

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
      <div ref={wrapperRef} className={`relative ${className}`}>
        <div className="relative">
          <button
            type="button"
            onClick={() => showDropdown ? setShowDropdown(false) : openDropdown()}
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

          {showDropdown && isMounted && createPortal(
            <div
              className="fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-72 overflow-hidden flex flex-col"
              style={dropdownStyle}
            >
              {/* Header: search + create button always visible */}
              <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 flex-shrink-0">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search suppliers..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  autoFocus
                />
                {allowCreate && (
                  <button
                    type="button"
                    onClick={handleCreate}
                    className="flex-shrink-0 flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded whitespace-nowrap"
                    title="Create New Supplier"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New
                  </button>
                )}
              </div>

              {/* Options List — scrollable */}
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

                  </>
                )}
              </div>
            </div>,
            document.body
          )}
        </div>

        {/* Click outside to close — behind the dropdown portal (z-9998 vs z-9999) */}
        {showDropdown && isMounted && createPortal(
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => { setShowDropdown(false); setSearchQuery('') }}
          />,
          document.body
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
