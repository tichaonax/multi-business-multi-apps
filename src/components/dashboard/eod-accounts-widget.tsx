'use client'

import { useState, useEffect } from 'react'

interface EodAccount {
  id: string
  accountName: string
  dailyAmount: number
  cashBoxBalance: number
}

interface BusinessGroup {
  business: { id: string; name: string; type: string }
  accounts: EodAccount[]
  payrollCashBox: number
}

function CashBox({ label, balance, dailyAmount, icon }: {
  label: string
  balance: number
  dailyAmount?: number
  icon: string
}) {
  return (
    <div className="flex flex-col gap-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 min-w-[150px]">
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
    </div>
  )
}

export function EodAccountsWidget() {
  const [groups, setGroups] = useState<BusinessGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/eod-accounts')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.data) setGroups(data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || groups.length === 0) return null

  const grandTotal = groups.reduce(
    (sum, g) =>
      sum +
      g.accounts.reduce((s, a) => s + a.cashBoxBalance, 0) +
      g.payrollCashBox,
    0
  )

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
          📦 Cash Box Balances
          <span className="text-sm font-normal text-secondary">
            ${grandTotal.toFixed(2)} set aside
          </span>
        </h3>
      </div>
      <p className="text-xs text-secondary mb-4">
        Cumulative cash physically set aside by cashiers during EOD allocation — pending deposit into each account.
      </p>

      <div className="space-y-4">
        {groups.map(({ business, accounts, payrollCashBox }) => (
          <div key={business.id}>
            <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">
              {business.name}
            </p>
            <div className="flex flex-wrap gap-2">
              {accounts.map(acc => (
                <CashBox
                  key={acc.id}
                  icon="🏦"
                  label={acc.accountName}
                  balance={acc.cashBoxBalance}
                  dailyAmount={acc.dailyAmount}
                />
              ))}
              {payrollCashBox > 0 && (
                <CashBox
                  icon="💼"
                  label="Payroll"
                  balance={payrollCashBox}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
