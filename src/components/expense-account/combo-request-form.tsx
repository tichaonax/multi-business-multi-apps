'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToastContext } from '@/components/ui/toast'
import { ComboRequestSection, ComboSection, SectionType } from './combo-request-section'
import { ComboItem, Domain } from './combo-request-item-row'

interface ComboRequestFormProps {
  accountId: string
}

function newItem(): ComboItem {
  return {
    _id: crypto.randomUUID(),
    description: '',
    quantity: '',
    unit: '',
    unitPrice: '',
    estimatedAmount: '',
    categoryId: '',
    subcategoryId: '',
    payee: null,
    notes: '',
  }
}

function newSection(type: SectionType = 'GROCERY'): ComboSection {
  return {
    _id: crypto.randomUUID(),
    sectionType: type,
    sectionName: '',
    payee: null,
    notes: '',
    items: [newItem()],
  }
}

function serializeSections(sections: ComboSection[]) {
  return sections.map((s, sIdx) => ({
    sectionType: s.sectionType,
    sectionName: s.sectionName.trim() || null,
    payeeType: s.payee?.type || null,
    payeePersonId: s.payee?.type === 'PERSON' ? s.payee.id : null,
    payeeUserId: s.payee?.type === 'USER' ? s.payee.id : null,
    payeeEmployeeId: s.payee?.type === 'EMPLOYEE' ? s.payee.id : null,
    payeeBusinessId: s.payee?.type === 'BUSINESS' ? s.payee.id : null,
    payeeSupplierId: s.payee?.type === 'SUPPLIER' ? s.payee.id : null,
    notes: s.notes.trim() || null,
    sortOrder: sIdx,
    items: s.items
      .filter(i => i.description.trim())
      .map((item, iIdx) => ({
        description: item.description.trim(),
        quantity: item.quantity ? Number(item.quantity) : null,
        unit: item.unit.trim() || null,
        estimatedAmount: item.estimatedAmount ? Number(item.estimatedAmount) : null,
        categoryId: item.categoryId || null,
        subcategoryId: item.subcategoryId || null,
        payeeType: item.payee?.type || null,
        payeePersonId: item.payee?.type === 'PERSON' ? item.payee.id : null,
        payeeUserId: item.payee?.type === 'USER' ? item.payee.id : null,
        payeeEmployeeId: item.payee?.type === 'EMPLOYEE' ? item.payee.id : null,
        payeeBusinessId: item.payee?.type === 'BUSINESS' ? item.payee.id : null,
        payeeSupplierId: item.payee?.type === 'SUPPLIER' ? item.payee.id : null,
        notes: item.notes.trim() || null,
        sortOrder: iIdx,
      })),
  }))
}

export function ComboRequestForm({ accountId }: ComboRequestFormProps) {
  const router = useRouter()
  const toast = useToastContext()

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [sections, setSections] = useState<ComboSection[]>([newSection()])
  const [domains, setDomains] = useState<Domain[]>([])
  const [loadingDomains, setLoadingDomains] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/expense-categories/hierarchical', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        // API returns one wrapper: { domains: [{ expense_categories: [...] }] }
        // Domain-level entries are flagged with isDomainCategory: true
        const flat: any[] = data.domains?.[0]?.expense_categories ?? []
        const parsed: Domain[] = flat
          .filter((c: any) => c.isDomainCategory)
          .map((c: any) => ({
            id: c.id,
            label: `${c.emoji || ''} ${c.name}`.trim(),
          }))
        setDomains(parsed)
      })
      .catch(() => {})
      .finally(() => setLoadingDomains(false))
  }, [])

  const grandTotal = sections.reduce((sum, s) => {
    return sum + s.items.reduce((sSum, item) => {
      const amt = parseFloat(item.estimatedAmount)
      return sSum + (isNaN(amt) ? 0 : amt)
    }, 0)
  }, 0)

  function validate(): string | null {
    if (!title.trim()) return 'Title is required'
    const hasItems = sections.some(s => s.items.some(i => i.description.trim()))
    if (!hasItems) return 'At least one item with a description is required'
    return null
  }

  async function handleSaveDraft() {
    const error = validate()
    if (error) { toast.error(error); return }

    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        notes: notes.trim() || null,
        sections: serializeSections(sections),
        status: 'DRAFT',
      }

      let res: Response
      if (draftId) {
        res = await fetch(`/api/expense-account/${accountId}/combo-requests/${draftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`/api/expense-account/${accountId}/combo-requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
      }

      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to save draft'); return }

      setDraftId(data.data.id)
      toast.push('Draft saved')
    } catch {
      toast.error('Failed to save draft')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit() {
    const error = validate()
    if (error) { toast.error(error); return }

    setSubmitting(true)
    try {
      // Save or update draft first, then submit
      const payload = {
        title: title.trim(),
        notes: notes.trim() || null,
        sections: serializeSections(sections),
        status: 'DRAFT',
      }

      let requestId = draftId
      if (!requestId) {
        const createRes = await fetch(`/api/expense-account/${accountId}/combo-requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        const createData = await createRes.json()
        if (!createRes.ok) { toast.error(createData.error || 'Failed to create request'); return }
        requestId = createData.data.id
        setDraftId(requestId)
      } else {
        const updateRes = await fetch(`/api/expense-account/${accountId}/combo-requests/${requestId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        if (!updateRes.ok) {
          const d = await updateRes.json()
          toast.error(d.error || 'Failed to update request')
          return
        }
      }

      // Submit
      const submitRes = await fetch(`/api/expense-account/${accountId}/combo-requests/${requestId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      const submitData = await submitRes.json()
      if (!submitRes.ok) { toast.error(submitData.error || 'Failed to submit request'); return }

      toast.push('Request submitted successfully')
      router.push(`/expense-accounts/${accountId}`)
    } catch {
      toast.error('Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  function updateSection(index: number, updated: ComboSection) {
    setSections(prev => prev.map((s, i) => i === index ? updated : s))
  }

  function removeSection(index: number) {
    setSections(prev => {
      const next = prev.filter((_, i) => i !== index)
      return next.length > 0 ? next : [newSection()]
    })
  }

  function addSection() {
    setSections(prev => [...prev, newSection()])
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">New Combo Payment Request</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Bundle multiple expense items into a single payment request.</p>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Request Title *</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Monthly household expenses — May 2026"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Sections</h2>
          {loadingDomains && (
            <span className="text-xs text-gray-400">Loading categories...</span>
          )}
        </div>

        {sections.map((section, idx) => (
          <ComboRequestSection
            key={section._id}
            section={section}
            sectionIndex={idx}
            domains={domains}
            onChange={updated => updateSection(idx, updated)}
            onRemove={() => removeSection(idx)}
          />
        ))}

        <button
          type="button"
          onClick={addSection}
          className="w-full py-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 border-2 border-dashed border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 rounded-xl transition-colors"
        >
          + Add Section
        </button>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Request Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any additional context for the cashier..."
          rows={3}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Total + Actions */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 -mx-4 px-4 py-4 shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Estimated Total</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">${grandTotal.toFixed(2)}</div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push(`/expense-accounts/${accountId}`)}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || submitting}
              className="px-4 py-2 text-sm text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : draftId ? 'Update Draft' : 'Save Draft'}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || submitting}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
