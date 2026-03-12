import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

export interface PendingActionsData {
  total: number
  pendingSupplierPayments: { id: string; supplierName?: string; amount?: number }[]
  pendingPettyCash: { id: string; purpose?: string; requestedAmount?: number; requesterName?: string }[]
  outstandingPettyCash: {
    id: string
    purpose: string
    requesterName: string
    businessName: string
    approvedAmount: number
    spentAmount: number
    remainingBalance: number
    approvedAt: string | null
  }[]
  outstandingPettyCashTotal: number
  pendingCashAllocations: { id: string; reportDate?: string; businessName?: string }[]
  pendingPaymentBatches: { id: string; eodDate?: string; businessName?: string; paymentCount?: number; totalAmount?: number }[]
  pendingPaymentRequests: { id: string; accountName?: string; requestCount?: number; totalAmount?: number; business?: { id: string; name: string } | null }[]
  myPendingPayments: { id: string; accountName?: string; requestCount?: number; totalAmount?: number; business?: { id: string; name: string } | null }[]
  myApprovedPayments: { id: string; amount: number; notes: string | null; categoryName: string | null; businessName: string; approvedAt: string | null; payeeName: string | null; payeePhone: string | null }[]
}

function fetchPendingActions(): Promise<PendingActionsData | null> {
  return fetch('/api/admin/pending-actions', { credentials: 'include' })
    .then(r => r.ok ? r.json() : null)
    .catch(() => null)
}

export function usePendingActionsCount(): number {
  const { status } = useSession()
  const [count, setCount] = useState(0)

  const refresh = useCallback(() => {
    if (status !== 'authenticated') { setCount(0); return }
    fetchPendingActions().then(data => { setCount(data?.total ?? 0) })
  }, [status])

  useEffect(() => {
    refresh()
    window.addEventListener('pending-actions:refresh', refresh)
    return () => window.removeEventListener('pending-actions:refresh', refresh)
  }, [refresh])

  return count
}

export function usePendingActions(): PendingActionsData | null {
  const { status } = useSession()
  const [data, setData] = useState<PendingActionsData | null>(null)

  const refresh = useCallback(() => {
    if (status !== 'authenticated') { setData(null); return }
    fetchPendingActions().then(d => {
      if (d) setData({
        ...d,
        myPendingPayments: d.myPendingPayments ?? [],
        myApprovedPayments: d.myApprovedPayments ?? [],
      })
    })
  }, [status])

  useEffect(() => {
    refresh()
    window.addEventListener('pending-actions:refresh', refresh)
    return () => window.removeEventListener('pending-actions:refresh', refresh)
  }, [refresh])

  return data
}
