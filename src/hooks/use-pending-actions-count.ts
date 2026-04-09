import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

export interface PendingActionsData {
  total: number
  pendingSupplierPayments: { id: string; supplierName?: string; amount?: number }[]
  pendingPettyCash: { id: string; purpose?: string; requestedAmount?: number; requesterName?: string; paymentChannel?: string; priority?: string; requester?: { name: string }; business?: { name: string } }[]
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
  pendingPaymentBatches: { id: string; eodDate?: string; businessName?: string; paymentCount?: number; totalAmount?: number; cashCount?: number; ecocashCount?: number }[]
  pendingPaymentRequests: { id: string; accountName?: string; requestCount?: number; totalAmount?: number; cashCount?: number; ecocashCount?: number; urgentCount?: number; business?: { id: string; name: string } | null }[]
  myPendingPayments: { id: string; accountName?: string; requestCount?: number; totalAmount?: number; business?: { id: string; name: string } | null }[]
  myApprovedPayments: { id: string; amount: number; notes: string | null; categoryName: string | null; businessName: string; approvedAt: string | null; payeeName: string | null; payeePhone: string | null }[]
  myApprovedPettyCash: { id: string; purpose: string; approvedAmount: number | null; approvedAt: string | null; business: { name: string } | null }[]
  pendingStockTakeDrafts: { id: string; title: string; itemCount: number; updatedAt: string; businessId: string | null; businessName: string; businessType: string }[]
  pendingEcocashConversions: { id: string; amount: number; notes: string | null; requestedAt: string; requester: { id: string; name: string } | null; business: { id: string; name: string } | null }[]
  personalPaymentRequests: { id: string; amount: number; notes: string | null; paymentChannel: string; priority: string; accountName: string; creatorName: string | null; payeeName: string | null; categoryName: string | null }[]
}

// Module-level promise cache — deduplicates concurrent fetches (e.g. bell + dashboard badge mounting together)
let _cachedPromise: Promise<PendingActionsData | null> | null = null
let _cachedAt = 0

function fetchPendingActions(bustCache = false): Promise<PendingActionsData | null> {
  const now = Date.now()
  if (!bustCache && _cachedPromise && now - _cachedAt < 5000) return _cachedPromise
  _cachedAt = now
  _cachedPromise = fetch('/api/admin/pending-actions', { credentials: 'include' })
    .then(r => r.ok ? r.json() : null)
    .catch(() => null)
  return _cachedPromise
}

export function usePendingActionsCount(): number {
  const { status } = useSession()
  const [count, setCount] = useState(0)

  const refresh = useCallback((bustCache = false) => {
    if (status !== 'authenticated') { setCount(0); return }
    fetchPendingActions(bustCache).then(data => { setCount(data?.total ?? 0) })
  }, [status])

  useEffect(() => {
    refresh()
    const handler = () => refresh(true)
    window.addEventListener('pending-actions:refresh', handler)
    return () => window.removeEventListener('pending-actions:refresh', handler)
  }, [refresh])

  return count
}

export function usePendingActions(): PendingActionsData | null {
  const { status } = useSession()
  const [data, setData] = useState<PendingActionsData | null>(null)

  const refresh = useCallback((bustCache = false) => {
    if (status !== 'authenticated') { setData(null); return }
    fetchPendingActions(bustCache).then(d => {
      if (d) setData({
        ...d,
        myPendingPayments: d.myPendingPayments ?? [],
        myApprovedPayments: d.myApprovedPayments ?? [],
      })
    })
  }, [status])

  useEffect(() => {
    refresh()
    const handler = () => refresh(true)
    window.addEventListener('pending-actions:refresh', handler)
    return () => window.removeEventListener('pending-actions:refresh', handler)
  }, [refresh])

  return data
}
