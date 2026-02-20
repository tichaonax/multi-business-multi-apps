"use client"

import { useState, useEffect } from 'react'
import { useToastContext } from '@/components/ui/toast'
import { DateInput } from '@/components/ui/date-input'
import { getTodayLocalDateString } from '@/lib/date-utils'

interface Person { id: string; fullName: string }
interface Business { id: string; name: string }
interface Employee { id: string; fullName: string; employeeNumber: string }

interface LendMoneyModalProps {
  accountId: string
  accountName: string
  accountBalance: number
  onSuccess: () => void
  onClose: () => void
}

type LoanType = 'PERSON' | 'BUSINESS' | 'EMPLOYEE'
type Step = 'details' | 'contract' | 'confirm'

export function LendMoneyModal({ accountId, accountName, accountBalance, onSuccess, onClose }: LendMoneyModalProps) {
  const toast = useToastContext()

  // Step
  const [step, setStep] = useState<Step>('details')

  // Form fields
  const [loanType, setLoanType] = useState<LoanType>('PERSON')
  const [recipientPersonId, setRecipientPersonId] = useState('')
  const [recipientBusinessId, setRecipientBusinessId] = useState('')
  const [recipientEmployeeId, setRecipientEmployeeId] = useState('')
  const [amount, setAmount] = useState('')
  const [monthlyInstallment, setMonthlyInstallment] = useState('')
  const [totalMonths, setTotalMonths] = useState('')
  const [disbursementDate, setDisbursementDate] = useState(getTodayLocalDateString())
  const [dueDate, setDueDate] = useState('')
  const [purpose, setPurpose] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentType, setPaymentType] = useState<'MANUAL' | 'PAYROLL_DEDUCTION'>('PAYROLL_DEDUCTION')
  const [contractConsent, setContractConsent] = useState(false)

  // Dropdown data
  const [persons, setPersons] = useState<Person[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loadingRecipients, setLoadingRecipients] = useState(false)

  const [submitting, setSubmitting] = useState(false)

  const parsedAmount = parseFloat(amount) || 0
  const parsedInstallment = parseFloat(monthlyInstallment) || 0
  const parsedMonths = parseInt(totalMonths) || 0

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
          const res = await fetch('/api/business', { credentials: 'include' })
          if (res.ok) {
            const data = await res.json()
            setBusinesses(data.data?.businesses ?? data.businesses ?? [])
          }
        } else if (loanType === 'EMPLOYEE') {
          const res = await fetch('/api/employees?status=active', { credentials: 'include' })
          if (res.ok) {
            const data = await res.json()
            setEmployees(data.data?.employees ?? data.employees ?? [])
          }
        }
      } catch { /* ignore */ }
      setLoadingRecipients(false)
    }
    load()
  }, [loanType])

  const selectedEmployee = employees.find(e => e.id === recipientEmployeeId)
  const selectedPerson = persons.find(p => p.id === recipientPersonId)
  const selectedBusiness = businesses.find(b => b.id === recipientBusinessId)

  const recipientName = selectedPerson?.fullName ?? selectedBusiness?.name ?? selectedEmployee?.fullName ?? ''

  const validateStep1 = (): string | null => {
    if (loanType === 'PERSON' && !recipientPersonId) return 'Select a person'
    if (loanType === 'BUSINESS' && !recipientBusinessId) return 'Select a business'
    if (loanType === 'EMPLOYEE' && !recipientEmployeeId) return 'Select an employee'
    if (!parsedAmount || parsedAmount <= 0) return 'Enter a valid amount'
    if (loanType !== 'EMPLOYEE' && parsedAmount > accountBalance) return `Insufficient balance ($${accountBalance.toFixed(2)} available)`
    if (loanType === 'EMPLOYEE') {
      if (!parsedInstallment || parsedInstallment <= 0) return 'Enter monthly installment amount'
      if (!parsedMonths || parsedMonths <= 0) return 'Enter loan duration in months'
    }
    if (!disbursementDate) return 'Enter disbursement date'
    return null
  }

  const handleNext = () => {
    const err = validateStep1()
    if (err) { toast.push(err, { type: 'error' }); return }
    if (loanType === 'EMPLOYEE') {
      setStep('contract')
    } else {
      setStep('confirm')
    }
  }

  const handleSubmit = async () => {
    if (loanType === 'EMPLOYEE' && !contractConsent) {
      toast.push('Payroll deduction consent is required', { type: 'error' })
      return
    }

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
      if (loanType === 'EMPLOYEE') {
        body.recipientEmployeeId = recipientEmployeeId
        body.monthlyInstallment = parsedInstallment
        body.totalMonths = parsedMonths
        body.paymentType = paymentType
      }

      const res = await fetch(`/api/expense-account/${accountId}/outgoing-loans`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const data = await res.json()
        const isEmployee = loanType === 'EMPLOYEE'
        const msg = isEmployee
          ? `Loan request submitted for ${recipientName} — pending manager approval`
          : `$${parsedAmount.toFixed(2)} lent to ${recipientName}`
        toast.push(msg, { type: 'success' })
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
                {step === 'details' ? 'Step 1: Loan Details' : step === 'contract' ? 'Step 2: Contract Review' : 'Step 3: Confirm'}
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
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {step === 'details' && (
            <>
              {/* Loan Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lend To</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['PERSON', 'BUSINESS', 'EMPLOYEE'] as LoanType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => { setLoanType(t); setRecipientPersonId(''); setRecipientBusinessId(''); setRecipientEmployeeId('') }}
                      className={`py-2 px-3 text-sm rounded-lg border font-medium transition-colors ${
                        loanType === t
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {t === 'PERSON' ? '👤 Person' : t === 'BUSINESS' ? '🏢 Business' : '👷 Employee'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {loanType === 'PERSON' ? 'Select Person' : loanType === 'BUSINESS' ? 'Select Business' : 'Select Employee'}
                </label>
                {loadingRecipients ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
                ) : (
                  <select
                    value={loanType === 'PERSON' ? recipientPersonId : loanType === 'BUSINESS' ? recipientBusinessId : recipientEmployeeId}
                    onChange={(e) => {
                      if (loanType === 'PERSON') setRecipientPersonId(e.target.value)
                      else if (loanType === 'BUSINESS') setRecipientBusinessId(e.target.value)
                      else setRecipientEmployeeId(e.target.value)
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select...</option>
                    {loanType === 'PERSON' && persons.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                    {loanType === 'BUSINESS' && businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    {loanType === 'EMPLOYEE' && employees.map(e => <option key={e.id} value={e.id}>{e.fullName} ({e.employeeNumber})</option>)}
                  </select>
                )}
              </div>

              {/* Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Loan Amount
                    {loanType !== 'EMPLOYEE' && (
                      <span className="ml-1 text-xs text-gray-400">(Balance: ${accountBalance.toFixed(2)})</span>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400 font-medium">$</span>
                    <input
                      type="number" step="0.01" min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Disbursement Date</label>
                  <DateInput value={disbursementDate} onChange={setDisbursementDate} />
                </div>
              </div>

              {/* Employee-specific fields */}
              {loanType === 'EMPLOYEE' && (
                <div className="space-y-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wide">Payroll Deduction Terms</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Monthly Installment</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                        <input
                          type="number" step="0.01" min="0.01"
                          value={monthlyInstallment}
                          onChange={(e) => setMonthlyInstallment(e.target.value)}
                          className="w-full pl-7 pr-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Duration (months)</label>
                      <input
                        type="number" min="1"
                        value={totalMonths}
                        onChange={(e) => setTotalMonths(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. 5"
                      />
                    </div>
                  </div>
                  {parsedInstallment > 0 && parsedMonths > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Total via deductions: ${(parsedInstallment * parsedMonths).toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              {/* Purpose + Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Purpose (optional)</label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Medical expenses"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Due Date (optional)</label>
                  <DateInput value={dueDate} onChange={setDueDate} />
                </div>
              </div>
            </>
          )}

          {step === 'contract' && loanType === 'EMPLOYEE' && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 space-y-2 leading-relaxed">
                <p className="font-semibold text-base text-gray-900 dark:text-gray-100">LOAN AGREEMENT</p>
                <div className="border-t border-gray-200 dark:border-gray-600 pt-2 space-y-1">
                  <p><span className="font-medium">Lender:</span> {accountName}</p>
                  <p><span className="font-medium">Borrower:</span> {selectedEmployee?.fullName} ({selectedEmployee?.employeeNumber})</p>
                  <p><span className="font-medium">Loan Amount:</span> ${parsedAmount.toFixed(2)}</p>
                  <p><span className="font-medium">Monthly Deduction:</span> ${parsedInstallment.toFixed(2)}</p>
                  <p><span className="font-medium">Duration:</span> {parsedMonths} months</p>
                  {dueDate && <p><span className="font-medium">Due Date:</span> {dueDate}</p>}
                  {purpose && <p><span className="font-medium">Purpose:</span> {purpose}</p>}
                </div>
                <div className="border-t border-gray-200 dark:border-gray-600 pt-2 space-y-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">Terms:</p>
                  <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400">
                    <li>The borrower authorizes deduction of ${parsedInstallment.toFixed(2)} from each monthly payroll until the loan is fully repaid.</li>
                    <li>Deductions begin in the next payroll cycle after this contract is signed.</li>
                    <li>Early repayment is permitted without penalty.</li>
                    <li>In case of employment termination, the outstanding balance becomes immediately due.</li>
                  </ol>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contractConsent}
                  onChange={(e) => setContractConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  I confirm the borrower <strong>{selectedEmployee?.fullName}</strong> has reviewed and agreed to the above terms, including consent for payroll deduction.
                </span>
              </label>
            </div>
          )}

          {step === 'confirm' && loanType !== 'EMPLOYEE' && (
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
              className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {loanType === 'EMPLOYEE' ? 'Review Contract →' : 'Review →'}
            </button>
          )}

          {(step === 'contract' || step === 'confirm') && (
            <button
              onClick={handleSubmit}
              disabled={submitting || (step === 'contract' && !contractConsent)}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {submitting ? 'Submitting...' : step === 'contract' ? 'Submit Loan Request' : `Disburse $${parsedAmount > 0 ? parsedAmount.toFixed(2) : '—'}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
