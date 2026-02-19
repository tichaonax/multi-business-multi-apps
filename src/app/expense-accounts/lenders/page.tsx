'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { ContentLayout } from '@/components/layout/content-layout'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { useToastContext } from '@/components/ui/toast'

interface Lender {
  id: string
  name: string
  lenderType: string
  phone: string | null
  email: string | null
  notes: string | null
  isDefault: boolean
  isUserCreated: boolean
  isActive: boolean
}

const TYPE_LABELS: Record<string, string> = {
  BANK: '🏦 Bank',
  INDIVIDUAL: '👤 Individual',
  OTHER: '🙉 Other',
}

const EMPTY_FORM = { name: '', lenderType: 'INDIVIDUAL', phone: '', email: '', notes: '' }

export default function LendersPage() {
  const toast = useToastContext()
  const [lenders, setLenders] = useState<Lender[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Create form
  const [createForm, setCreateForm] = useState(EMPTY_FORM)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadLenders() }, [])

  const loadLenders = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/expense-account/lenders?includeInactive=true', { credentials: 'include' })
      const data = await res.json()
      setLenders(data.data?.lenders || [])
    } catch { toast.push('Failed to load lenders') }
    finally { setLoading(false) }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.name.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/expense-account/lenders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...createForm,
          name: createForm.name.trim(),
          phone: createForm.phone || null,
          email: createForm.email.trim() || null,
          notes: createForm.notes.trim() || null,
        }),
      })
      if (res.ok) {
        toast.push('Lender created')
        setCreateForm(EMPTY_FORM)
        setShowCreate(false)
        loadLenders()
      } else {
        const d = await res.json()
        toast.push(d.error || 'Failed to create lender')
      }
    } catch { toast.push('Failed to create lender') }
    finally { setSubmitting(false) }
  }

  const startEdit = (lender: Lender) => {
    setEditingId(lender.id)
    setEditForm({
      name: lender.name,
      lenderType: lender.lenderType,
      phone: lender.phone || '',
      email: lender.email || '',
      notes: lender.notes || '',
    })
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editForm.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/expense-account/lenders/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editForm.name.trim(),
          lenderType: editForm.lenderType,
          phone: editForm.phone || null,
          email: editForm.email.trim() || null,
          notes: editForm.notes.trim() || null,
        }),
      })
      if (res.ok) {
        toast.push('Lender updated')
        setEditingId(null)
        loadLenders()
      } else {
        const d = await res.json()
        toast.push(d.error || 'Failed to update lender')
      }
    } catch { toast.push('Failed to update lender') }
    finally { setSaving(false) }
  }

  const handleDeactivate = async (lender: Lender) => {
    // Lenders with loan history are kept (soft deactivate only — no hard delete)
    try {
      const res = await fetch(`/api/expense-account/lenders/${lender.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: false }),
      })
      if (res.ok) {
        toast.push(`${lender.name} deactivated`)
        loadLenders()
      } else {
        toast.push('Failed to deactivate lender')
      }
    } catch { toast.push('Failed to deactivate lender') }
  }

  const handleReactivate = async (lender: Lender) => {
    try {
      const res = await fetch(`/api/expense-account/lenders/${lender.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: true }),
      })
      if (res.ok) {
        toast.push(`${lender.name} reactivated`)
        loadLenders()
      } else {
        toast.push('Failed to reactivate lender')
      }
    } catch { toast.push('Failed to reactivate lender') }
  }

  const grouped = {
    BANK: lenders.filter(l => l.lenderType === 'BANK'),
    INDIVIDUAL: lenders.filter(l => l.lenderType === 'INDIVIDUAL'),
    OTHER: lenders.filter(l => l.lenderType === 'OTHER'),
  }

  return (
    <ContentLayout title="Lenders" subtitle="Manage loan lenders for expense accounts">
      <div className="space-y-6 max-w-3xl">

        {/* Header */}
        <div className="flex justify-end">
          <button
            onClick={() => { setShowCreate(!showCreate); setEditingId(null) }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            {showCreate ? 'Cancel' : '+ Add Lender'}
          </button>
        </div>

        {/* Create Form */}
        {showCreate && (
          <form onSubmit={handleCreate} className="card p-5 space-y-4">
            <h3 className="font-semibold text-primary">New Lender</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-secondary mb-1 block">Name *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                  required
                  placeholder="e.g. Tichaona Hwandaza"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-secondary mb-1 block">Type</label>
                <select
                  value={createForm.lenderType}
                  onChange={e => setCreateForm({ ...createForm, lenderType: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary text-sm"
                >
                  <option value="BANK">🏦 Bank</option>
                  <option value="INDIVIDUAL">👤 Individual</option>
                  <option value="OTHER">🙉 Other</option>
                </select>
              </div>
              <div className="col-span-2">
                <PhoneNumberInput
                  value={createForm.phone}
                  onChange={(full) => setCreateForm({ ...createForm, phone: full })}
                  label="Phone"
                  placeholder="77 123 4567"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-secondary mb-1 block">Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="e.g. tichaonax@gmail.com"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-secondary mb-1 block">Notes</label>
                <textarea
                  value={createForm.notes}
                  onChange={e => setCreateForm({ ...createForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => { setShowCreate(false); setCreateForm(EMPTY_FORM) }}
                className="px-4 py-2 text-sm border border-border rounded-md text-secondary hover:bg-muted">
                Cancel
              </button>
              <button type="submit" disabled={submitting || !createForm.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
                {submitting ? 'Creating...' : 'Create Lender'}
              </button>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Note: Lenders cannot be deleted once they are attached to a loan transaction.
            </p>
          </form>
        )}

        {/* Lender List */}
        {loading ? (
          <div className="text-secondary text-sm">Loading lenders...</div>
        ) : lenders.length === 0 ? (
          <div className="text-center py-10 text-secondary text-sm">No lenders yet. Add one above.</div>
        ) : (
          Object.entries(grouped).map(([type, items]) =>
            items.length > 0 ? (
              <div key={type}>
                <h3 className="text-sm font-semibold text-secondary mb-2">{TYPE_LABELS[type]}</h3>
                <div className="space-y-2">
                  {items.map(lender => (
                    <div key={lender.id} className={`card px-4 py-3 ${!lender.isActive ? 'opacity-60' : ''}`}>
                      {editingId === lender.id ? (
                        /* ── Inline Edit Form ── */
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-secondary">Edit Lender</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-secondary mb-0.5 block">Name *</label>
                              <input
                                type="text"
                                value={editForm.name}
                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background text-primary"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-secondary mb-0.5 block">Type</label>
                              <select
                                value={editForm.lenderType}
                                onChange={e => setEditForm({ ...editForm, lenderType: e.target.value })}
                                className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background text-primary"
                              >
                                <option value="BANK">🏦 Bank</option>
                                <option value="INDIVIDUAL">👤 Individual</option>
                                <option value="OTHER">🙉 Other</option>
                              </select>
                            </div>
                            <div className="col-span-2">
                              <PhoneNumberInput
                                value={editForm.phone}
                                onChange={(full) => setEditForm({ ...editForm, phone: full })}
                                label="Phone"
                                placeholder="77 123 4567"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="text-xs text-secondary mb-0.5 block">Email</label>
                              <input
                                type="email"
                                value={editForm.email}
                                onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background text-primary"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="text-xs text-secondary mb-0.5 block">Notes</label>
                              <textarea
                                value={editForm.notes}
                                onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                rows={2}
                                className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background text-primary"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveEdit}
                              disabled={saving || !editForm.name.trim()}
                              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                              {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1.5 text-xs border border-border rounded-md text-secondary hover:bg-muted"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ── Display Row ── */
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-primary text-sm">{lender.name}</p>
                              {!lender.isActive && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-secondary">Inactive</span>
                              )}
                              {lender.isDefault && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-secondary">Default</span>
                              )}
                            </div>
                            <p className="text-xs text-secondary mt-0.5">
                              {[lender.phone, lender.email].filter(Boolean).join(' · ') || 'No contact info'}
                            </p>
                            {lender.notes && (
                              <p className="text-xs text-secondary/70 mt-0.5 italic truncate max-w-xs">{lender.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => startEdit(lender)}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Edit
                            </button>
                            {lender.isActive ? (
                              <button
                                onClick={() => handleDeactivate(lender)}
                                className="text-xs text-orange-500 hover:underline"
                                title="Deactivate (hides from new loan selections but preserves history)"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReactivate(lender)}
                                className="text-xs text-green-600 dark:text-green-400 hover:underline"
                              >
                                Reactivate
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )
        )}

        <p className="text-xs text-gray-400 dark:text-gray-600">
          Lenders attached to loan transactions cannot be permanently deleted — use Deactivate to hide them from new selections.
        </p>
      </div>
    </ContentLayout>
  )
}
