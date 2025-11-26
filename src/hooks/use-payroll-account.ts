import { useState, useEffect, useCallback } from 'react'

interface PayrollAccount {
  id: string
  accountNumber: string
  balance: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface BalanceSummary {
  accountId: string
  accountNumber: string
  balance: number
  totalDeposits: number
  totalPayments: number
  calculatedBalance: number
  isBalanced: boolean
  depositCount: number
  paymentCount: number
}

interface UsePayrollAccountResult {
  account: PayrollAccount | null
  balance: BalanceSummary | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  refreshBalance: () => Promise<void>
}

export function usePayrollAccount(): UsePayrollAccountResult {
  const [account, setAccount] = useState<PayrollAccount | null>(null)
  const [balance, setBalance] = useState<BalanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAccount = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/payroll/account', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch payroll account')
      }

      const data = await response.json()
      setAccount(data.data.account)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching payroll account:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchBalance = useCallback(async () => {
    try {
      const response = await fetch('/api/payroll/account/balance', {
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
  }, [])

  const refetch = useCallback(async () => {
    await Promise.all([fetchAccount(), fetchBalance()])
  }, [fetchAccount, fetchBalance])

  const refreshBalance = useCallback(async () => {
    await fetchBalance()
  }, [fetchBalance])

  useEffect(() => {
    refetch()
  }, [refetch])

  return {
    account,
    balance,
    loading,
    error,
    refetch,
    refreshBalance,
  }
}
