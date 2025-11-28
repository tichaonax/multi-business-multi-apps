import { useState, useEffect, useCallback } from 'react'
import type { ExpenseAccount, BalanceSummary } from '@/types/expense-account'

interface UseExpenseAccountResult {
  account: ExpenseAccount | null
  balance: BalanceSummary | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  refreshBalance: () => Promise<void>
}

/**
 * Hook to fetch and manage a single expense account
 * @param accountId - The expense account ID to fetch
 */
export function useExpenseAccount(accountId: string): UseExpenseAccountResult {
  const [account, setAccount] = useState<ExpenseAccount | null>(null)
  const [balance, setBalance] = useState<BalanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAccount = useCallback(async () => {
    if (!accountId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/expense-account/${accountId}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch expense account')
      }

      const data = await response.json()
      setAccount(data.data.account)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching expense account:', err)
    } finally {
      setLoading(false)
    }
  }, [accountId])

  const fetchBalance = useCallback(async () => {
    if (!accountId) return

    try {
      const response = await fetch(`/api/expense-account/${accountId}/balance`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch balance')
      }

      const data = await response.json()
      setBalance(data.data)
    } catch (err) {
      console.error('Error fetching balance:', err)
    }
  }, [accountId])

  const refetch = useCallback(async () => {
    await Promise.all([fetchAccount(), fetchBalance()])
  }, [fetchAccount, fetchBalance])

  const refreshBalance = useCallback(async () => {
    await fetchBalance()
  }, [fetchBalance])

  useEffect(() => {
    if (accountId) {
      refetch()
    }
  }, [accountId, refetch])

  return {
    account,
    balance,
    loading,
    error,
    refetch,
    refreshBalance,
  }
}

/**
 * Hook to fetch all expense accounts
 */
export function useExpenseAccounts() {
  const [accounts, setAccounts] = useState<ExpenseAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/expense-account', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch expense accounts')
      }

      const data = await response.json()
      setAccounts(data.data.accounts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching expense accounts:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  return {
    accounts,
    loading,
    error,
    refetch: fetchAccounts,
  }
}
