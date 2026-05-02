'use client'

import { useState, useEffect } from 'react'
import { useToastContext } from '@/components/ui/toast'

interface ComboItem {
  id: string
  description: string
  estimatedAmount: number | null
  sortOrder: number
}

interface ComboSection {
  id: string
  sectionType: string
  items: ComboItem[]
}

interface ComboRequestApproveModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  accountId: string
  requestId: string
  requestTitle: string
  requestedAmount: number
  overrideAmount: number | null
  sections: ComboSection[]
  availableBalance: number
}

const SECTION_LABELS: Record<string, string> = {
  GROCERY: 'Grocery',
  MONTHLY_CONTRIBUTION: 'Contribution',
  SCHOOL_FEES: 'School Fees',
  CUSTOM: 'Custom',
}

export function ComboRequestApproveModal({
  isOpen,
  onClose,
  onSuccess,
  accountId,
  requestId,
  requestTitle,
  requestedAmount,
  overrideAmount,
  sections,
  availableBalance,
}: ComboRequestApproveModalProps) {
  const toast = useToastContext()
  const effectiveRequested = overrideAmount ?? requestedAmount

  const [approvedAmount, setApprovedAmount] = useState(String(effectiveRequested.toFixed(2)))
  const [approvalNote, setApprovalNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setApprovedAmount(String(Math.min(effectiveRequested, availableBalance).toFixed(2)))
      setApprovalNote('')
    }
  }, [isOpen, effectiveRequested, availableBalance])

  if (!isOpen) return null

  const approvedNum = parseFloat(approvedAmount) || 0
  const isPartial = approvedNum < effectiveRequested
  const shortfall = effectiveRequested - approvedNum

  // Simulate which items are not-funded (mirror server logic: cumulative from bottom)
  const allItems = sections.flatMap(s =>
    s.items.map(i => ({ ...i, sectionType: s.sectionType }))
  ).sort((a, b) => a.sortOrder - b.sortOrder)

  const notFundedIds = new Set<string>()
  if (isPartial) {
    let cumulative = 0
    for (const item of [...allItems].reverse()) {
      const amt = Number(item.estimatedAmount || 0)
      if (cumulative + amt > shortfall) break
      notFundedIds.add(item.id)
      cumulative += amt
    }
  }

  async function handleSubmit() {
    if (!approvedNum || approvedNum <= 0) {
      toast.error('Approved amount must be greater than zero')
      return
    }
    if (approvedNum > availableBalance) {
      toast.error(`Insufficient balance. Available: $${availableBalance.toFixed(2)}`)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/expense-account/${accountId}/combo-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ approvedAmount: approvedNum, approvalNote: approvalNote.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to approve'); return }
      toast.push(isPartial ? 'Partially approved' : 'Request approved')
      onSuccess()
    } catch {
      toast.error('Failed to approve request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Approve Combo Request</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <p className="text-sm text-gray-600 font-medium">{requestTitle}</p>

          {/* Balance info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Requested</div>
              <div className="font-semibold text-gray-900">${effectiveRequested.toFixed(2)}</div>
            </div>
            <div className={`rounded-lg p-3 ${availableBalance >= effectiveRequested ? 'bg-green-50' : 'bg-amber-50'}`}>
              <div className="text-xs text-gray-500">Available Balance</div>
              <div className={`font-semibold ${availableBalance >= effectiveRequested ? 'text-green-700' : 'text-amber-700'}`}>
                ${availableBalance.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Approved amount input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Approved Amount *</label>
            <input
              type="number"
              value={approvedAmount}
              onChange={e => setApprovedAmount(e.target.value)}
              min="0.01"
              max={availableBalance}
              step="0.01"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {isPartial && approvedNum > 0 && (
              <p className="mt-1 text-xs text-amber-600">
                Partial approval — ${shortfall.toFixed(2)} shortfall. Items will be partially funded.
              </p>
            )}
          </div>

          {/* Not-funded item preview */}
          {isPartial && notFundedIds.size > 0 && (
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-1">
              <p className="text-xs font-medium text-amber-800">Items that will NOT be funded:</p>
              {allItems.filter(i => notFundedIds.has(i.id)).map(i => (
                <div key={i.id} className="flex justify-between text-xs text-amber-700">
                  <span className="truncate mr-2">{i.description}</span>
                  <span className="shrink-0">${Number(i.estimatedAmount || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Approval note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Approval Note {isPartial ? '*' : '(optional)'}
            </label>
            <textarea
              value={approvalNote}
              onChange={e => setApprovalNote(e.target.value)}
              placeholder={isPartial ? 'Explain the partial funding...' : 'Optional note for the requester'}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !approvedNum || approvedNum <= 0}
            className={`px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors ${
              isPartial ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {submitting ? 'Approving...' : isPartial ? 'Partially Approve' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  )
}
