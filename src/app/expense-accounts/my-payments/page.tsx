'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { ContentLayout } from '@/components/layout/content-layout'
import { useToastContext } from '@/components/ui/toast'

interface ApprovedPayment {
  id: string
  amount: number
  notes: string | null
  categoryName: string | null
  businessName: string
  approvedAt: string | null
  payeeName: string | null
  payeePhone: string | null
}

export default function MyPaymentsPage() {
  const toast = useToastContext()
  const [payments, setPayments] = useState<ApprovedPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [collecting, setCollecting] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/pending-actions', { credentials: 'include' })
      const data = await res.json()
      setPayments(data.myApprovedPayments ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCollect = async (paymentId: string) => {
    setCollecting(paymentId)
    try {
      const res = await fetch('/api/expense-account-payments/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ paymentId }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed'); return }
      toast.push('Cash collected — payment marked complete', { type: 'success' })
      window.dispatchEvent(new CustomEvent('pending-actions:refresh'))
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setCollecting(null)
    }
  }

  return (
    <ContentLayout
      title="💵 My Approved Payments"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'My Payments', isActive: true },
      ]}
    >
      <div className="max-w-2xl mx-auto space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          These payments have been approved by the cashier. Collect the cash and tap <strong>Payment Made</strong> to mark each one complete.
        </p>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
            No approved payments waiting for collection.
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {payments.map(p => (
              <div key={p.id} className="flex items-start gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                      ${Number(p.amount).toFixed(2)}
                    </span>
                    {p.categoryName && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">{p.categoryName}</span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-medium">
                      ✓ Approved
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.businessName}</p>
                  {p.payeeName && (
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                      Hand to: {p.payeeName}{p.payeePhone ? ` · ${p.payeePhone}` : ''}
                    </p>
                  )}
                  {p.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{p.notes}</p>}
                  {p.approvedAt && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Approved {new Date(p.approvedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleCollect(p.id)}
                  disabled={collecting === p.id}
                  className="shrink-0 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                >
                  {collecting === p.id ? 'Marking…' : 'Payment Made'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ContentLayout>
  )
}
