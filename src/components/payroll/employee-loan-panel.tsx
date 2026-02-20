"use client"

import { useState, useEffect, useCallback } from 'react'
import { useToastContext } from '@/components/ui/toast'
import { DateInput } from '@/components/ui/date-input'
import { getTodayLocalDateString } from '@/lib/date-utils'
import { useDateFormat } from '@/contexts/settings-context'

interface Employee {
  id: string
  fullName: string
  employeeNumber: string
  phone?: string | null
  primaryBusiness?: { id: string; name: string } | null
}

interface LenderBusiness {
  name: string
  address: string | null
  phone: string | null
}

interface EmployeeLoan {
  id: string
  loanNumber: string
  lenderBusiness?: LenderBusiness | null
  recipientEmployee: Employee | null
  principalAmount: number
  remainingBalance: number
  monthlyInstallment: number | null
  totalMonths: number | null
  remainingMonths: number | null
  disbursementDate: string
  dueDate: string | null
  status: string
  purpose: string | null
  contractSigned: boolean
  contractSignedAt: string | null
  notes: string | null
}

// ─── Date formatter ──────────────────────────────────────────────────────────
function formatDateStr(dateStr: string, format: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return format === 'mm/dd/yyyy' ? `${month}/${day}/${year}` : `${day}/${month}/${year}`
}

// ─── Print helper ────────────────────────────────────────────────────────────
function printLoanContract(loan: {
  loanNumber: string
  borrowerName: string
  borrowerEmployeeNumber: string
  principalAmount: number
  monthlyInstallment: number | null
  totalMonths: number | null
  disbursementDate: string
  dueDate?: string | null
  purpose?: string | null
  borrowerPhone?: string | null
  lenderBusiness?: LenderBusiness | null
  dateFormat?: string
}) {
  const fmt = loan.dateFormat || 'dd/mm/yyyy'
  const fmtDate = (s: string) => formatDateStr(s, fmt)

  const installment = loan.monthlyInstallment ?? 0
  const months = loan.totalMonths ?? 0
  const lastPayment = months > 1 && installment > 0
    ? loan.principalAmount - installment * (months - 1)
    : installment

  const deductionLine = months > 1 && lastPayment !== installment
    ? `$${installment} × ${months - 1} months, then final payment $${lastPayment.toFixed(2)}`
    : `$${installment} × ${months} months`

  const lenderName = loan.lenderBusiness?.name ?? 'Payroll Account'
  const lenderAddress = loan.lenderBusiness?.address ?? ''
  const lenderPhone = loan.lenderBusiness?.phone ?? ''

  const today = fmtDate(new Date().toISOString())

  const html = `<!DOCTYPE html>
<html>
<head>
<title>Loan Agreement — ${loan.loanNumber}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12pt; color: #000; margin: 40px; line-height: 1.6; }
  h1 { text-align: center; font-size: 16pt; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid #000; padding-bottom: 8px; }
  .ref { text-align: center; font-size: 10pt; color: #555; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  td { padding: 5px 8px; vertical-align: top; }
  td:first-child { font-weight: bold; width: 200px; }
  .section { margin-top: 20px; }
  .section-title { font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #ccc; margin-bottom: 8px; }
  ol { margin: 0; padding-left: 20px; }
  ol li { margin-bottom: 6px; }
  .signatures { margin-top: 40px; display: flex; gap: 60px; }
  .sig-block { flex: 1; }
  .sig-line { border-bottom: 1px solid #000; height: 40px; margin-bottom: 4px; }
  .sig-label { font-size: 10pt; color: #444; }
  .sig-date { font-size: 10pt; color: #444; margin-top: 14px; }
  .footer { margin-top: 30px; font-size: 9pt; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 8px; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<h1>Loan Agreement</h1>
<div class="ref">Ref: ${loan.loanNumber} &nbsp;|&nbsp; Date: ${fmtDate(loan.disbursementDate)}</div>

<div class="section">
  <div class="section-title">Parties</div>
  <table>
    <tr>
      <td>Lender:</td>
      <td>
        ${lenderName}
        ${lenderAddress ? `<br>${lenderAddress}` : ''}
        ${lenderPhone ? `<br>Tel: ${lenderPhone}` : ''}
      </td>
    </tr>
    <tr>
      <td>Borrower:</td>
      <td>
        ${loan.borrowerName} (Emp# ${loan.borrowerEmployeeNumber})
        ${loan.borrowerPhone ? `<br>Tel: ${loan.borrowerPhone}` : ''}
      </td>
    </tr>
  </table>
</div>

<div class="section">
  <div class="section-title">Loan Details</div>
  <table>
    <tr><td>Principal Amount:</td><td>$${loan.principalAmount.toFixed(2)}</td></tr>
    <tr><td>Payroll Deductions:</td><td>${deductionLine}</td></tr>
    <tr><td>Duration:</td><td>${months} months</td></tr>
    ${loan.dueDate ? `<tr><td>Due Date:</td><td>${fmtDate(loan.dueDate)}</td></tr>` : ''}
    ${loan.purpose ? `<tr><td>Purpose:</td><td>${loan.purpose}</td></tr>` : ''}
  </table>
</div>

<div class="section">
  <div class="section-title">Terms &amp; Conditions</div>
  <ol>
    <li>The borrower authorizes the deduction of $${installment} from each monthly payroll until the loan is fully repaid.</li>
    <li>Loan repayments will be credited back to the payroll account.</li>
    <li>Early repayment is permitted at any time without penalty.</li>
    <li>In the event of employment termination, the full outstanding balance becomes immediately due and payable.</li>
    <li>This agreement is legally binding upon both parties from the date of signing.</li>
  </ol>
</div>

<div class="signatures">
  <div class="sig-block">
    <div class="sig-line"></div>
    <div class="sig-label">Employee Signature</div>
    <div class="sig-label">Name: ${loan.borrowerName}</div>
    <div class="sig-date">Date: _______________</div>
  </div>
  <div class="sig-block">
    <div class="sig-line"></div>
    <div class="sig-label">Manager / Authorized Signatory</div>
    <div class="sig-label">On behalf of: ${lenderName}</div>
    <div class="sig-date">Date: _______________</div>
  </div>
</div>

<div class="footer">Generated by system on ${today} &nbsp;|&nbsp; Keep this signed copy on file</div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=800,height=600')
  if (win) {
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 500)
  }
}

interface EmployeeLoanPanelProps {
  canManage: boolean
}

const STATUS_COLORS: Record<string, string> = {
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  PENDING_CONTRACT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  PAID_OFF: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  DEFAULTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

export function EmployeeLoanPanel({ canManage }: EmployeeLoanPanelProps) {
  const toast = useToastContext()
  const { format: dateFormat } = useDateFormat()
  const [loans, setLoans] = useState<EmployeeLoan[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<EmployeeLoan | null>(null)
  const [confirmSignLoan, setConfirmSignLoan] = useState<EmployeeLoan | null>(null)
  const [rejectLoan, setRejectLoan] = useState<EmployeeLoan | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('ALL')

  const loadLoans = useCallback(async () => {
    setLoading(true)
    try {
      const url = statusFilter !== 'ALL'
        ? `/api/payroll/account/outgoing-loans?status=${statusFilter}`
        : '/api/payroll/account/outgoing-loans'
      const res = await fetch(url, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setLoans(data.data?.loans ?? [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { loadLoans() }, [loadLoans])

  const handleApprove = async (loan: EmployeeLoan) => {
    setActionLoading(loan.id)
    try {
      const res = await fetch(`/api/expense-account/outgoing-loans/${loan.id}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (res.ok) {
        toast.push('Loan approved — pending contract signing', { type: 'success' })
        loadLoans()
      } else {
        toast.push(data.error || 'Approval failed', { type: 'error' })
      }
    } catch {
      toast.push('Network error', { type: 'error' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleSignContract = async (loan: EmployeeLoan) => {
    setActionLoading(loan.id)
    try {
      const res = await fetch(`/api/expense-account/outgoing-loans/${loan.id}/sign-contract`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentForPayrollDeduction: true }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.push('Contract signed — loan activated and disbursed', { type: 'success' })
        loadLoans()
      } else {
        toast.push(data.error || 'Contract signing failed', { type: 'error' })
      }
    } catch {
      toast.push('Network error', { type: 'error' })
    } finally {
      setActionLoading(null)
    }
  }

  const filteredLoans = statusFilter === 'ALL'
    ? loans
    : loans.filter(l => l.status === statusFilter)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Employee Loans</h3>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            <option value="ALL">All</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="PENDING_CONTRACT">Pending Contract</option>
            <option value="ACTIVE">Active</option>
            <option value="PAID_OFF">Paid Off</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <span>🤝</span> Lend to Employee
          </button>
        )}
      </div>

      {/* Loans list */}
      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Loading...</p>
      ) : filteredLoans.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">No employee loans found</p>
          {canManage && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Create first employee loan
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLoans.map((loan) => (
            <div
              key={loan.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                      {loan.recipientEmployee?.fullName ?? 'Unknown'}
                    </span>
                    <span className="text-xs text-gray-400">#{loan.recipientEmployee?.employeeNumber}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[loan.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {loan.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{loan.loanNumber}</p>
                  {loan.purpose && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{loan.purpose}</p>
                  )}
                  {loan.status === 'REJECTED' && loan.notes && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{loan.notes}</p>
                  )}
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <span>Principal: <strong>${loan.principalAmount.toFixed(2)}</strong></span>
                    <span>Remaining: <strong>${loan.remainingBalance.toFixed(2)}</strong></span>
                    {loan.monthlyInstallment && (
                      <span>Monthly: <strong>${loan.monthlyInstallment.toFixed(2)}</strong></span>
                    )}
                  </div>
                  {loan.status === 'PENDING_APPROVAL' && !loan.recipientEmployee?.phone && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      ⚠️ No phone number on file — approval blocked until employee record is updated.
                    </p>
                  )}
                </div>
                {canManage && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {loan.status === 'PENDING_APPROVAL' && (
                      <>
                        <button
                          onClick={() => setRejectLoan(loan)}
                          disabled={actionLoading === loan.id}
                          className="px-3 py-1.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 text-red-700 dark:text-red-400 rounded-lg transition-colors"
                        >
                          ✕ Reject
                        </button>
                        <button
                          onClick={() => handleApprove(loan)}
                          disabled={actionLoading === loan.id}
                          className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                        >
                          {actionLoading === loan.id ? '...' : '✓ Approve'}
                        </button>
                      </>
                    )}
                    {loan.status === 'PENDING_CONTRACT' && (
                      <>
                        <button
                          onClick={() => printLoanContract({
                            loanNumber: loan.loanNumber,
                            borrowerName: loan.recipientEmployee?.fullName ?? 'Unknown',
                            borrowerEmployeeNumber: loan.recipientEmployee?.employeeNumber ?? '',
                            borrowerPhone: loan.recipientEmployee?.phone ?? null,
                            principalAmount: loan.principalAmount,
                            monthlyInstallment: loan.monthlyInstallment,
                            totalMonths: loan.totalMonths,
                            disbursementDate: loan.disbursementDate,
                            dueDate: loan.dueDate,
                            purpose: loan.purpose,
                            lenderBusiness: loan.lenderBusiness ?? null,
                            dateFormat,
                          })}
                          className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                        >
                          🖨️ Print
                        </button>
                        <button
                          onClick={() => setConfirmSignLoan(loan)}
                          disabled={actionLoading === loan.id}
                          className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                        >
                          ✅ Confirm Signed
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Employee Loan Modal */}
      {showCreateModal && (
        <CreateEmployeeLoanModal
          onSuccess={() => { setShowCreateModal(false); loadLoans() }}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Reject Loan Modal */}
      {rejectLoan && (
        <RejectLoanModal
          loan={rejectLoan}
          onConfirm={async (reason) => {
            setActionLoading(rejectLoan.id)
            try {
              const res = await fetch(`/api/expense-account/outgoing-loans/${rejectLoan.id}/reject`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason }),
              })
              const data = await res.json()
              if (res.ok) {
                toast.push('Loan request rejected', { type: 'success' })
                setRejectLoan(null)
                loadLoans()
              } else {
                toast.push(data.error || 'Failed to reject loan', { type: 'error' })
              }
            } catch {
              toast.push('Network error', { type: 'error' })
            } finally {
              setActionLoading(null)
            }
          }}
          onClose={() => setRejectLoan(null)}
          loading={actionLoading === rejectLoan.id}
        />
      )}

      {/* Confirm Physical Signature & Release Funds Modal */}
      {confirmSignLoan && (
        <ConfirmSignModal
          loan={confirmSignLoan}
          onConfirm={async () => {
            setActionLoading(confirmSignLoan.id)
            try {
              const res = await fetch(`/api/expense-account/outgoing-loans/${confirmSignLoan.id}/sign-contract`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ consentForPayrollDeduction: true }),
              })
              const data = await res.json()
              if (res.ok) {
                toast.push('Loan activated — funds disbursed from payroll account', { type: 'success' })
                setConfirmSignLoan(null)
                loadLoans()
              } else {
                toast.push(data.error || 'Failed to release funds', { type: 'error' })
              }
            } catch {
              toast.push('Network error', { type: 'error' })
            } finally {
              setActionLoading(null)
            }
          }}
          onClose={() => setConfirmSignLoan(null)}
          releasing={actionLoading === confirmSignLoan.id}
        />
      )}
    </div>
  )
}

// ─── Reject Loan Modal ────────────────────────────────────────────────────────
function RejectLoanModal({
  loan, onConfirm, onClose, loading,
}: {
  loan: EmployeeLoan
  onConfirm: (reason: string) => void
  onClose: () => void
  loading: boolean
}) {
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Reject Loan Request</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {loan.loanNumber} — {loan.recipientEmployee?.fullName}
            </p>
          </div>
          <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
            This will permanently reject the loan request for <strong>${loan.principalAmount.toFixed(2)}</strong>.
            A new request will need to be submitted if needed.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Reason for rejection <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 text-sm"
              placeholder="e.g. Insufficient payroll balance, policy limit exceeded..."
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason.trim())}
            disabled={loading}
            className="px-5 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {loading ? 'Rejecting...' : 'Reject Request'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Confirm Physical Signature Modal ────────────────────────────────────────
function ConfirmSignModal({
  loan, onConfirm, onClose, releasing,
}: {
  loan: EmployeeLoan
  onConfirm: () => void
  onClose: () => void
  releasing: boolean
}) {
  const [confirmed, setConfirmed] = useState(false)
  const installment = loan.monthlyInstallment ?? 0
  const months = loan.totalMonths ?? 0
  const lastPayment = months > 1 && installment > 0
    ? loan.principalAmount - installment * (months - 1)
    : installment

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Confirm Physical Signature</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{loan.loanNumber} — {loan.recipientEmployee?.fullName}</p>
          </div>
          <button onClick={onClose} disabled={releasing} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contract summary */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-sm space-y-1">
            <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">LOAN AGREEMENT — SUMMARY</p>
            <p><span className="font-medium">Borrower:</span> {loan.recipientEmployee?.fullName} ({loan.recipientEmployee?.employeeNumber})</p>
            <p><span className="font-medium">Principal:</span> ${loan.principalAmount.toFixed(2)}</p>
            {installment > 0 && months > 0 && (
              lastPayment !== installment && months > 1 ? (
                <p><span className="font-medium">Deductions:</span> {months - 1} × ${installment} + final ${lastPayment.toFixed(2)}</p>
              ) : (
                <p><span className="font-medium">Deductions:</span> {months} × ${installment}</p>
              )
            )}
            <p><span className="font-medium">Duration:</span> {months} months</p>
            {loan.dueDate && <p><span className="font-medium">Due Date:</span> {new Date(loan.dueDate).toLocaleDateString()}</p>}
            {loan.purpose && <p><span className="font-medium">Purpose:</span> {loan.purpose}</p>}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Before releasing funds:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Print the contract using the 🖨️ Print button on the loan card.</li>
              <li>Have <strong>{loan.recipientEmployee?.fullName}</strong> physically sign the printed copy.</li>
              <li>File the signed copy, then check the box below to release funds.</li>
            </ol>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              I confirm <strong>{loan.recipientEmployee?.fullName}</strong> has physically signed the printed loan agreement and a signed copy is on file.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={releasing}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!confirmed || releasing}
            className="px-5 py-2 text-sm font-semibold bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {releasing ? 'Releasing...' : '💸 Release Funds'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Create Employee Loan Modal ───────────────────────────────────────────────
// Internal modal for creating an employee loan from payroll account
function CreateEmployeeLoanModal({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const toast = useToastContext()
  const { format: dateFormat } = useDateFormat()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [step, setStep] = useState<'details' | 'contract'>('details')
  const [submitting, setSubmitting] = useState(false)
  const [lenderBusiness, setLenderBusiness] = useState<LenderBusiness | null>(null)

  const [recipientEmployeeId, setRecipientEmployeeId] = useState('')
  const [amount, setAmount] = useState('')
  const [monthlyInstallment, setMonthlyInstallment] = useState('')
  const [totalMonths, setTotalMonths] = useState('')
  const [disbursementDate, setDisbursementDate] = useState(getTodayLocalDateString())
  const [dueDate, setDueDate] = useState('')
  const [purpose, setPurpose] = useState('')
  const [contractConsent, setContractConsent] = useState(false)
  // Track which repayment field the user last typed in, so we know which to auto-recalculate
  const [lastEditedRepayment, setLastEditedRepayment] = useState<'installment' | 'months' | null>(null)

  const parsedAmount = parseFloat(amount) || 0
  const parsedInstallment = parseInt(monthlyInstallment) || 0
  const parsedMonths = parseInt(totalMonths) || 0
  const selectedEmployee = employees.find((e) => e.id === recipientEmployeeId)

  // Last payment may differ from regular installment to cover the remainder
  const lastPayment = parsedAmount > 0 && parsedMonths > 0 && parsedInstallment > 0
    ? Math.round((parsedAmount - parsedInstallment * (parsedMonths - 1)) * 100) / 100
    : parsedInstallment

  const handleAmountChange = (val: string) => {
    setAmount(val)
    const amt = parseFloat(val) || 0
    if (amt > 0) {
      if (lastEditedRepayment === 'installment') {
        const inst = parseInt(monthlyInstallment) || 0
        if (inst > 0) setTotalMonths(String(Math.ceil(amt / inst)))
      } else if (lastEditedRepayment === 'months') {
        const months = parseInt(totalMonths) || 0
        if (months > 0) setMonthlyInstallment(String(Math.floor(amt / months) || 1))
      }
    }
  }

  const handleInstallmentChange = (val: string) => {
    setMonthlyInstallment(val)
    setLastEditedRepayment('installment')
    const inst = parseInt(val) || 0
    if (parsedAmount > 0 && inst > 0) {
      setTotalMonths(String(Math.ceil(parsedAmount / inst)))
    }
  }

  const handleMonthsChange = (val: string) => {
    setTotalMonths(val)
    setLastEditedRepayment('months')
    const months = parseInt(val) || 0
    if (parsedAmount > 0 && months > 0) {
      setMonthlyInstallment(String(Math.floor(parsedAmount / months) || 1))
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/employees?status=active', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setEmployees(data.data?.employees ?? data.employees ?? [])
        }
      } catch { /* ignore */ }
      setLoadingEmployees(false)
    }
    load()
  }, [])

  // Fetch primary business details when employee is selected
  useEffect(() => {
    if (!recipientEmployeeId) { setLenderBusiness(null); return }
    const emp = employees.find(e => e.id === recipientEmployeeId)
    const bizId = emp?.primaryBusiness?.id
    if (!bizId) { setLenderBusiness(null); return }
    fetch(`/api/businesses/${bizId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.data) {
          setLenderBusiness({
            name: data.data.name,
            address: data.data.address ?? null,
            phone: data.data.phone ?? null,
          })
        }
      })
      .catch(() => { /* fall back to no business info */ })
  }, [recipientEmployeeId, employees])

  const validateDetails = (): string | null => {
    if (!recipientEmployeeId) return 'Select an employee'
    if (!parsedAmount || parsedAmount <= 0) return 'Enter a valid loan amount'
    if (!parsedInstallment || parsedInstallment <= 0) return 'Enter a monthly installment or number of months'
    if (!parsedMonths || parsedMonths <= 0) return 'Enter the number of months or a monthly installment'
    if (parsedInstallment >= parsedAmount) return 'Monthly installment must be less than the loan amount'
    if (!disbursementDate) return 'Enter disbursement date'
    return null
  }

  const handleNext = () => {
    const err = validateDetails()
    if (err) { toast.push(err, { type: 'error' }); return }
    setStep('contract')
  }

  const handleSubmit = async () => {
    if (!contractConsent) {
      toast.push('Payroll deduction consent is required', { type: 'error' })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/payroll/account/outgoing-loans', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmployeeId,
          principalAmount: parsedAmount,
          monthlyInstallment: parsedInstallment,
          totalMonths: parsedMonths,
          disbursementDate,
          dueDate: dueDate || undefined,
          purpose: purpose || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.push(`Loan request submitted for ${selectedEmployee?.fullName} — pending approval`, { type: 'success' })
        onSuccess()
      } else {
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

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤝</span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Lend to Employee</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {step === 'details' ? 'Step 1: Loan Details' : 'Step 2: Contract Review'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-5 space-y-4">
          {step === 'details' ? (
            <>
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
                Loan will be sourced from the payroll account. Balance check happens at approval.
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Employee</label>
                {loadingEmployees ? (
                  <p className="text-sm text-gray-400">Loading employees...</p>
                ) : (
                  <select
                    value={recipientEmployeeId}
                    onChange={(e) => setRecipientEmployeeId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select employee...</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>{e.fullName} ({e.employeeNumber})</option>
                    ))}
                  </select>
                )}
                {selectedEmployee && !selectedEmployee.phone && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    ⚠️ This employee has no phone number on file — approval will be blocked until it is added to their employee record.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Loan Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number" step="0.01" min="0.01"
                      value={amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      className="w-full pl-7 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Disbursement Date</label>
                  <DateInput value={disbursementDate} onChange={setDisbursementDate} />
                </div>
              </div>

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
                        onChange={(e) => handleInstallmentChange(e.target.value)}
                        className="w-full pl-7 pr-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Duration (months)</label>
                    <input
                      type="number" min="1"
                      value={totalMonths}
                      onChange={(e) => handleMonthsChange(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. 5"
                    />
                  </div>
                </div>
                {parsedInstallment > 0 && parsedMonths > 0 && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
                    {lastPayment !== parsedInstallment && parsedMonths > 1 ? (
                      <p>{parsedMonths - 1} × ${parsedInstallment} + last payment ${lastPayment.toFixed(2)}</p>
                    ) : (
                      <p>{parsedMonths} × ${parsedInstallment}</p>
                    )}
                    <p className="font-medium">Total: ${parsedAmount.toFixed(2)}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Purpose (optional)</label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Medical"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Due Date (optional)</label>
                  <DateInput value={dueDate} onChange={setDueDate} />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 space-y-2">
                <p className="font-semibold text-base text-gray-900 dark:text-gray-100">LOAN AGREEMENT</p>
                <div className="border-t border-gray-200 dark:border-gray-600 pt-2 space-y-1">
                  <p><span className="font-medium">Lender:</span> Payroll Account</p>
                  <p><span className="font-medium">Borrower:</span> {selectedEmployee?.fullName} ({selectedEmployee?.employeeNumber})</p>
                  <p><span className="font-medium">Loan Amount:</span> ${parsedAmount.toFixed(2)}</p>
                  <p><span className="font-medium">Monthly Deduction:</span> ${parsedInstallment} × {parsedMonths > 1 ? parsedMonths - 1 : parsedMonths} months</p>
                  {lastPayment !== parsedInstallment && parsedMonths > 1 && (
                    <p><span className="font-medium">Final Payment:</span> ${lastPayment.toFixed(2)}</p>
                  )}
                  <p><span className="font-medium">Duration:</span> {parsedMonths} months</p>
                  {dueDate && <p><span className="font-medium">Due Date:</span> {dueDate}</p>}
                  {purpose && <p><span className="font-medium">Purpose:</span> {purpose}</p>}
                </div>
                <div className="border-t border-gray-200 dark:border-gray-600 pt-2 space-y-1">
                  <p className="font-medium">Terms:</p>
                  <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400">
                    <li>The borrower authorizes deduction of ${parsedInstallment.toFixed(2)} from each monthly payroll until the loan is fully repaid.</li>
                    <li>Loan repayments will be credited back to the payroll account.</li>
                    <li>Early repayment is permitted without penalty.</li>
                    <li>In case of employment termination, the outstanding balance becomes immediately due.</li>
                  </ol>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-300">
                <p className="font-medium mb-1">Next steps after submission:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Manager reviews and approves the request.</li>
                  <li>Print contract — employee physically signs it.</li>
                  <li>Manager confirms physical signature → funds released.</li>
                </ol>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contractConsent}
                  onChange={(e) => setContractConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  I confirm the above loan details are correct and this request should proceed to manager approval.
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between gap-3 flex-shrink-0">
          <button
            onClick={() => step === 'details' ? onClose() : setStep('details')}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {step === 'details' ? 'Cancel' : 'Back'}
          </button>
          {step === 'details' ? (
            <button
              onClick={handleNext}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Review Contract →
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => printLoanContract({
                  loanNumber: 'DRAFT',
                  borrowerName: selectedEmployee?.fullName ?? 'Employee',
                  borrowerEmployeeNumber: selectedEmployee?.employeeNumber ?? '',
                  borrowerPhone: selectedEmployee?.phone ?? null,
                  principalAmount: parsedAmount,
                  monthlyInstallment: parsedInstallment,
                  totalMonths: parsedMonths,
                  disbursementDate: disbursementDate,
                  dueDate: dueDate || null,
                  purpose: purpose || null,
                  lenderBusiness,
                  dateFormat,
                })}
                className="px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                🖨️ Print Contract
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !contractConsent}
                className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
