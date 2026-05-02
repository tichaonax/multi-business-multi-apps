'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'

interface ComboRequest {
  id: string
  title: string
  status: string
  requestedAmount: number
  approvedAmount: number | null
  submittedAt: string | null
  creator: { id: string; name: string }
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
  SUBMITTED: { label: 'Submitted', className: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-800' },
  PARTIALLY_APPROVED: { label: 'Partially Approved', className: 'bg-orange-100 text-orange-800' },
  PARTIALLY_PAID: { label: 'Partially Paid', className: 'bg-blue-100 text-blue-800' },
  PAID: { label: 'Paid', className: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

function fmtDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ComboRequestsListPage() {
  const params = useParams() as { accountId: string }
  const router = useRouter()
  const { data: session, status } = useSession()
  const accountId = params.accountId

  const [requests, setRequests] = useState<ComboRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [accountName, setAccountName] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/signin'); return }
    if (!session) return

    fetch(`/api/expense-account/${accountId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => setAccountName(data?.data?.account?.accountName || ''))
      .catch(() => {})

    fetch(`/api/expense-account/${accountId}/combo-requests`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.data) {
          setRequests(
            data.data.map((r: any) => ({
              ...r,
              requestedAmount: Number(r.requestedAmount),
              approvedAmount: r.approvedAmount !== null ? Number(r.approvedAmount) : null,
            }))
          )
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session, status, accountId, router])

  return (
    <ContentLayout title={`Combo Requests${accountName ? ` · ${accountName}` : ''}`}>
      <div className="space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push(`/expense-accounts/${accountId}`)}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Account
          </button>
          <button
            onClick={() => router.push(`/expense-accounts/${accountId}/combo-requests/new`)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Combo Request
          </button>
        </div>

        {loading && (
          <div className="text-sm text-gray-400 py-8 text-center">Loading...</div>
        )}

        {!loading && requests.length === 0 && (
          <div className="text-sm text-gray-500 py-12 text-center border border-dashed border-gray-200 rounded-xl">
            No combo requests yet.
          </div>
        )}

        {!loading && requests.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 shadow-sm">
            {requests.map(req => {
              const badge = STATUS_BADGE[req.status] ?? { label: req.status, className: 'bg-gray-100 text-gray-700' }
              return (
                <button
                  key={req.id}
                  onClick={() => router.push(`/expense-accounts/${accountId}/combo-requests/${req.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{req.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {req.creator.name}
                      {req.submittedAt && ` · ${fmtDate(req.submittedAt)}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold text-gray-900">{fmt(req.requestedAmount)}</div>
                    {req.approvedAmount !== null && req.approvedAmount !== req.requestedAmount && (
                      <div className="text-xs text-green-600">Approved: {fmt(req.approvedAmount)}</div>
                    )}
                  </div>
                  <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                    {badge.label}
                  </span>
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </ContentLayout>
  )
}
