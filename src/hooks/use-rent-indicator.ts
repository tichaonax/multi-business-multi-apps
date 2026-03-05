'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export type RentIndicator = 'red' | 'orange' | 'green'

export interface RentIndicatorState {
  indicator: RentIndicator | null
  fundingPercent: number
  balance: number
  monthlyRentAmount: number
  dailyTransferAmount: number
  rentDueDay: number
  hasRentAccount: boolean
}

const POLL_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Polls the rent account balance API to provide a real-time funding indicator
 * for the current business. Only polls when the business has an active rent account.
 *
 * Also listens for the `rent-transfer-complete` custom event so the header
 * updates immediately after an EOD transfer fires.
 */
export function useRentIndicator(businessId: string | undefined): RentIndicatorState {
  const [state, setState] = useState<RentIndicatorState>({
    indicator: null,
    fundingPercent: 0,
    balance: 0,
    monthlyRentAmount: 0,
    dailyTransferAmount: 0,
    rentDueDay: 1,
    hasRentAccount: false,
  })

  const hasRentRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchBalance = useCallback(async () => {
    if (!businessId) return
    try {
      const res = await fetch(`/api/rent-account/${businessId}/balance`)
      if (!res.ok) return
      const data = await res.json()

      if (!data.hasRentAccount) {
        hasRentRef.current = false
        setState(prev => ({ ...prev, hasRentAccount: false, indicator: null }))
        return
      }

      hasRentRef.current = true
      setState({
        hasRentAccount: true,
        indicator: data.indicator ?? null,
        fundingPercent: data.fundingPercent ?? 0,
        balance: data.balance ?? 0,
        monthlyRentAmount: data.monthlyRentAmount ?? 0,
        dailyTransferAmount: data.dailyTransferAmount ?? 0,
        rentDueDay: data.rentDueDay ?? 1,
      })
    } catch {
      // ignore fetch errors — indicator stays as-is
    }
  }, [businessId])

  // Initial fetch + periodic polling
  useEffect(() => {
    if (!businessId) return

    fetchBalance()

    timerRef.current = setInterval(fetchBalance, POLL_INTERVAL_MS)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [businessId, fetchBalance])

  // Refresh immediately when an EOD transfer completes
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail?.businessId || detail.businessId === businessId) {
        fetchBalance()
      }
    }
    window.addEventListener('rent-transfer-complete', handler)
    return () => window.removeEventListener('rent-transfer-complete', handler)
  }, [businessId, fetchBalance])

  return state
}
