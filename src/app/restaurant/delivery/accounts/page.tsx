'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useToastContext } from '@/components/ui/toast'

type DeliveryAccount = {
  id: string | null
  customerId: string
  customerName: string
  customerPhone?: string
  balance: number
  isBlacklisted: boolean
  blacklistReason?: string | null
  blacklistedAt?: string | null
  transactions: Transaction[]
}

type Transaction = {
  id: string
  type: 'CREDIT' | 'DEBIT'
  amount: number
  orderId?: string | null
  notes?: string | null
  createdAt: string
}

type Customer = {
  id: string
  name: string
  phone?: string
  customerNumber: string
}

type AccountSummary = {
  id: string
  customerId: string
  balance: number
  isBlacklisted: boolean
  customer: { id: string; name: string; phone?: string | null; customerNumber: string }
}

export default function DeliveryAccountsPage() {
  const { currentBusinessId, isSystemAdmin, hasPermission, loading: contextLoading } = useBusinessPermissionsContext()
  const toast = useToastContext()
  const router = useRouter()

  const canViewQueue = isSystemAdmin || hasPermission('canViewDeliveryQueue')
  const canAddCredit = isSystemAdmin || hasPermission('canManageDeliveryCredit')
  const canBlacklist = isSystemAdmin || hasPermission('canManageDeliveryBlacklist')

  useEffect(() => {
    if (contextLoading) return
    if (!canViewQueue) router.replace('/restaurant')
  }, [canViewQueue, router, contextLoading])

  // Customer search
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  // Cache of known blacklist status: customerId → true/false (populated as accounts load)
  const [knownBlacklist, setKnownBlacklist] = useState<Record<string, boolean>>({})

  // Selected customer account detail
  const [selectedAccount, setSelectedAccount] = useState<DeliveryAccount | null>(null)
  const [loadingAccount, setLoadingAccount] = useState(false)

  // Add credit modal
  const [showAddCredit, setShowAddCredit] = useState(false)
  const [creditAmount, setCreditAmount] = useState('')
  const [creditNotes, setCreditNotes] = useState('')
  const [submittingCredit, setSubmittingCredit] = useState(false)

  // Blacklist modal
  const [showBlacklist, setShowBlacklist] = useState(false)
  const [blacklistReason, setBlacklistReason] = useState('')
  const [submittingBlacklist, setSubmittingBlacklist] = useState(false)

  // Accounts list (customers with balance)
  const [accountsList, setAccountsList] = useState<AccountSummary[]>([])
  const [loadingList, setLoadingList] = useState(false)
  // Quick top-up: accountId → open
  const [quickTopup, setQuickTopup] = useState<AccountSummary | null>(null)
  const [quickAmount, setQuickAmount] = useState('')
  const [quickNotes, setQuickNotes] = useState('')
  const [submittingQuick, setSubmittingQuick] = useState(false)

  const loadAccountsList = useCallback(async () => {
    if (!currentBusinessId) return
    setLoadingList(true)
    try {
      const res = await fetch(`/api/restaurant/delivery/accounts?businessId=${currentBusinessId}`)
      const data = await res.json()
      if (data.success) setAccountsList(data.accounts)
    } catch {
      // silent
    } finally {
      setLoadingList(false)
    }
  }, [currentBusinessId])

  useEffect(() => {
    loadAccountsList()
  }, [loadAccountsList])

  const searchCustomers = useCallback(async () => {
    if (!currentBusinessId || search.trim().length < 2) {
      setCustomers([])
      return
    }
    setLoadingCustomers(true)
    try {
      const res = await fetch(`/api/customers?businessId=${currentBusinessId}&search=${encodeURIComponent(search)}&limit=20`)
      const data = await res.json()
      if (data.customers) setCustomers(data.customers)
    } catch {
      // silent
    } finally {
      setLoadingCustomers(false)
    }
  }, [currentBusinessId, search])

  useEffect(() => {
    const t = setTimeout(searchCustomers, 350)
    return () => clearTimeout(t)
  }, [searchCustomers])

  const loadAccount = useCallback(async (customer: Customer) => {
    setLoadingAccount(true)
    setSelectedAccount(null)
    try {
      const res = await fetch(`/api/restaurant/delivery/accounts/${customer.id}`)
      const data = await res.json()
      if (data.success) {
        setSelectedAccount({
          ...data.account,
          customerName: customer.name,
          customerPhone: customer.phone,
          transactions: data.account.transactions || [],
        })
        setKnownBlacklist(prev => ({ ...prev, [customer.id]: !!data.account.isBlacklisted }))
      }
    } catch {
      toast.error('Failed to load account')
    } finally {
      setLoadingAccount(false)
    }
  }, [toast])

  const handleAddCredit = async () => {
    if (!selectedAccount || !currentBusinessId) return
    const amount = parseFloat(creditAmount)
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return }
    setSubmittingCredit(true)
    try {
      const res = await fetch('/api/restaurant/delivery/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedAccount.customerId,
          businessId: currentBusinessId,
          amount,
          notes: creditNotes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { toast.error(data.error || 'Failed to add credit'); return }
      toast.push(`Added $${amount.toFixed(2)} credit`)
      setShowAddCredit(false)
      setCreditAmount('')
      setCreditNotes('')
      // Reload account
      await loadAccount({ id: selectedAccount.customerId, name: selectedAccount.customerName, phone: selectedAccount.customerPhone, customerNumber: '' })
    } catch {
      toast.error('Failed to add credit')
    } finally {
      setSubmittingCredit(false)
    }
  }

  const handleQuickTopup = async () => {
    if (!quickTopup || !currentBusinessId) return
    const amount = parseFloat(quickAmount)
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return }
    setSubmittingQuick(true)
    try {
      const res = await fetch('/api/restaurant/delivery/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: quickTopup.customerId, businessId: currentBusinessId, amount, notes: quickNotes || undefined }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { toast.error(data.error || 'Failed to add credit'); return }
      toast.push(`Added $${amount.toFixed(2)} to ${quickTopup.customer.name}`)
      setQuickTopup(null)
      setQuickAmount('')
      setQuickNotes('')
      loadAccountsList()
      // Refresh detail panel if open
      if (selectedAccount?.customerId === quickTopup.customerId) {
        await loadAccount({ id: quickTopup.customerId, name: quickTopup.customer.name, phone: quickTopup.customer.phone || undefined, customerNumber: '' })
      }
    } catch {
      toast.error('Failed to add credit')
    } finally {
      setSubmittingQuick(false)
    }
  }

  const handleBlacklist = async (action: 'ban' | 'unban') => {
    if (!selectedAccount) return
    if (action === 'ban' && !blacklistReason.trim()) { toast.error('Reason is required to ban a customer'); return }
    setSubmittingBlacklist(true)
    try {
      const res = await fetch(`/api/restaurant/delivery/accounts/${selectedAccount.customerId}/blacklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: blacklistReason || undefined }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { toast.error(data.error || 'Failed to update blacklist'); return }
      toast.push(action === 'ban' ? 'Customer blacklisted' : 'Blacklist removed')
      setShowBlacklist(false)
      setBlacklistReason('')
      await loadAccount({ id: selectedAccount.customerId, name: selectedAccount.customerName, phone: selectedAccount.customerPhone, customerNumber: '' })
    } catch {
      toast.error('Failed to update blacklist')
    } finally {
      setSubmittingBlacklist(false)
    }
  }

  return (
    <BusinessTypeRoute requiredBusinessType="restaurant">
      <ContentLayout title="Delivery Accounts">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Accounts with balance */}
          <div className="card bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Customer Balances</h2>
              {loadingList && <span className="text-xs text-gray-400">Loading...</span>}
            </div>
            {!loadingList && accountsList.length === 0 ? (
              <p className="text-sm text-gray-400">No customers have a credit balance.</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {accountsList.map(acc => (
                  <div key={acc.id} className="flex items-center justify-between py-2.5 gap-3">
                    <button
                      onClick={() => loadAccount({ id: acc.customerId, name: acc.customer.name, phone: acc.customer.phone || undefined, customerNumber: acc.customer.customerNumber })}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-800 dark:text-gray-200">{acc.customer.name}</span>
                        {acc.isBlacklisted && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-medium">Blacklisted</span>
                        )}
                        {acc.customer.phone && <span className="text-xs text-gray-400">{acc.customer.phone}</span>}
                      </div>
                    </button>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400 whitespace-nowrap">${Number(acc.balance).toFixed(2)}</span>
                    {canAddCredit && (
                      <button
                        onClick={() => { setQuickTopup(acc); setQuickAmount(''); setQuickNotes('') }}
                        className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 whitespace-nowrap"
                      >
                        + Top Up
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer search */}
          <div className="card bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">Find Customer</h2>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            {loadingCustomers && <p className="text-xs text-gray-400 mt-2">Searching...</p>}
            {customers.length > 0 && (
              <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-700 border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
                {customers.map(c => (
                  <li key={c.id}>
                    <button
                      onClick={() => { loadAccount(c); setSearch(''); setCustomers([]) }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-800 dark:text-gray-200">{c.name}</span>
                        {knownBlacklist[c.id] && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-medium">Blacklisted</span>
                        )}
                        {c.phone && <span className="text-gray-400">{c.phone}</span>}
                        <span className="text-gray-400 font-mono text-xs">{c.customerNumber}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Account detail */}
          {loadingAccount && (
            <div className="text-center text-gray-400 py-8">Loading account...</div>
          )}

          {selectedAccount && !loadingAccount && (
            <div className="card bg-white dark:bg-gray-900 p-4 rounded-lg shadow space-y-4">

              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{selectedAccount.customerName}</h2>
                    {selectedAccount.isBlacklisted && (
                      <span className="text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 px-2 py-0.5 rounded-full">BLACKLISTED</span>
                    )}
                  </div>
                  {selectedAccount.customerPhone && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedAccount.customerPhone}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">${selectedAccount.balance.toFixed(2)}</div>
                  <div className="text-xs text-gray-400">Credit Balance</div>
                </div>
              </div>

              {/* Blacklist reason */}
              {selectedAccount.isBlacklisted && selectedAccount.blacklistReason && (
                <div className="text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2 text-red-700 dark:text-red-400">
                  Reason: {selectedAccount.blacklistReason}
                </div>
              )}

              {/* Actions (management only) */}
              {(canAddCredit || canBlacklist) && (
                <div className="flex gap-2 flex-wrap">
                  {canAddCredit && (
                    <button
                      onClick={() => setShowAddCredit(true)}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                    >
                      + Add Credit
                    </button>
                  )}
                  {canBlacklist && (
                    selectedAccount.isBlacklisted ? (
                      <button
                        onClick={() => handleBlacklist('unban')}
                        disabled={submittingBlacklist}
                        className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50"
                      >
                        Remove Blacklist
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowBlacklist(true)}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
                      >
                        Blacklist
                      </button>
                    )
                  )}
                </div>
              )}

              {/* Transaction history */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Transaction History</h3>
                {selectedAccount.transactions.length === 0 ? (
                  <p className="text-sm text-gray-400">No transactions yet</p>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700 border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden text-sm">
                    {selectedAccount.transactions.map(t => (
                      <div key={t.id} className="flex items-center justify-between px-3 py-2">
                        <div>
                          <span className={`font-medium ${t.type === 'CREDIT' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {t.type === 'CREDIT' ? '+' : '-'}${Number(t.amount).toFixed(2)}
                          </span>
                          {t.notes && <span className="ml-2 text-gray-500 dark:text-gray-400">{t.notes}</span>}
                          {t.orderId && <span className="ml-2 text-gray-400 text-xs font-mono">{t.orderId.slice(-8)}</span>}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Add Credit modal */}
          {showAddCredit && selectedAccount && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Add Credit — {selectedAccount.customerName}</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={creditAmount}
                    onChange={e => setCreditAmount(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    value={creditNotes}
                    onChange={e => setCreditNotes(e.target.value)}
                    placeholder="e.g. Cash top-up"
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setShowAddCredit(false); setCreditAmount(''); setCreditNotes('') }} className="flex-1 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                  <button onClick={handleAddCredit} disabled={submittingCredit || !creditAmount} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                    {submittingCredit ? 'Adding...' : 'Add Credit'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Blacklist modal */}
          {showBlacklist && selectedAccount && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Blacklist — {selectedAccount.customerName}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">This customer will be blocked from placing delivery orders.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (required)</label>
                  <textarea
                    rows={3}
                    value={blacklistReason}
                    onChange={e => setBlacklistReason(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setShowBlacklist(false); setBlacklistReason('') }} className="flex-1 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                  <button onClick={() => handleBlacklist('ban')} disabled={submittingBlacklist || !blacklistReason.trim()} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                    {submittingBlacklist ? 'Saving...' : 'Confirm Blacklist'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick top-up modal (from accounts list) */}
          {quickTopup && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Top Up — {quickTopup.customer.name}</h3>
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>Current balance</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">${Number(quickTopup.balance).toFixed(2)}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quickAmount}
                    onChange={e => setQuickAmount(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    value={quickNotes}
                    onChange={e => setQuickNotes(e.target.value)}
                    placeholder="e.g. Cash top-up"
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setQuickTopup(null); setQuickAmount(''); setQuickNotes('') }} className="flex-1 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                  <button onClick={handleQuickTopup} disabled={submittingQuick || !quickAmount} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                    {submittingQuick ? 'Adding...' : 'Add Credit'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </ContentLayout>
    </BusinessTypeRoute>
  )
}
