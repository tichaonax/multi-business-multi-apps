'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToastContext } from '@/components/ui/toast'
import { ComboRequestSection, ComboSection, SectionType } from './combo-request-section'
import { ComboItem, Domain } from './combo-request-item-row'

interface ComboRequestFormProps {
  accountId: string
  requestId?: string
}

function newItem(): ComboItem {
  return {
    _id: crypto.randomUUID(),
    description: '',
    quantity: '',
    unit: '',
    unitPrice: '',
    estimatedAmount: '',
    domainId: '',
    categoryId: '',
    subcategoryId: '',
    payee: null,
    notes: '',
  }
}

function getPayeeId(record: {
  payeeType?: string | null
  payeePersonId?: string | null
  payeeUserId?: string | null
  payeeEmployeeId?: string | null
  payeeBusinessId?: string | null
  payeeSupplierId?: string | null
}): string | null {
  switch (record.payeeType) {
    case 'PERSON':   return record.payeePersonId ?? null
    case 'USER':     return record.payeeUserId ?? null
    case 'EMPLOYEE': return record.payeeEmployeeId ?? null
    case 'BUSINESS': return record.payeeBusinessId ?? null
    case 'SUPPLIER': return record.payeeSupplierId ?? null
    default:         return null
  }
}

function resolvePayeeName(record: {
  payeeType?: string | null
  payeePerson?: { fullName: string } | null
  payeeUser?: { name: string } | null
  payeeEmployee?: { fullName: string } | null
  payeeBusiness?: { name: string } | null
  payeeSupplier?: { name: string } | null
}): string | null {
  switch (record.payeeType) {
    case 'PERSON':   return record.payeePerson?.fullName ?? null
    case 'USER':     return record.payeeUser?.name ?? null
    case 'EMPLOYEE': return record.payeeEmployee?.fullName ?? null
    case 'BUSINESS': return record.payeeBusiness?.name ?? null
    case 'SUPPLIER': return record.payeeSupplier?.name ?? null
    default:         return null
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

export function ComboRequestForm({ accountId, requestId }: ComboRequestFormProps) {
  const router = useRouter()
  const toast = useToastContext()

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [sections, setSections] = useState<ComboSection[]>([newSection()])
  const [domains, setDomains] = useState<Domain[]>([])
  const [loadingDomains, setLoadingDomains] = useState(true)
  const [loadingPayees, setLoadingPayees] = useState(true)
  const [loadingDraft, setLoadingDraft] = useState(!!requestId)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(requestId ?? null)
  const [showConfirmPanel, setShowConfirmPanel] = useState(false)
  const [confirmOverride, setConfirmOverride] = useState('')
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    fetch('/api/expense-account/payees', { credentials: 'include' })
      .catch(() => {})
      .finally(() => setLoadingPayees(false))
  }, [])

  useEffect(() => {
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

  useEffect(() => {
    if (!requestId) return
    setLoadingDraft(true)
    fetch(`/api/expense-account/${accountId}/combo-requests/${requestId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const req = data?.data
        if (!req) return
        setTitle(req.title || '')
        setNotes(req.notes || '')
        setSections(req.sections.map((s: any) => {
          const sPayeeId = getPayeeId(s)
          const sPayeeName = resolvePayeeName(s)
          return {
            _id: crypto.randomUUID(),
            sectionType: s.sectionType,
            sectionName: s.sectionName || '',
            payee: s.payeeType && sPayeeId && sPayeeName
              ? { type: s.payeeType, id: sPayeeId, name: sPayeeName }
              : null,
            notes: s.notes || '',
            items: s.items.map((i: any) => {
              const iPayeeId = getPayeeId(i)
              const iPayeeName = resolvePayeeName(i)
              return {
                _id: crypto.randomUUID(),
                description: i.description || '',
                quantity: i.quantity !== null && i.quantity !== undefined ? String(i.quantity) : '',
                unit: i.unit || '',
                unitPrice: '',
                estimatedAmount: i.estimatedAmount !== null && i.estimatedAmount !== undefined ? String(i.estimatedAmount) : '',
                domainId: i.category?.domainId || '',
                categoryId: i.categoryId || '',
                subcategoryId: i.subcategoryId || '',
                payee: i.payeeType && iPayeeId && iPayeeName
                  ? { type: i.payeeType, id: iPayeeId, name: iPayeeName }
                  : null,
                notes: i.notes || '',
              }
            }),
          }
        }))
      })
      .catch(() => toast.error('Failed to load draft'))
      .finally(() => setLoadingDraft(false))
  }, [requestId, accountId]) // eslint-disable-line react-hooks/exhaustive-deps

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

  async function handleSaveAndShowConfirm() {
    const error = validate()
    if (error) { toast.error(error); return }

    setSubmitting(true)
    try {
      const payload = {
        title: title.trim(),
        notes: notes.trim() || null,
        sections: serializeSections(sections),
        status: 'DRAFT',
      }

      let savedId = draftId
      if (!savedId) {
        const createRes = await fetch(`/api/expense-account/${accountId}/combo-requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        const createData = await createRes.json()
        if (!createRes.ok) { toast.error(createData.error || 'Failed to create request'); return }
        savedId = createData.data.id
        setDraftId(savedId)
      } else {
        const updateRes = await fetch(`/api/expense-account/${accountId}/combo-requests/${savedId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        if (!updateRes.ok) {
          const d = await updateRes.json()
          toast.error(d.error || 'Failed to save request')
          return
        }
      }

      setConfirmOverride(grandTotal.toFixed(2))
      setShowConfirmPanel(true)
    } catch {
      toast.error('Failed to save request')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirmSubmit() {
    if (!draftId) return
    setConfirming(true)
    try {
      const override = parseFloat(confirmOverride)
      const body: Record<string, unknown> = {}
      if (!isNaN(override) && override > 0 && Math.abs(override - grandTotal) > 0.001) {
        body.overrideAmount = override
      }

      const res = await fetch(`/api/expense-account/${accountId}/combo-requests/${draftId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to submit request'); return }

      toast.push('Request submitted successfully')
      router.push(`/expense-accounts/${accountId}`)
    } catch {
      toast.error('Failed to submit request')
    } finally {
      setConfirming(false)
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

  if (loadingDraft) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-gray-400 text-sm">Loading draft...</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {requestId ? 'Edit Combo Payment Request' : 'New Combo Payment Request'}
        </h1>
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
              onClick={() => router.push(requestId
                ? `/expense-accounts/${accountId}/combo-requests/${requestId}`
                : `/expense-accounts/${accountId}`
              )}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || submitting || loadingDomains || loadingPayees}
              className="px-4 py-2 text-sm text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : draftId ? 'Update Draft' : 'Save Draft'}
            </button>
            <button
              type="button"
              onClick={handleSaveAndShowConfirm}
              disabled={saving || submitting || confirming || loadingDomains || loadingPayees}
              title={(loadingDomains || loadingPayees) ? 'Waiting for data to load...' : undefined}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Saving...' : (loadingDomains || loadingPayees) ? 'Loading...' : 'Submit Request'}
            </button>
          </div>
        </div>

        {/* Confirm submit panel */}
        {showConfirmPanel && (
          <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
            <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">Ready to submit</p>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              Estimated total: <strong>${grandTotal.toFixed(2)}</strong>. Adjust the amount below if exact costs aren&apos;t fully known yet.
            </p>
            <div>
              <label className="block text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Requested amount (optional override)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={confirmOverride}
                onChange={e => setConfirmOverride(e.target.value)}
                className="w-48 border border-blue-300 dark:border-blue-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={confirming || parseFloat(confirmOverride) <= 0 || isNaN(parseFloat(confirmOverride))}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {confirming ? 'Submitting...' : 'Confirm Submit'}
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmPanel(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Back to Editing
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
