'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface PendingData {
  loanLockRequests: { id: string; loanNumber: string; description: string; lockRequester: { name: string } | null; managedBy: { name: string } | null; lockRequestedAt: string | null }[]
  pendingPettyCash: { id: string; purpose: string; requestedAmount: string; requester: { name: string } | null; requestedAt: string }[]
  pendingCashAllocations: { id: string; reportDate: string; status: string; business: { id: string; name: string; type: string } | null; _count: { lineItems: number } }[]
  pendingPaymentRequests: { id: string; accountName: string; accountNumber: string; requestCount: number; business: { id: string; name: string } | null }[]
  total: number
}

export function LoanPendingActionsWidget() {
  const [data, setData] = useState<PendingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/pending-actions', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data || data.total === 0) return null

  return (
    <div className="mt-6 space-y-4">
      {/* Loan lock requests */}
      {data.loanLockRequests.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔒</span>
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                Loan Lock Requests
                <span className="ml-2 bg-yellow-500 text-white text-xs font-bold rounded-full px-2 py-0.5">{data.loanLockRequests.length}</span>
              </h3>
            </div>
            <Link href="/admin/pending-actions" className="text-xs text-yellow-700 dark:text-yellow-300 underline hover:no-underline">View all</Link>
          </div>
          <div className="space-y-2">
            {data.loanLockRequests.slice(0, 3).map(item => (
              <div key={item.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded px-3 py-2 border border-yellow-200 dark:border-yellow-700">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{item.loanNumber} — {item.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    By {item.lockRequester?.name ?? item.managedBy?.name ?? 'Unknown'}
                    {item.lockRequestedAt && <> · {new Date(item.lockRequestedAt).toLocaleDateString()}</>}
                  </p>
                </div>
                <Link href={`/loans/${item.id}`} className="ml-3 px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-medium rounded transition-colors shrink-0">Review</Link>
              </div>
            ))}
            {data.loanLockRequests.length > 3 && (
              <p className="text-xs text-yellow-700 dark:text-yellow-400 text-center pt-1">
                +{data.loanLockRequests.length - 3} more — <Link href="/admin/pending-actions" className="underline">see all</Link>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Cash allocation reports */}
      {data.pendingCashAllocations?.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">💰</span>
              <h3 className="font-semibold text-blue-800 dark:text-blue-200">
                Cash Allocation
                <span className="ml-2 bg-blue-500 text-white text-xs font-bold rounded-full px-2 py-0.5">{data.pendingCashAllocations.length}</span>
              </h3>
            </div>
            <Link href="/admin/pending-actions" className="text-xs text-blue-700 dark:text-blue-300 underline hover:no-underline">View all</Link>
          </div>
          <div className="space-y-2">
            {data.pendingCashAllocations.slice(0, 3).map(item => {
              const reportDate = item.reportDate.split('T')[0]
              const url = `/${item.business?.type ?? 'restaurant'}/reports/cash-allocation?date=${reportDate}&businessId=${item.business?.id ?? ''}`
              return (
                <div key={item.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded px-3 py-2 border border-blue-200 dark:border-blue-700">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.business?.name ?? 'Unknown'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(item.reportDate).toLocaleDateString('en-US', { timeZone: 'UTC' })} · {item._count.lineItems} items · {item.status}
                    </p>
                  </div>
                  <Link href={url} className="ml-3 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors shrink-0">Reconcile</Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Payment batch requests */}
      {data.pendingPaymentRequests?.length > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-300 dark:border-indigo-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📦</span>
              <h3 className="font-semibold text-indigo-800 dark:text-indigo-200">
                Payment Requests
                <span className="ml-2 bg-indigo-500 text-white text-xs font-bold rounded-full px-2 py-0.5">{data.pendingPaymentRequests.length}</span>
              </h3>
            </div>
            <Link href="/admin/pending-actions" className="text-xs text-indigo-700 dark:text-indigo-300 underline hover:no-underline">View all</Link>
          </div>
          <div className="space-y-2">
            {data.pendingPaymentRequests.slice(0, 3).map(item => (
              <div key={item.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded px-3 py-2 border border-indigo-200 dark:border-indigo-700">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{item.accountName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.business?.name ?? ''} · {item.requestCount} pending
                  </p>
                </div>
                <Link href={`/expense-accounts/${item.id}`} className="ml-3 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded transition-colors shrink-0">Submit</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Petty cash requests */}
      {data.pendingPettyCash.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">💵</span>
              <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                Petty Cash Requests
                <span className="ml-2 bg-orange-500 text-white text-xs font-bold rounded-full px-2 py-0.5">{data.pendingPettyCash.length}</span>
              </h3>
            </div>
            <Link href="/admin/pending-actions" className="text-xs text-orange-700 dark:text-orange-300 underline hover:no-underline">View all</Link>
          </div>
          <div className="space-y-2">
            {data.pendingPettyCash.slice(0, 3).map(item => (
              <div key={item.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded px-3 py-2 border border-orange-200 dark:border-orange-700">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{item.purpose}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ${Number(item.requestedAmount).toFixed(2)} · {item.requester?.name ?? 'Unknown'} · {new Date(item.requestedAt).toLocaleDateString()}
                  </p>
                </div>
                <Link href={`/petty-cash/${item.id}`} className="ml-3 px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded transition-colors shrink-0">Handle</Link>
              </div>
            ))}
            {data.pendingPettyCash.length > 3 && (
              <p className="text-xs text-orange-700 dark:text-orange-400 text-center pt-1">
                +{data.pendingPettyCash.length - 3} more — <Link href="/admin/pending-actions" className="underline">see all</Link>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
