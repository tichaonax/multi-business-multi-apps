'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { CashBoxHistoryModal } from './cash-box-history-modal'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'

interface EodAccount {
  id: string
  accountName: string
  dailyAmount: number
  cashBoxBalance: number
  isLoanAccount?: boolean
  loanBalanceOwed?: number
  availableToWithdraw?: number
  loanStatus?: string
  businessContributions?: { businessId: string; businessName: string; cashBoxBalance: number }[]
}

interface BusinessGroup {
  business: { id: string; name: string; type: string }
  accounts: EodAccount[]
  payrollCashBox: number
  canViewPayroll: boolean
  subtotal?: number
}

interface SelectedAccount {
  id?: string
  accountName: string
  businessName: string
  type: 'account' | 'payroll'
  businessId?: string
}

function fmtMoney(n: number): string {
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `-$${abs}` : `$${abs}`
}

function CashBox({
  label, balance, dailyAmount, icon, onClick,
  isLoanAccount, loanBalanceOwed, availableToWithdraw, loanStatus,
  neverNegative,
}: {
  label: string
  balance: number
  dailyAmount?: number
  icon: string
  onClick: () => void
  isLoanAccount?: boolean
  loanBalanceOwed?: number
  availableToWithdraw?: number
  loanStatus?: string
  // Payroll's cash box is physical cash on hand — it can't go below zero, so a
  // negative underlying figure (funding not yet caught up to contributions) is
  // display-clamped to $0 rather than shown as an owed amount, unlike loan/expense
  // accounts where a negative balance is a real, meaningful owed figure.
  neverNegative?: boolean
}) {
  if (isLoanAccount) {
    return (
      <button
        onClick={onClick}
        className="flex flex-col gap-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 min-w-[170px] text-left hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-1">
          <span className="text-sm">{icon}</span>
          <span className="text-xs text-secondary truncate" title={label}>{label}</span>
        </div>
        {loanStatus === 'LOCKED' ? (
          <>
            <span className="text-xs text-secondary">Available to withdraw</span>
            <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {fmtMoney(availableToWithdraw ?? 0)}
            </span>
          </>
        ) : (
          <span className="text-xs text-amber-600 dark:text-amber-400 italic">
            {loanStatus === 'SETTLED' ? 'Fully repaid' : 'Still recording — not locked yet'}
          </span>
        )}
        <span className="text-xs text-red-500 dark:text-red-400/80">
          Owed: {fmtMoney(-(loanBalanceOwed ?? 0))}
        </span>
        {dailyAmount !== undefined && (
          <span className="text-xs text-gray-400">+${dailyAmount.toFixed(0)}/day</span>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 min-w-[150px] text-left hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-1">
        <span className="text-sm">{icon}</span>
        <span className="text-xs text-secondary truncate" title={label}>{label}</span>
      </div>
      <span className={`text-base font-bold font-mono ${balance < 0 && !neverNegative ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
        {fmtMoney(neverNegative ? Math.max(0, balance) : balance)}
      </span>
      {balance < 0 && !neverNegative && (
        <span className="text-[10px] text-red-500 dark:text-red-400/80">still owed</span>
      )}
      {dailyAmount !== undefined && (
        <span className="text-xs text-gray-400">+${dailyAmount.toFixed(0)}/day</span>
      )}
    </button>
  )
}

// The global payroll account has no per-business history to browse here (that's the
// dedicated Payroll → Payroll Account page's job) — just a quick balance + correction,
// so a user doesn't have to leave the dashboard for a simple adjustment. Mirrors the
// adjust form on that page (AccountBalanceCard) and the per-account/per-business ones
// in CashBoxHistoryModal.
function PayrollAccountAdjustModal({ balance, onAdjusted, onClose }: { balance: number; onAdjusted: () => void; onClose: () => void }) {
  const customAlert = useAlert()
  const confirm = useConfirm()
  const [target, setTarget] = useState(String(balance))
  const [reason, setReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  const handleAdjust = async () => {
    const value = parseFloat(target)
    if (isNaN(value)) {
      customAlert({ title: 'Invalid value', description: 'Enter a valid balance amount.' })
      return
    }
    if (!reason.trim()) {
      customAlert({ title: 'Reason required', description: 'Explain why this balance is being corrected.' })
      return
    }
    const confirmed = await confirm({
      title: 'Adjust Payroll Account Balance?',
      description: `This changes the balance from ${fmtMoney(balance)} to ${fmtMoney(value)} by posting an audited correction entry. This cannot be undone automatically — only with another correction.`,
      confirmText: 'Adjust Balance',
      cancelText: 'Cancel',
    })
    if (!confirmed) return

    setAdjusting(true)
    try {
      const res = await fetch('/api/payroll/account/adjust-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetBalance: value, reason: reason.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        onAdjusted()
        onClose()
      } else {
        customAlert({ title: 'Error', description: data.error || 'Failed to adjust balance.' })
      }
    } catch {
      customAlert({ title: 'Error', description: 'Network error. Please try again.' })
    } finally {
      setAdjusting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-lg p-5 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-bold mb-1">Adjust Payroll Account Balance</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Current balance: <span className="font-semibold">{fmtMoney(balance)}</span>. This posts an audited
          correction entry — it does not overwrite history. For full transaction history, see
          Payroll → Payroll Account.
        </p>

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correct Balance</label>
        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input
            type="number"
            step="0.01"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            autoFocus
            className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (required)</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="e.g. Reconciled against bank statement."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 mb-4"
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={adjusting}
            className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdjust}
            disabled={adjusting || !target || !reason.trim()}
            className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {adjusting ? 'Adjusting…' : 'Adjust Balance'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function EodAccountsWidget() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'
  const [groups, setGroups] = useState<BusinessGroup[]>([])
  const [sharedAccounts, setSharedAccounts] = useState<EodAccount[]>([])
  const [payrollAccountBalance, setPayrollAccountBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<SelectedAccount | null>(null)
  const [showPayrollAdjust, setShowPayrollAdjust] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const fetchAccounts = () => {
    fetch('/api/dashboard/eod-accounts')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.data) setGroups(data.data)
        if (data?.sharedAccounts) setSharedAccounts(data.sharedAccounts)
        setPayrollAccountBalance(data?.payrollAccount?.balance ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(fetchAccounts, [])

  if (loading || groups.length === 0) return null

  // Grand total = shared accounts (counted once) + per-business subtotals
  const sharedTotal = sharedAccounts.reduce((s, a) => s + a.cashBoxBalance, 0)
  const businessTotal = groups.reduce(
    (sum, g) => sum + (g.subtotal ?? g.accounts.reduce((s, a) => s + a.cashBoxBalance, 0) + g.payrollCashBox),
    0
  )
  const grandTotal = sharedTotal + businessTotal

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between p-4 sm:p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-primary">📦 Cash Box Balances</span>
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{fmtMoney(grandTotal)} set aside</span>
          <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full px-2 py-0.5">
            {groups.length} business{groups.length !== 1 ? 'es' : ''}
          </span>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
      <div className="px-4 sm:px-6 pb-6">
      <p className="text-xs text-secondary mb-4">
        Rent/expense accounts show the current balance, after any payments already made from it.
        Loan accounts show what's available to withdraw this cycle (the accumulated holding-bucket
        amount, once locked) alongside the total still owed. Payroll figures show cumulative EOD
        contributions (shared account — no separate per-business balance).
      </p>

      <div className="space-y-4">
        {/* Shared accounts (appear in more than one business) */}
        {sharedAccounts.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">
              Shared Across Businesses
              <span className="ml-2 font-normal normal-case text-gray-400">
                {fmtMoney(sharedTotal)}
              </span>
            </p>
            <div className="flex flex-wrap gap-3">
              {sharedAccounts.map(acc => (
                <div key={acc.id} className="flex flex-col gap-1">
                  <CashBox
                    icon="🔗"
                    label={acc.accountName}
                    balance={acc.cashBoxBalance}
                    dailyAmount={acc.dailyAmount}
                    isLoanAccount={acc.isLoanAccount}
                    loanBalanceOwed={acc.loanBalanceOwed}
                    availableToWithdraw={acc.availableToWithdraw}
                    loanStatus={acc.loanStatus}
                    onClick={() => setSelected({ id: acc.id, accountName: acc.accountName, businessName: 'Shared', type: 'account' })}
                  />
                  {acc.businessContributions && acc.businessContributions.length > 0 && (
                    <div className="flex flex-col gap-0.5 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                      <span className="text-[10px] text-gray-400 italic">lifetime contribution by business:</span>
                      {acc.businessContributions.map(c => (
                        <span key={c.businessId} className="text-xs text-gray-500 dark:text-gray-400 flex justify-between gap-3">
                          <span className="truncate">{c.businessName}</span>
                          <span className="font-mono text-gray-700 dark:text-gray-300">{fmtMoney(c.cashBoxBalance)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-business groups — laid out side by side, with the overall (shared)
            Payroll Account balance leading the row so it reads as "the account these
            per-business contributions feed into" rather than just another business. */}
        <div className="flex flex-wrap gap-4">
          {payrollAccountBalance !== null && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-secondary uppercase tracking-wide">
                Payroll Account
              </p>
              <div className="flex flex-wrap gap-2">
                <CashBox
                  icon="💼"
                  label="Overall Balance"
                  balance={payrollAccountBalance}
                  neverNegative
                  onClick={() => isAdmin && setShowPayrollAdjust(true)}
                />
              </div>
            </div>
          )}
          {groups.map(({ business, accounts, payrollCashBox, canViewPayroll, subtotal }) => {
            const bizTotal = subtotal ?? accounts.reduce((s, a) => s + a.cashBoxBalance, 0) + Math.max(0, payrollCashBox)
            return (
            <div key={business.id} className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-secondary uppercase tracking-wide">
                {business.name}
                <span className="ml-2 font-normal normal-case text-gray-400">
                  {fmtMoney(bizTotal)}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {accounts.map(acc => (
                  <CashBox
                    key={acc.id}
                    icon="🏦"
                    label={acc.accountName}
                    balance={acc.cashBoxBalance}
                    dailyAmount={acc.dailyAmount}
                    isLoanAccount={acc.isLoanAccount}
                    loanBalanceOwed={acc.loanBalanceOwed}
                    availableToWithdraw={acc.availableToWithdraw}
                    loanStatus={acc.loanStatus}
                    onClick={() => setSelected({ id: acc.id, accountName: acc.accountName, businessName: business.name, type: 'account' })}
                  />
                ))}
                {canViewPayroll && (
                  <CashBox
                    icon="💼"
                    label="Payroll"
                    balance={payrollCashBox}
                    neverNegative
                    onClick={() => setSelected({ accountName: 'Payroll', businessName: business.name, type: 'payroll', businessId: business.id })}
                  />
                )}
              </div>
            </div>
            )
          })}
        </div>
      </div>
      </div>
      )}

      {selected && (
        <CashBoxHistoryModal
          accountId={selected.id}
          accountName={selected.accountName}
          businessName={selected.businessName}
          type={selected.type}
          businessId={selected.businessId}
          isAdmin={isAdmin}
          onAdjusted={fetchAccounts}
          onClose={() => setSelected(null)}
        />
      )}

      {showPayrollAdjust && payrollAccountBalance !== null && (
        <PayrollAccountAdjustModal
          balance={payrollAccountBalance}
          onAdjusted={fetchAccounts}
          onClose={() => setShowPayrollAdjust(false)}
        />
      )}
    </div>
  )
}
