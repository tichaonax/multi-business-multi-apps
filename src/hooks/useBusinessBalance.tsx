import { useState, useEffect, useCallback, useRef } from 'react'

export interface BusinessBalanceInfo {
  businessId: string
  balance: number
  hasAccount: boolean
  isInitialized: boolean
  error?: string
}

export interface BalanceValidationResult {
  isValid: boolean
  currentBalance: number
  requiredAmount: number
  shortfall?: number
  message: string
}

export function useBusinessBalance(businessId: string | null) {
  const [balanceInfo, setBalanceInfo] = useState<BusinessBalanceInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Keep a controller ref so we can cancel in-flight requests
  const controllerRef = useRef<AbortController | null>(null)

  const fetchBalance = useCallback(async () => {
    if (!businessId) {
      setBalanceInfo(null)
      return
    }

    setLoading(true)
    setError(null)

    // Abort previous request if present
    if (controllerRef.current) controllerRef.current.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const signal = controller.signal

    try {
      const response = await fetch(`/api/business/balance/${businessId}`, {
        credentials: 'include',
        signal
      })

      if (signal.aborted) return

      if (response.ok) {
        const data = await response.json()
        setBalanceInfo(data)
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to fetch balance')
        setBalanceInfo({
          businessId,
          balance: 0,
          hasAccount: false,
          isInitialized: false,
          error: error.error || 'Failed to fetch balance'
        })
      }
    } catch (err) {
      const name = (err as any)?.name
      if (name === 'AbortError') return
      console.error('Error fetching business balance:', err)
      setError('Network error fetching balance')
      setBalanceInfo({
        businessId: businessId || '',
        balance: 0,
        hasAccount: false,
        isInitialized: false,
        error: 'Network error'
      })
    } finally {
      setLoading(false)
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }, [businessId])

  const validateAmount = useCallback((amount: number): BalanceValidationResult => {
    if (!balanceInfo) {
      return {
        isValid: false,
        currentBalance: 0,
        requiredAmount: amount,
        shortfall: amount,
        message: 'Balance information not available'
      }
    }

    if (!balanceInfo.hasAccount) {
      return {
        isValid: false,
        currentBalance: 0,
        requiredAmount: amount,
        shortfall: amount,
        message: 'Business account not initialized. Please initialize account first.'
      }
    }

    const currentBalance = balanceInfo.balance
    const hasEnoughFunds = currentBalance >= amount

    if (hasEnoughFunds) {
      return {
        isValid: true,
        currentBalance,
        requiredAmount: amount,
        message: 'Sufficient funds available'
      }
    } else {
      const shortfall = amount - currentBalance
      return {
        isValid: false,
        currentBalance,
        requiredAmount: amount,
        shortfall,
        message: `Insufficient funds. Current: $${currentBalance.toFixed(2)}, Required: $${amount.toFixed(2)}, Shortfall: $${shortfall.toFixed(2)}`
      }
    }
  }, [balanceInfo])

  const refreshBalance = useCallback(() => {
    fetchBalance()
  }, [fetchBalance])

  useEffect(() => {
    fetchBalance()

    return () => {
      controllerRef.current?.abort()
    }
  }, [fetchBalance])

  return {
    balanceInfo,
    loading,
    error,
    validateAmount,
    refreshBalance
  }
}