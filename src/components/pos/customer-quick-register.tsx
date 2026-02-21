'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface QuickRegisterCustomer {
  id: string
  customerNumber: string
  name: string
  phone?: string
  customerType: string
}

interface CustomerQuickRegisterProps {
  businessId: string
  onCreated: (customer: QuickRegisterCustomer) => void
  onCancel: () => void
}

export function CustomerQuickRegister({ businessId, onCreated, onCancel }: CustomerQuickRegisterProps) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) { setError('Name is required'); return }
    if (!phone.trim()) { setError('Phone number is required'); return }
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
      onCreated({ id: c.id, customerNumber: c.customerNumber, name: c.name, phone: c.phone ?? undefined, customerType: c.customerType })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer')
    } finally {
      setSaving(false)
    }
  }

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
        onChange={e => setPhone(e.target.value)}
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
