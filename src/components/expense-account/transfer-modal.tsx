'use client'

import { useState, useEffect } from 'react'
import { SearchableSelect } from '@/components/ui/searchable-select'

interface AccountOption {
  id: string
  accountName: string
  accountNumber: string
  balance: number
}

interface TransferModalProps {
  isOpen: boolean
  onClose: () => void
  sourceAccountId: string
  sourceAccountName: string
  currentBalance: number
  onSuccess: () => void
}

export function TransferModal({
  isOpen,
  onClose,
  sourceAccountId,
  sourceAccountName,
  currentBalance,
  onSuccess,
}: TransferModalProps) {
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [destinationAccountId, setDestinationAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setLoadingAccounts(true)
    fetch('/api/expense-account?simple=true', { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          const opts: AccountOption[] = (json.data?.accounts ?? [])
            .filter((a: any) => a.id !== sourceAccountId && a.isActive)
            .map((a: any) => ({
              id: a.id,
              accountName: a.accountName,
              accountNumber: a.accountNumber,
              balance: Number(a.balance ?? 0),
            }))
          setAccounts(opts)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAccounts(false))
  }, [isOpen, sourceAccountId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const parsed = parseFloat(amount)
    if (!parsed || isNaN(parsed) || parsed <= 0) {
      setError('Enter a valid amount greater than zero')
      return
    }
    if (parsed > currentBalance) {
      setError(`Amount exceeds available balance of $${currentBalance.toFixed(2)}`)
      return
    }
    if (!destinationAccountId) {
      setError('Select a destination account')
      return
    }
    if (!notes.trim()) {
      setError('Transfer notes are required')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/expense-account/${sourceAccountId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ destinationAccountId, amount: parsed, notes: notes.trim(), transferDate }),
      })
      const json = await res.json()
      if (res.ok) {
        onSuccess()
      } else {
        setError(json.error || 'Transfer failed')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  // Build options — label used for search filtering, renderOption/renderValue for display
  const selectOptions = accounts.map(a => ({
    value: a.id,
    label: `${a.accountName} (${a.accountNumber}) $${a.balance.toFixed(2)}`,
  }))

  const renderAccountOption = (o: { value?: string; id?: string; label?: string; name?: string; emoji?: string }) => {
    const account = accounts.find(a => a.id === (o.value ?? o.id))
    if (!account) return o.label ?? ''
    return (
      <span className="flex items-center justify-between gap-4">
        <span>{account.accountName} <span className="text-gray-400 text-xs">({account.accountNumber})</span></span>
        <span className={account.balance <= 0 ? 'text-red-400 text-xs font-medium' : 'text-green-400 text-xs font-medium'}>
          ${account.balance.toFixed(2)}
        </span>
      </span>
    )
  }

  const renderAccountValue = (o: { value?: string; id?: string; label?: string; name?: string; emoji?: string }) => {
    const account = accounts.find(a => a.id === (o.value ?? o.id))
    if (!account) return o.label ?? ''
    return (
      <span className="flex items-center gap-2">
        <span>{account.accountName} <span className="text-gray-400 text-xs">({account.accountNumber})</span></span>
        <span className={account.balance <= 0 ? 'text-red-400 text-xs' : 'text-green-400 text-xs'}>
          ${account.balance.toFixed(2)}
        </span>
      </span>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-semibold">Transfer Funds</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={submitting}>✕</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300 rounded text-sm">
                {error}
              </div>
            )}

            {/* Source account */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From</label>
              <div className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm">
                <span className="font-medium text-gray-900 dark:text-gray-100">{sourceAccountName}</span>
                <span className="text-gray-500 dark:text-gray-400 ml-2">
                  Balance: <span className={currentBalance <= 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}>
                    ${currentBalance.toFixed(2)}
                  </span>
                </span>
              </div>
            </div>

            {/* Destination account */}
            <div>
              <label className="block text-sm font-medium mb-1">
                To <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={selectOptions}
                value={destinationAccountId}
                onChange={setDestinationAccountId}
                placeholder="Select destination account..."
                searchPlaceholder="Search accounts..."
                emptyMessage="No accounts available"
                loading={loadingAccounts}
                disabled={submitting}
                required
                renderOption={renderAccountOption}
                renderValue={renderAccountValue}
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={currentBalance}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="input w-full px-3 py-2"
                placeholder="0.00"
                disabled={submitting}
                required
              />
              {(() => {
                const parsed = parseFloat(amount)
                if (!parsed || isNaN(parsed) || parsed <= 0) return null
                const balanceAfter = currentBalance - parsed
                return (
                  <p className={`text-xs mt-1 ${balanceAfter < 0 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                    Balance after transfer:{' '}
                    <span className={`font-medium ${balanceAfter < 0 ? 'text-red-500' : balanceAfter === 0 ? 'text-gray-400' : 'text-green-600 dark:text-green-400'}`}>
                      ${balanceAfter.toFixed(2)}
                    </span>
                  </p>
                )
              })()}
            </div>

            {/* Transfer Date */}
            <div>
              <label className="block text-sm font-medium mb-1">Transfer Date</label>
              <input
                type="date"
                value={transferDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={e => setTransferDate(e.target.value)}
                className="input w-full px-3 py-2"
                disabled={submitting}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Defaults to today. Set a past date for retroactive transfers.</p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="input w-full px-3 py-2"
                rows={2}
                placeholder="Reason for transfer..."
                disabled={submitting}
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary" disabled={submitting}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || currentBalance <= 0 || accounts.length === 0}
              >
                {submitting ? 'Transferring...' : 'Transfer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
