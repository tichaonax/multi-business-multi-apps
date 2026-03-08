'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'

interface BatchRow {
  id: string
  eodDate: string
  status: string
  paymentCount: number
  approvedCount: number
  rejectedCount: number
  totalApproved: number | null
  business: { id: string; name: string; type: string }
  reviewer: { name: string } | null
  reviewedAt: string | null
}

const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const STATUS_CLASS: Record<string, string> = {
  PENDING_REVIEW: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  REVIEWED:       'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  CANCELLED:      'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
}

export default function PaymentBatchesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [batches, setBatches] = useState<BatchRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_REVIEW')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/eod-payment-batches?status=${statusFilter}`, { credentials: 'include' })
      const json = await res.json()
      if (res.ok) setBatches(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/signin'); return }
    if (status === 'authenticated') load()
  }, [status, load, router])

  return (
    <ContentLayout
      title="📋 EOD Payment Batches"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Expense Accounts', href: '/expense-accounts' },
        { label: 'Payment Batches', isActive: true },
      ]}
    >
      <div className="space-y-4">
        {/* Filter tabs */}
        <div className="flex gap-2">
          {['PENDING_REVIEW', 'REVIEWED'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {s === 'PENDING_REVIEW' ? 'Pending Review' : 'Reviewed'}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        ) : batches.length === 0 ? (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {statusFilter === 'PENDING_REVIEW'
                ? 'No batches awaiting review. Run an EOD report to batch queued payments.'
                : 'No reviewed batches found.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Business</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">EOD Date</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Payments</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Approved</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {batches.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {b.business.name}
                      <span className="ml-2 text-xs text-gray-400 capitalize">{b.business.type}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">{b.eodDate}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_CLASS[b.status] ?? ''}`}>
                        {b.status === 'PENDING_REVIEW' ? 'Pending Review' : b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                      {b.status === 'REVIEWED'
                        ? `${b.approvedCount} approved / ${b.rejectedCount} rejected`
                        : b.paymentCount}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-mono text-gray-900 dark:text-gray-100">
                      {b.totalApproved != null ? fmt(b.totalApproved) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {b.status === 'PENDING_REVIEW' ? (
                        <Link
                          href={`/expense-accounts/payment-batches/${b.id}/review`}
                          className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
                        >
                          Review
                        </Link>
                      ) : (
                        <Link
                          href={`/expense-accounts/payment-batches/${b.id}/review`}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ContentLayout>
  )
}
