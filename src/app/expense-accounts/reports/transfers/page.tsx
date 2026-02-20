'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { ContentLayout } from '@/components/layout/content-layout'
import { ReturnTransferModal } from '@/components/expense-account/return-transfer-modal'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import Link from 'next/link'

interface TransferRecord {
  id: string
  fromBusinessId: string
  fromBusinessName: string
  toBusinessId: string | null
  toAccount: { id: string; accountName: string; accountNumber: string }
  originalAmount: number
  outstandingAmount: number
  returnedAmount: number
  transferDate: string
  status: string
}

function statusBadge(status: string) {
  if (status === 'RETURNED') {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">Returned</span>
  }
  if (status === 'PARTIALLY_RETURNED') {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Partial</span>
  }
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Outstanding</span>
}

export default function TransferImbalanceReportPage() {
  const { currentBusiness, hasPermission, isSystemAdmin } = useBusinessPermissionsContext()

  const [transfers, setTransfers] = useState<TransferRecord[]>([])
  const [totalOutstanding, setTotalOutstanding] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('') // '' = outstanding+partial

  // Modal state
  const [returnModal, setReturnModal] = useState<{ accountId: string; transferId: string } | null>(null)

  const canReturnTransfer = isSystemAdmin || hasPermission('canMakeExpensePayments')
  const currentBusinessId = currentBusiness?.businessId

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const loadTransfers = async () => {
    try {
      setLoading(true)
      const params = statusFilter ? `?status=${statusFilter}` : ''
      const res = await fetch(`/api/expense-account/transfers${params}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setTransfers(data.data?.transfers || [])
        setTotalOutstanding(data.data?.totalOutstanding || 0)
      }
    } catch (e) {
      console.error('Error loading transfers:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTransfers()
  }, [statusFilter])

  return (
    <ContentLayout title="Transfer Imbalance Report" subtitle="Cross-business transfers and outstanding return amounts">
      <div className="space-y-6">
        {/* Back link */}
        <Link
          href="/expense-accounts"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Expense Accounts
        </Link>

        {/* Summary Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Outstanding Transfers</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Money received from other businesses that has not been fully returned
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalOutstanding)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total outstanding</p>
            </div>
          </div>

          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {[
              { label: 'Outstanding + Partial', value: '' },
              { label: 'Outstanding Only', value: 'OUTSTANDING' },
              { label: 'Partially Returned', value: 'PARTIALLY_RETURNED' },
              { label: 'Fully Returned', value: 'RETURNED' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-gray-600 dark:text-gray-400 font-medium">No transfers found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                All cross-business transfers have been returned or none exist.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">From Business</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">To Account</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Original</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Returned</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Outstanding</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    {canReturnTransfer && (
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {transfers.map((t) => {
                    // Show return button if the current business RECEIVED the money (owns the toAccount)
                    // Admin can return any outstanding transfer
                    const isReceiver = isSystemAdmin || (!!currentBusinessId && t.toBusinessId === currentBusinessId)
                    const canReturn = canReturnTransfer && isReceiver && t.status !== 'RETURNED'

                    return (
                      <tr key={t.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{t.fromBusinessName}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/expense-accounts/${t.toAccount.id}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {t.toAccount.accountName}
                          </Link>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{t.toAccount.accountNumber}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(t.originalAmount)}</td>
                        <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{formatCurrency(t.returnedAmount)}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          <span className={t.outstandingAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                            {formatCurrency(t.outstandingAmount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                          {new Date(t.transferDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-center">{statusBadge(t.status)}</td>
                        {canReturnTransfer && (
                          <td className="px-4 py-3 text-center">
                            {canReturn ? (
                              <button
                                onClick={() => setReturnModal({ accountId: t.toAccount.id, transferId: t.id })}
                                className="px-3 py-1 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                              >
                                🔄 Return
                              </button>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-600">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Total Outstanding ({transfers.length} transfers)
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(totalOutstanding)}
                    </td>
                    <td colSpan={canReturnTransfer ? 3 : 2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Return Transfer Modal */}
      {returnModal && (
        <ReturnTransferModal
          accountId={returnModal.accountId}
          preSelectedTransferId={returnModal.transferId}
          onSuccess={() => {
            setReturnModal(null)
            loadTransfers()
          }}
          onClose={() => setReturnModal(null)}
        />
      )}
    </ContentLayout>
  )
}
