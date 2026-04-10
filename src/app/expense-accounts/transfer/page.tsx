'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { TransferModal } from '@/components/expense-account/transfer-modal'
import Link from 'next/link'
import { TransferHistory } from '@/components/expense-account/transfer-history'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

interface AccountOption {
  id: string
  accountName: string
  accountNumber: string
  accountType: string
  balance: number
  isActive: boolean
}

export default function TransferFundsPage() {
  const { status } = useSession()
  const router = useRouter()
  const { hasPermission, isSystemAdmin, loading: permissionsLoading } = useBusinessPermissionsContext()

  const canTransfer = isSystemAdmin || hasPermission('canTransferBetweenAccounts')

  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (!permissionsLoading && !canTransfer) router.push('/dashboard')
  }, [permissionsLoading, canTransfer, router])

  useEffect(() => {
    if (!canTransfer) return
    setLoadingAccounts(true)
    fetch('/api/expense-account?simple=true', { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          const opts: AccountOption[] = (json.data?.accounts ?? [])
            .filter((a: AccountOption) => a.isActive && a.accountType !== 'RENT')
            .map((a: AccountOption) => ({
              id: a.id,
              accountName: a.accountName,
              accountNumber: a.accountNumber,
              accountType: a.accountType,
              balance: Number(a.balance ?? 0),
              isActive: a.isActive,
            }))
          setAccounts(opts)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAccounts(false))
  }, [canTransfer, refreshKey])

  if (status === 'loading' || permissionsLoading) {
    return (
      <ContentLayout title="Transfer Funds">
        <div className="flex items-center justify-center h-64">
          <div className="text-secondary">Loading...</div>
        </div>
      </ContentLayout>
    )
  }

  if (!canTransfer) return null

  const selectedAccount = accounts.find(a => a.id === selectedAccountId)

  return (
    <ContentLayout title="Transfer Funds">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Source account selector */}
        <div className="card p-5">
          <h2 className="text-base font-semibold mb-4">New Transfer</h2>

          {loadingAccounts ? (
            <p className="text-sm text-gray-400">Loading accounts...</p>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-gray-400">No transferable accounts available.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Source Account <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedAccountId}
                  onChange={e => setSelectedAccountId(e.target.value)}
                  className="input w-full px-3 py-2"
                >
                  <option value="">Select account to transfer from...</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.accountName} ({a.accountNumber}) — Balance: ${a.balance.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedAccount && (
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
                  <div>
                    <span className="font-medium">{selectedAccount.accountName}</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2">({selectedAccount.accountNumber})</span>
                  </div>
                  <span className={selectedAccount.balance <= 0 ? 'text-red-500 font-medium' : 'text-green-600 dark:text-green-400 font-medium'}>
                    ${selectedAccount.balance.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setShowModal(true)}
                  disabled={!selectedAccountId || !selectedAccount || selectedAccount.balance <= 0}
                  className="btn-primary"
                >
                  ⇄ Transfer Funds
                </button>
              </div>

              {selectedAccount && selectedAccount.balance <= 0 && (
                <p className="text-xs text-red-500">This account has no available balance.</p>
              )}
            </div>
          )}
        </div>

        {/* Recent transfers */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Recent Transfers</h2>
            <Link href="/expense-accounts/transfer/report" className="text-sm text-primary hover:underline">
              View Full Report →
            </Link>
          </div>
          <TransferHistory showFilters />
        </div>
      </div>

      {showModal && selectedAccount && (
        <TransferModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          sourceAccountId={selectedAccount.id}
          sourceAccountName={selectedAccount.accountName}
          currentBalance={selectedAccount.balance}
          onSuccess={() => {
            setShowModal(false)
            setSelectedAccountId('')
            setRefreshKey(k => k + 1)
          }}
        />
      )}
    </ContentLayout>
  )
}
