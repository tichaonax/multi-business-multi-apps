'use client'

import { useState, useEffect, useCallback } from 'react'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'

interface Supplier {
  id: string
  name: string
  contactPerson?: string | null
  phone?: string | null
  email?: string | null
  supplierType?: string | null
}

interface LandlordSelectProps {
  businessId: string
  businessType: string
  value: string
  onChange: (supplierId: string) => void
  disabled?: boolean
  initialSupplier?: { id: string; name: string } | null
}

export function LandlordSelect({ businessId, businessType, value, onChange, disabled, initialSupplier }: LandlordSelectProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [focused, setFocused] = useState(false)
  const [quickAdd, setQuickAdd] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    taxId: '',
  })
  const [error, setError] = useState<string | null>(null)

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/business/${businessId}/suppliers?isActive=true&limit=200&supplierType=LANDLORD`)
      if (res.ok) {
        const data = await res.json()
        const list: Supplier[] = data.suppliers || data.data || data || []
        // Sort landlords to the top
        list.sort((a, b) => {
          if (a.supplierType === 'LANDLORD' && b.supplierType !== 'LANDLORD') return -1
          if (b.supplierType === 'LANDLORD' && a.supplierType !== 'LANDLORD') return 1
          return a.name.localeCompare(b.name)
        })
        setSuppliers(list)
      }
    } catch {
      // silently fail — user can still type
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  const filtered = search
    ? suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : suppliers

  // Fall back to initialSupplier for immediate display before the suppliers list loads
  const selectedSupplier = suppliers.find(s => s.id === value)
    ?? (value && initialSupplier?.id === value ? { ...initialSupplier, supplierType: 'LANDLORD' } as Supplier : undefined)

  // Show dropdown when searching OR when focused with nothing selected
  const showDropdown = search.length > 0 || (focused && !value)
  const hasResults = filtered.length > 0

  const handleQuickAddSave = async () => {
    if (!quickAdd.name.trim()) {
      setError('Landlord name is required')
      return
    }
    if (!quickAdd.phone.trim()) {
      setError('Phone number is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/business/${businessId}/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickAdd.name,
          contactPerson: quickAdd.contactPerson || null,
          phone: quickAdd.phone,
          email: quickAdd.email || null,
          address: quickAdd.address || null,
          taxId: quickAdd.taxId || null,
          businessType,
          supplierType: 'LANDLORD',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create landlord')

      const newSupplier: Supplier = data.supplier || data.data || data
      setSuppliers(prev => [{ ...newSupplier, supplierType: 'LANDLORD' }, ...prev])
      onChange(newSupplier.id)
      setShowQuickAdd(false)
      setQuickAdd({ name: '', contactPerson: '', phone: '', email: '', address: '', taxId: '' })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          {!showQuickAdd && (
            <div className="relative">
              <input
                type="text"
                value={search || selectedSupplier?.name || ''}
                onChange={e => {
                  const val = e.target.value
                  setSearch(val)
                  // Clear the selection as soon as user starts typing a new search
                  if (value) onChange('')
                  if (!val) setSearch('')
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 150)}
                placeholder="Search suppliers..."
                disabled={disabled || loading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {showDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {hasResults ? filtered.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-primary"
                      onClick={() => {
                        onChange(s.id)
                        setSearch('')
                        setFocused(false)
                      }}
                    >
                      <span className="font-medium">{s.name}</span>
                      {s.supplierType === 'LANDLORD' && (
                        <span className="ml-2 text-xs text-orange-600 dark:text-orange-400 font-medium">🏠 Landlord</span>
                      )}
                      {s.contactPerson && (
                        <span className="ml-2 text-xs text-gray-500">({s.contactPerson})</span>
                      )}
                    </button>
                  )) : (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      {search ? `No suppliers matching "${search}"` : 'No suppliers yet'} — use <span className="font-medium text-orange-600 dark:text-orange-400">+ Add Landlord</span>
                    </div>
                  )}
                </div>
              )}
              {selectedSupplier && !search && (
                <div className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  ✓ {selectedSupplier.name}
                  {selectedSupplier.supplierType === 'LANDLORD' && ' 🏠'}
                  <button
                    type="button"
                    className="ml-1 text-gray-400 hover:text-gray-600"
                    onClick={() => onChange('')}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowQuickAdd(!showQuickAdd)}
          className="px-3 py-2 text-sm bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700 rounded-md hover:bg-orange-100 whitespace-nowrap"
          disabled={disabled}
        >
          {showQuickAdd ? 'Cancel' : '+ Add Landlord'}
        </button>
      </div>

      {showQuickAdd && (
        <div className="border border-orange-200 dark:border-orange-700 rounded-md p-3 bg-orange-50 dark:bg-orange-900/10 space-y-2">
          <p className="text-xs font-medium text-orange-700 dark:text-orange-300">🏠 New Landlord</p>
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="Landlord / company name"
              value={quickAdd.name}
              onChange={e => setQuickAdd({ ...quickAdd, name: e.target.value })}
              className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Contact person <span className="text-gray-400">(optional)</span></label>
              <input
                type="text"
                placeholder="Contact person"
                value={quickAdd.contactPerson}
                onChange={e => setQuickAdd({ ...quickAdd, contactPerson: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Phone <span className="text-red-500">*</span></label>
              <PhoneNumberInput
                value={quickAdd.phone}
                onChange={(full) => setQuickAdd({ ...quickAdd, phone: full })}
                label=""
                placeholder="77 123 4567"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Email <span className="text-gray-400">(optional)</span></label>
              <input
                type="email"
                placeholder="landlord@email.com"
                value={quickAdd.email}
                onChange={e => setQuickAdd({ ...quickAdd, email: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Tax ID <span className="text-gray-400">(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. BP12345678"
                value={quickAdd.taxId}
                onChange={e => setQuickAdd({ ...quickAdd, taxId: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Property address <span className="text-gray-400">(optional)</span></label>
            <input
              type="text"
              placeholder="Property address"
              value={quickAdd.address}
              onChange={e => setQuickAdd({ ...quickAdd, address: e.target.value })}
              className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-primary"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleQuickAddSave}
              disabled={saving}
              className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Landlord'}
            </button>
            <button
              type="button"
              onClick={() => { setShowQuickAdd(false); setError(null) }}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded text-secondary hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
