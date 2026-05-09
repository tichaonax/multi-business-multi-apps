'use client'

import { useState, useEffect } from 'react'
import { CashBoxHistoryModal } from './cash-box-history-modal'

interface EodAccount {
  id: string
  accountName: string
  dailyAmount: number
  cashBoxBalance: number
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

function CashBox({ label, balance, dailyAmount, icon, onClick }: {
  label: string
  balance: number
  dailyAmount?: number
  icon: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 min-w-[150px] text-left hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-1">
        <span className="text-sm">{icon}</span>
        <span className="text-xs text-secondary truncate" title={label}>{label}</span>
      </div>
      <span className="text-base font-bold font-mono text-gray-900 dark:text-gray-100">
        ${balance.toFixed(2)}
      </span>
      {dailyAmount !== undefined && (
        <span className="text-xs text-gray-400">+${dailyAmount.toFixed(0)}/day</span>
      )}
    </button>
  )
}

export function EodAccountsWidget() {
  const [groups, setGroups] = useState<BusinessGroup[]>([])
  const [sharedAccounts, setSharedAccounts] = useState<EodAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<SelectedAccount | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch('/api/dashboard/eod-accounts')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.data) setGroups(data.data)
        if (data?.sharedAccounts) setSharedAccounts(data.sharedAccounts)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} set aside</span>
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
        Cumulative cash physically set aside by cashiers during EOD allocation — pending deposit into each account.
      </p>

      <div className="space-y-4">
        {/* Shared accounts (appear in more than one business) */}
        {sharedAccounts.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">
              Shared Across Businesses
              <span className="ml-2 font-normal normal-case text-gray-400">
                ${sharedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    onClick={() => setSelected({ id: acc.id, accountName: acc.accountName, businessName: 'Shared', type: 'account' })}
                  />
                  {acc.businessContributions && acc.businessContributions.length > 0 && (
                    <div className="flex flex-col gap-0.5 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                      {acc.businessContributions.map(c => (
                        <span key={c.businessId} className="text-xs text-gray-500 dark:text-gray-400 flex justify-between gap-3">
                          <span className="truncate">{c.businessName}</span>
                          <span className="font-mono text-gray-700 dark:text-gray-300">${c.cashBoxBalance.toFixed(2)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {groups.map(({ business, accounts, payrollCashBox, canViewPayroll, subtotal }) => {
          const bizTotal = subtotal ?? accounts.reduce((s, a) => s + a.cashBoxBalance, 0) + payrollCashBox
          return (
          <div key={business.id}>
            <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">
              {business.name}
              <span className="ml-2 font-normal normal-case text-gray-400">
                ${bizTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  onClick={() => setSelected({ id: acc.id, accountName: acc.accountName, businessName: business.name, type: 'account' })}
                />
              ))}
              {payrollCashBox > 0 && canViewPayroll && (
                <CashBox
                  icon="💼"
                  label="Payroll"
                  balance={payrollCashBox}
                  onClick={() => setSelected({ accountName: 'Payroll', businessName: business.name, type: 'payroll', businessId: business.id })}
                />
              )}
            </div>
          </div>
          )
        })}
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
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
