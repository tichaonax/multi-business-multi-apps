'use client'

import { useState, useEffect } from 'react'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'

interface Lender {
  id: string
  name: string
  lenderType: string
  phone?: string | null
  email?: string | null
}

interface LenderSelectorProps {
  value: string
  onChange: (lenderId: string, lenderName: string) => void
  error?: string
  label?: string
}

export function LenderSelector({ value, onChange, error, label = 'Lender' }: LenderSelectorProps) {
  const [lenders, setLenders] = useState<Lender[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('BANK')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadLenders()
  }, [])

  const loadLenders = async () => {
    try {
      const res = await fetch('/api/expense-account/lenders', { credentials: 'include' })
      const data = await res.json()
      setLenders(data.data?.lenders || [])
    } catch {}
    finally { setLoading(false) }
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/expense-account/lenders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newName.trim(),
          lenderType: newType,
          phone: newPhone || null,
          email: newEmail.trim() || null,
          notes: newNotes.trim() || null,
        }),
      })
      const data = await res.json()
      if (res.ok && data.data?.lender) {
        const created = data.data.lender
        setLenders(prev => [...prev, created])
        onChange(created.id, created.name)
        setShowCreate(false)
        resetCreate()
      }
    } catch {}
    finally { setCreating(false) }
  }

  const resetCreate = () => {
    setNewName('')
    setNewType('BANK')
    setNewPhone('')
    setNewEmail('')
    setNewNotes('')
  }

  const typeLabel = { BANK: '🏦 Bank', INDIVIDUAL: '👤 Individual', OTHER: '🙉 Other' }

  const grouped = {
    BANK: lenders.filter(l => l.lenderType === 'BANK'),
    INDIVIDUAL: lenders.filter(l => l.lenderType === 'INDIVIDUAL'),
    OTHER: lenders.filter(l => l.lenderType === 'OTHER'),
  }

  return (
    <div>
      <label className="block text-sm font-medium text-secondary mb-1">
        {label} <span className="text-red-500">*</span>
      </label>

      {loading ? (
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      ) : (
        <select
          value={value}
          onChange={(e) => {
            const lender = lenders.find(l => l.id === e.target.value)
            onChange(e.target.value, lender?.name || '')
          }}
          className={`w-full px-3 py-2 border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500' : 'border-border'
          }`}
        >
          <option value="">-- Select lender --</option>
          {Object.entries(grouped).map(([type, items]) =>
            items.length > 0 ? (
              <optgroup key={type} label={typeLabel[type as keyof typeof typeLabel]}>
                {items.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </optgroup>
            ) : null
          )}
        </select>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {!showCreate ? (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="text-xs text-blue-600 dark:text-blue-400 mt-1 hover:underline"
        >
          + Add new lender
        </button>
      ) : (
        <div className="mt-2 p-3 border border-border rounded-md bg-background space-y-2">
          <p className="text-xs font-medium text-secondary">New Lender</p>

          <div>
            <label className="text-xs text-secondary mb-0.5 block">Name *</label>
            <input
              type="text"
              placeholder="Lender name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background text-primary"
            />
          </div>

          <div>
            <label className="text-xs text-secondary mb-0.5 block">Type</label>
            <select
              value={newType}
              onChange={e => setNewType(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background text-primary"
            >
              <option value="BANK">🏦 Bank</option>
              <option value="INDIVIDUAL">👤 Individual</option>
              <option value="OTHER">🙉 Other</option>
            </select>
          </div>

          <div>
            <PhoneNumberInput
              value={newPhone}
              onChange={(full) => setNewPhone(full)}
              label="Phone"
              placeholder="77 123 4567"
            />
          </div>

          <div>
            <label className="text-xs text-secondary mb-0.5 block">Email</label>
            <input
              type="email"
              placeholder="email@example.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background text-primary"
            />
          </div>

          <div>
            <label className="text-xs text-secondary mb-0.5 block">Notes</label>
            <textarea
              placeholder="Optional notes"
              value={newNotes}
              onChange={e => setNewNotes(e.target.value)}
              rows={2}
              className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background text-primary"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Adding...' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreate(false); resetCreate() }}
              className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-secondary rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
