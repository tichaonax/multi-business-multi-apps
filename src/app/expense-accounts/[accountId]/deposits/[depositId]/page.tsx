"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ContentLayout } from '@/components/layout/content-layout'
import { formatCurrency } from '@/lib/format-currency'

export default function ExpenseDepositDetailPage() {
  const params = useParams() as { accountId: string; depositId: string }
  const router = useRouter()
  const { accountId, depositId } = params
  const { hasPermission } = useBusinessPermissionsContext()

  const [deposit, setDeposit] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [depositsCount, setDepositsCount] = useState<number | null>(null)
  const [paymentsCount, setPaymentsCount] = useState<number | null>(null)
  const [countsError, setCountsError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editFormData, setEditFormData] = useState<any>({})
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!accountId || !depositId) return
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/expense-account/${accountId}/deposits/${depositId}`, {
          credentials: 'include',
        })
        if (!res.ok) {
          router.push(`/expense-accounts/${accountId}`)
          return
        }
        const data = await res.json()
        setDeposit(data.data.deposit)
        setEditFormData({
          amount: data.data.deposit.amount,
          depositDate: data.data.deposit.depositDate.split('T')[0],
          manualNote: data.data.deposit.manualNote || '',
          transactionType: data.data.deposit.transactionType || '',
        })
      } catch (err) {
        console.error('Error loading deposit', err)
        router.push(`/expense-accounts/${accountId}`)
      } finally {
        setLoading(false)
      }
    })()
  }, [accountId, depositId, router])

  useEffect(() => {
    if (!accountId) return
    ;(async () => {
      try {
        const res = await fetch(`/api/expense-account/${accountId}/balance`, { credentials: 'include' })
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) setCountsError('unauthorized')
          else setCountsError('unavailable')
          console.warn(`Failed to fetch balance counts: ${res.status}`)
          return
        }
        const data = await res.json()
        setDepositsCount(data.data.depositCount ?? 0)
        setPaymentsCount(data.data.paymentCount ?? 0)
        setCountsError(null)
      } catch (err) {
        console.error('Error loading counts', err)
        setCountsError('error')
      }
    })()
  }, [accountId])

  const handleEdit = () => {
    setIsEditing(true)
    setEditErrors({})
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditErrors({})
    // Reset form data to original deposit values
    if (deposit) {
      setEditFormData({
        amount: deposit.amount,
        depositDate: deposit.depositDate.split('T')[0],
        manualNote: deposit.manualNote || '',
        transactionType: deposit.transactionType || '',
      })
    }
  }

  const handleSaveEdit = async () => {
    setEditErrors({})
    setSaving(true)

    try {
      const res = await fetch(`/api/expense-account/${accountId}/deposits/${depositId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editFormData),
      })

      if (!res.ok) {
        const errorData = await res.json()
        setEditErrors({ general: errorData.error || 'Failed to update deposit' })
        setSaving(false)
        return
      }

      const data = await res.json()
      setDeposit(data.data.deposit)
      setIsEditing(false)
      setSaving(false)
    } catch (err) {
      console.error('Error saving deposit', err)
      setEditErrors({ general: 'Network error occurred' })
      setSaving(false)
    }
  }

  if (loading) return (
    <ContentLayout title="Deposit Details">
      <div className="text-secondary">Loading deposit details...</div>
    </ContentLayout>
  )

  if (!deposit) return (
    <ContentLayout title="Deposit Details">
      <div className="text-secondary">Deposit not found</div>
    </ContentLayout>
  )

  const sourceName = deposit.sourceBusiness?.name || 'Direct Deposit'

  // Header actions: counts showing deposits and payments
  const headerActions = (
    <div className="flex items-center gap-3">
      <div className="text-sm text-secondary">Deposits</div>
      <div title={countsError ? `Counts not available (${countsError})` : ''} className="text-green-600 font-semibold">{depositsCount ?? '—'}</div>
      <div className="text-sm text-secondary">Payments</div>
      <div>
        {paymentsCount !== null ? (
          hasPermission('canAccessExpenseAccount') ? (
            <a
              href={`/expense-accounts/${accountId}/payments`}
              onClick={(e) => { e.stopPropagation() }}
              className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20 text-xs text-orange-800 dark:text-orange-200 font-semibold hover:underline"
              aria-label={`Open payments for ${deposit.expenseAccount?.accountName || 'expense account'}`}>
              <span className="font-semibold">{paymentsCount}</span>
            </a>
          ) : (
            <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700/10 text-xs text-gray-700 dark:text-gray-200 font-semibold">{paymentsCount}</span>
          )
        ) : (
          <div title={countsError ? `Counts not available (${countsError})` : 'Counts not loaded'} className="text-orange-600 font-semibold">—</div>
        )}
      </div>
    </div>
  )

  return (
    <ContentLayout title={`Deposit ${deposit.id}`} description={`Deposit to ${deposit.expenseAccount?.accountName || 'expense account'}`} headerActions={headerActions}>
      <div className="space-y-4">
        {!isEditing ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-green-600">{formatCurrency(deposit.amount)}</h2>
                <div className="text-sm text-secondary">{new Date(deposit.depositDate).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-secondary">Source</div>
                <div className="font-medium">{sourceName}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-secondary">Source Type</div>
                <div className="font-medium capitalize">{deposit.sourceType?.replace('_', ' ').toLowerCase() || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-secondary">Transaction Type</div>
                <div className="font-medium">{deposit.transactionType || '—'}</div>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-700 dark:text-gray-300">
              <div><strong>Auto-Generated Note:</strong></div>
              <div className="mt-2">{deposit.autoGeneratedNote || 'No auto-generated note'}</div>
            </div>

            {deposit.manualNote && (
              <div className="mt-4 text-sm text-gray-700 dark:text-gray-300">
                <div><strong>Manual Note:</strong></div>
                <div className="mt-2">{deposit.manualNote}</div>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              {hasPermission('canEditExpenseTransactions') && (
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Edit Deposit
                </button>
              )}
              <button
                onClick={() => router.push(`/expense-accounts/${accountId}/deposits`)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Back to Deposits
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <h3 className="text-lg font-semibold mb-4">Edit Deposit</h3>

            {editErrors.general && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded">
                {editErrors.general}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={editFormData.amount}
                  onChange={(e) => setEditFormData({ ...editFormData, amount: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                {editErrors.amount && <div className="text-sm text-red-600 mt-1">{editErrors.amount}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Deposit Date</label>
                <input
                  type="date"
                  value={editFormData.depositDate}
                  onChange={(e) => setEditFormData({ ...editFormData, depositDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                {editErrors.depositDate && <div className="text-sm text-red-600 mt-1">{editErrors.depositDate}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Transaction Type</label>
                <input
                  type="text"
                  value={editFormData.transactionType}
                  onChange={(e) => setEditFormData({ ...editFormData, transactionType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="e.g., Cash Deposit, Bank Transfer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Manual Note</label>
                <textarea
                  value={editFormData.manualNote}
                  onChange={(e) => setEditFormData({ ...editFormData, manualNote: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Add any additional notes..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ContentLayout>
  )
}
