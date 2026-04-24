'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { CustomerLoyaltyCard, PrintLoyaltyCardButton } from './customer-loyalty-card'

interface QuickRegisterCustomer {
  id: string
  customerNumber: string
  name: string
  phone?: string
  customerType: string
}

interface CustomerQuickRegisterProps {
  businessId: string
  businessName?: string
  businessPhone?: string
  umbrellaBusinessName?: string | null
  onCreated: (customer: QuickRegisterCustomer) => void
  onCancel: () => void
}

export function CustomerQuickRegister({ businessId, businessName, businessPhone, umbrellaBusinessName: umbrellaBusinessNameProp, onCreated, onCancel }: CustomerQuickRegisterProps) {
  const [umbrellaBusinessName, setUmbrellaBusinessName] = useState<string | null>(umbrellaBusinessNameProp ?? null)

  useEffect(() => {
    if (umbrellaBusinessNameProp) return
    fetch('/api/admin/umbrella-business')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        console.log('[CustomerQuickRegister] umbrella-business response:', data)
        if (data?.umbrellaBusinessName) setUmbrellaBusinessName(data.umbrellaBusinessName)
      })
      .catch(() => {})
  }, [])

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  const formatPhoneInput = (raw: string): string => {
    const hasPlus = raw.startsWith('+')
    const digits = raw.replace(/\D/g, '')
    if (hasPlus) {
      if (digits.length <= 3) return '+' + digits
      if (digits.length <= 5) return `+${digits.slice(0,3)} ${digits.slice(3)}`
      if (digits.length <= 8) return `+${digits.slice(0,3)} ${digits.slice(3,5)} ${digits.slice(5)}`
      return `+${digits.slice(0,3)} ${digits.slice(3,5)} ${digits.slice(5,8)} ${digits.slice(8,12)}`
    } else if (digits.startsWith('0')) {
      if (digits.length <= 3) return digits
      if (digits.length <= 6) return `${digits.slice(0,3)} ${digits.slice(3)}`
      if (digits.length <= 9) return `${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6)}`
      return `${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6,10)}`
    } else {
      if (digits.length <= 2) return digits
      if (digits.length <= 5) return `${digits.slice(0,2)} ${digits.slice(2)}`
      if (digits.length <= 8) return `${digits.slice(0,2)} ${digits.slice(2,5)} ${digits.slice(5)}`
      return `${digits.slice(0,2)} ${digits.slice(2,5)} ${digits.slice(5,9)}`
    }
  }
  const [error, setError] = useState<string | null>(null)
  // After creation: show card preview before handing off
  const [createdCustomer, setCreatedCustomer] = useState<QuickRegisterCustomer | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) { setError('Name is required'); return }
    const digitsOnly = phone.replace(/\D/g, '')
    if (!phone.trim()) { setError('Phone number is required'); return }
    if (digitsOnly.length < 9) { setError('Phone number must be at least 9 digits'); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          primaryPhone: phone.trim(),
          businessId
        })
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create customer')
      const c = data.customer
      const newCustomer: QuickRegisterCustomer = {
        id: c.id,
        customerNumber: c.customerNumber,
        name: c.name,
        phone: c.phone ?? undefined,
        customerType: c.customerType
      }
      // Show card preview instead of immediately calling onCreated
      setCreatedCustomer(newCustomer)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer')
    } finally {
      setSaving(false)
    }
  }

  // ── Card preview state (after successful creation) ────────────────────────
  if (createdCustomer) {
    return (
      <div className="border border-teal-200 dark:border-teal-800 rounded-lg p-3 bg-teal-50 dark:bg-teal-900/10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">Customer Created!</span>
        </div>

        {/* Card preview */}
        <div className="flex justify-center">
          <CustomerLoyaltyCard
            customer={{
              id: createdCustomer.id,
              customerNumber: createdCustomer.customerNumber,
              name: createdCustomer.name,
              phone: createdCustomer.phone,
            }}
            businessName={businessName}
            businessPhone={businessPhone}
            umbrellaBusinessName={umbrellaBusinessName}
          />
        </div>

        <PrintLoyaltyCardButton
          customer={{
            id: createdCustomer.id,
            customerNumber: createdCustomer.customerNumber,
            name: createdCustomer.name,
            phone: createdCustomer.phone,
          }}
          businessId={businessId}
          businessName={businessName}
          businessPhone={businessPhone}
        />

        <button
          type="button"
          onClick={() => onCreated(createdCustomer)}
          className="w-full py-1.5 text-sm border border-teal-400 text-teal-700 dark:text-teal-400 rounded-md hover:bg-teal-100 dark:hover:bg-teal-900/30"
        >
          Done — Select Customer
        </button>
      </div>
    )
  }

  // ── Registration form ─────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="border border-blue-200 dark:border-blue-800 rounded-lg p-3 bg-blue-50 dark:bg-blue-900/10 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">New Customer</span>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <input
        type="text"
        placeholder="Full name *"
        value={fullName}
        onChange={e => setFullName(e.target.value)}
        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        autoFocus
      />
      <input
        type="tel"
        placeholder="Phone number *"
        value={phone}
        onChange={e => setPhone(formatPhoneInput(e.target.value))}
        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="w-full py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Creating...' : 'Create & Select'}
      </button>
    </form>
  )
}
