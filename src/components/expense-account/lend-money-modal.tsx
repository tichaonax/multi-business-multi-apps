"use client"

import { useState, useEffect } from 'react'
import { useToastContext } from '@/components/ui/toast'
import { DateInput } from '@/components/ui/date-input'
import { getTodayLocalDateString } from '@/lib/date-utils'

interface Person { id: string; fullName: string }
interface Business { id: string; name: string }

interface LendMoneyModalProps {
  accountId: string
  accountName: string
  accountBalance: number
  currentBusinessId?: string | null
  onSuccess: () => void
  onClose: () => void
}

type LoanType = 'PERSON' | 'BUSINESS'
type Step = 'details' | 'confirm'

export function LendMoneyModal({ accountId, accountName, accountBalance, currentBusinessId, onSuccess, onClose }: LendMoneyModalProps) {
  const toast = useToastContext()

  // Step
  const [step, setStep] = useState<Step>('details')

  // Form fields
  const [loanType, setLoanType] = useState<LoanType>('PERSON')
  const [recipientPersonId, setRecipientPersonId] = useState('')
  const [recipientBusinessId, setRecipientBusinessId] = useState('')
  const [amount, setAmount] = useState('')
  const [disbursementDate, setDisbursementDate] = useState(getTodayLocalDateString())
  const [dueDate, setDueDate] = useState('')
  const [purpose, setPurpose] = useState('')
  const [notes, setNotes] = useState('')

  // Dropdown data
  const [persons, setPersons] = useState<Person[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loadingRecipients, setLoadingRecipients] = useState(false)

  const [submitting, setSubmitting] = useState(false)

  const parsedAmount = parseFloat(amount) || 0

  // Load recipient list when type changes
  useEffect(() => {
    const load = async () => {
      setLoadingRecipients(true)
      try {
        if (loanType === 'PERSON') {
          const res = await fetch('/api/expense-account/payees?type=PERSON', { credentials: 'include' })
          if (res.ok) {
            const data = await res.json()
            setPersons(data.data?.persons ?? data.persons ?? [])
          }
        } else if (loanType === 'BUSINESS') {
          const res = await fetch('/api/admin/businesses', { credentials: 'include' })
          if (res.ok) {
            const data = await res.json()
            const all: Business[] = Array.isArray(data) ? data : (data.data?.businesses ?? data.businesses ?? [])
            setBusinesses(currentBusinessId ? all.filter(b => b.id !== currentBusinessId) : all)
          }
        }
      } catch { /* ignore */ }
      setLoadingRecipients(false)
    }
    load()
  }, [loanType])

  const selectedPerson = persons.find(p => p.id === recipientPersonId)
  const selectedBusiness = businesses.find(b => b.id === recipientBusinessId)

  const recipientName = selectedPerson?.fullName ?? selectedBusiness?.name ?? ''

  const validateStep1 = (): string | null => {
    if (loanType === 'PERSON' && !recipientPersonId) return 'Select a person'
    if (loanType === 'BUSINESS' && !recipientBusinessId) return 'Select a business'
    if (!parsedAmount || parsedAmount <= 0) return 'Enter a valid amount'
    if (parsedAmount > accountBalance) return `Insufficient balance ($${accountBalance.toFixed(2)} available)`
    if (!disbursementDate) return 'Enter disbursement date'
    return null
  }

  const handleNext = () => {
    const err = validateStep1()
    if (err) { toast.push(err, { type: 'error' }); return }
    setStep('confirm')
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const body: any = {
        loanType,
        principalAmount: parsedAmount,
        disbursementDate,
        dueDate: dueDate || undefined,
        purpose: purpose || undefined,
        notes: notes || undefined,
      }

      if (loanType === 'PERSON') body.recipientPersonId = recipientPersonId
      if (loanType === 'BUSINESS') body.recipientBusinessId = recipientBusinessId

      const res = await fetch(`/api/expense-account/${accountId}/outgoing-loans`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast.push(`$${parsedAmount.toFixed(2)} lent to ${recipientName}`, { type: 'success' })
        onSuccess()
        onClose()
      } else {
        const data = await res.json()
        toast.push(data.error || 'Failed to create loan', { type: 'error' })
      }
    } catch {
      toast.push('Network error. Please try again.', { type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤝</span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Lend Money</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {step === 'details' ? 'Loan Details' : 'Confirm & Submit'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-5 space-y-4">

          {step === 'details' && (
            <>
              {/* Loan Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lend To</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['PERSON', 'BUSINESS'] as LoanType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => { setLoanType(t); setRecipientPersonId(''); setRecipientBusinessId('') }}
                      className={`py-2 px-3 text-sm rounded-lg border font-medium transition-colors ${
                        loanType === t
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {t === 'PERSON' ? '👤 Person' : '🏢 Business'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                  For employee loans, use the Payroll Account page.
                </p>
              </div>

              {/* Recipient selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {loanType === 'PERSON' ? 'Select Person' : 'Select Business'}
                </label>
                {loadingRecipients ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
                ) : (
                  <select
                    value={loanType === 'PERSON' ? recipientPersonId : recipientBusinessId}
                    onChange={(e) => {
                      if (loanType === 'PERSON') setRecipientPersonId(e.target.value)
                      else setRecipientBusinessId(e.target.value)
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select...</option>
                    {loanType === 'PERSON' && persons.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                    {loanType === 'BUSINESS' && businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                )}
              </div>

              {/* Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Loan Amount
                    <span className="ml-1 text-xs text-gray-400">(Balance: ${accountBalance.toFixed(2)})</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400 font-medium">$</span>
                    <input
                      type="number" step="0.01" min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className={`w-full pl-7 pr-3 py-2.5 border rounded-lg focus:ring-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
                        parsedAmount > accountBalance
                          ? 'border-red-400 focus:ring-red-500'
                          : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                      }`}
                      placeholder="0.00"
                    />
                  </div>
                  {parsedAmount > 0 && parsedAmount > accountBalance && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      Exceeds available balance by ${(parsedAmount - accountBalance).toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Disbursement Date</label>
                  <DateInput value={disbursementDate} onChange={setDisbursementDate} />
                </div>
              </div>

              {/* Purpose + Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Purpose (optional)</label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Medical expenses"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Due Date (optional)</label>
                  <DateInput value={dueDate} onChange={setDueDate} />
                </div>
              </div>
            </>
          )}

          {step === 'confirm' && (
            <div className="space-y-3">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-1 text-sm">
                <p className="font-semibold text-green-800 dark:text-green-200">Confirm Loan Disbursement</p>
                <p className="text-green-700 dark:text-green-300">
                  <span className="font-medium">${parsedAmount.toFixed(2)}</span> will be disbursed to <span className="font-medium">{recipientName}</span>
                </p>
                <p className="text-green-600 dark:text-green-400 text-xs">
                  This will immediately reduce {accountName}&apos;s balance by ${parsedAmount.toFixed(2)}.
                </p>
              </div>
              {purpose && <p className="text-sm text-gray-600 dark:text-gray-400">Purpose: {purpose}</p>}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between gap-3 flex-shrink-0">
          <button
            onClick={() => step === 'details' ? onClose() : setStep('details')}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {step === 'details' ? 'Cancel' : 'Back'}
          </button>

          {step === 'details' && (
            <button
              onClick={handleNext}
              disabled={parsedAmount > accountBalance}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Review →
            </button>
          )}

          {step === 'confirm' && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {submitting ? 'Submitting...' : `Disburse $${parsedAmount > 0 ? parsedAmount.toFixed(2) : '—'}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
