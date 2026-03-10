import { useState, useEffect } from 'react'
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
  pendingPaymentBatches: { id: string; eodDate?: string; businessName?: string; paymentCount?: number }[]
  pendingPaymentRequests: { id: string; accountName?: string; requestCount?: number }[]
}

/**
 * Returns count + full pending actions data for bell hover preview.
 */
export function usePendingActionsCount(): number {
  const { status } = useSession()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (status !== 'authenticated') { setCount(0); return }
    fetch('/api/admin/pending-actions', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { setCount(data?.total ?? 0) })
      .catch(() => {})
  }, [status])

  return count
}

export function usePendingActions(): PendingActionsData | null {
  const { status } = useSession()
  const [data, setData] = useState<PendingActionsData | null>(null)

  useEffect(() => {
    if (status !== 'authenticated') { setData(null); return }
    fetch('/api/admin/pending-actions', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .catch(() => {})
  }, [status])

  return data
}
