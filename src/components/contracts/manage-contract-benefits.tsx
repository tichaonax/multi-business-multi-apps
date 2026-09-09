'use client'

import { useEffect, useState } from 'react'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { usePrompt } from '@/components/ui/confirm-modal'
import { useToastContext } from '@/components/ui/toast'
import type { Benefit } from '@/types/employee'

interface BenefitTypeOption {
  id: string
  name: string
  type: string
}

interface Props {
  employeeId: string
  contractId: string
  benefits: Benefit[]
  /** Locked when the contract is terminated -- matches the server's own guard. */
  canEdit: boolean
  formatCurrency: (amount: number) => string
  onChange: (benefits: Benefit[]) => void
}

/**
 * Lets HR add or remove a single benefit on an existing, already-signed
 * contract directly -- no renewal required. The operational counterpart to
 * the "benefits may be added/removed at any time" clause now included on new
 * contracts (see contract-pdf-generator.ts). Every change is written to
 * AuditLogs server-side; payroll periods snapshot benefits at their own
 * creation time, so this can never retroactively change a past payroll run.
 */
export function ManageContractBenefits({ employeeId, contractId, benefits, canEdit, formatCurrency, onChange }: Props) {
  const prompt = usePrompt()
  const toast = useToastContext()

  const [adding, setAdding] = useState(false)
  const [benefitTypes, setBenefitTypes] = useState<BenefitTypeOption[]>([])
  const [loadingTypes, setLoadingTypes] = useState(false)
  const [benefitTypeId, setBenefitTypeId] = useState('')
  const [amount, setAmount] = useState('')
  const [isPercentage, setIsPercentage] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    if (!adding) return
    setLoadingTypes(true)
    fetch('/api/benefit-types')
      .then(r => (r.ok ? r.json() : []))
      .then(setBenefitTypes)
      .catch(() => setBenefitTypes([]))
      .finally(() => setLoadingTypes(false))
  }, [adding])

  const usedTypeIds = new Set(benefits.map(b => b.benefitTypeId).filter(Boolean))
  const availableTypes = benefitTypes.filter(t => !usedTypeIds.has(t.id))

  function resetForm() {
    setAdding(false)
    setBenefitTypeId('')
    setAmount('')
    setIsPercentage(false)
    setNotes('')
  }

  async function handleAdd() {
    if (!benefitTypeId || !amount || isNaN(Number(amount))) return
    setSaving(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/contracts/${contractId}/benefits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ benefitTypeId, amount: Number(amount), isPercentage, notes: notes.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to add benefit')
      onChange(data.benefits)
      toast.push('Benefit added')
      resetForm()
    } catch (e: any) {
      toast.error(e.message || 'Failed to add benefit')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(benefit: Benefit) {
    const reason = await prompt({
      title: `Remove "${benefit.benefitType.name}"?`,
      description: 'This takes effect immediately on the live contract. A reason is optional and only used for the internal record.',
      placeholder: 'Reason (optional)',
      confirmText: 'Remove Benefit',
    })
    if (reason === null) return // cancelled

    setRemovingId(benefit.id)
    try {
      const res = await fetch(`/api/employees/${employeeId}/contracts/${contractId}/benefits`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractBenefitId: benefit.id, reason: reason.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to remove benefit')
      onChange(data.benefits)
      toast.push('Benefit removed')
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove benefit')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-secondary">Benefits</label>
        {canEdit && !adding && (
          <button type="button" onClick={() => setAdding(true)} className="text-sm text-blue-600 hover:underline">
            + Add Benefit
          </button>
        )}
      </div>

      {benefits.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {benefits.map((benefit, idx) => (
            <div
              key={benefit.id ?? `${benefit.benefitType?.name || 'benefit'}-${benefit.amount}-${idx}`}
              className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded"
            >
              <span className="text-sm text-primary">{benefit.benefitType.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-primary">
                  {benefit.isPercentage ? `${benefit.amount}%` : formatCurrency(benefit.amount)}
                </span>
                {canEdit && benefit.id && (
                  <button
                    type="button"
                    onClick={() => handleRemove(benefit)}
                    disabled={removingId === benefit.id}
                    className="text-red-600 hover:text-red-800 disabled:opacity-50 text-sm leading-none"
                    title="Remove this benefit"
                  >
                    {removingId === benefit.id ? '…' : '✕'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="mt-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
          <SearchableSelect
            options={availableTypes.map(t => ({ id: t.id, label: `${t.name} (${t.type})` }))}
            value={benefitTypeId}
            onChange={setBenefitTypeId}
            placeholder="Select benefit type…"
            searchPlaceholder="Search benefit types…"
            loading={loadingTypes}
          />
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={isPercentage ? 'Percentage' : 'Amount'}
              className="input-field flex-1 text-sm"
            />
            <label className="flex items-center gap-1 text-sm text-secondary whitespace-nowrap">
              <input type="checkbox" checked={isPercentage} onChange={e => setIsPercentage(e.target.checked)} />
              % of salary
            </label>
          </div>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="input-field w-full text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !benefitTypeId || !amount}
              className="btn-primary text-sm px-3 py-1 disabled:opacity-50"
            >
              {saving ? 'Adding…' : 'Add'}
            </button>
            <button type="button" onClick={resetForm} className="btn-secondary text-sm px-3 py-1">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
