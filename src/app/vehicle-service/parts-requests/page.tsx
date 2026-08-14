'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

interface PartsRequestItem {
  id: string
  description: string
  quantity: number
  status: string
  requestedAt: string
  contractorName: string
  vehicle: string | null
  vehiclePlate: string | null
  jobId: string
  issuedProductName: string | null
}

const STATUS_STYLES: Record<string, string> = {
  REQUESTED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  ISSUED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export default function VehicleServicePartsRequestsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { currentBusinessId, hasPermission, isSystemAdmin } = useBusinessPermissionsContext()

  const [requests, setRequests] = useState<PartsRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('REQUESTED')
  const [issuingId, setIssuingId] = useState<string | null>(null)

  const canManage = isSystemAdmin || hasPermission('canManageInventory')

  const fetchRequests = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ businessId: currentBusinessId })
      if (statusFilter) params.append('status', statusFilter)
      const res = await fetch(`/api/vehicle-service/parts-requests?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load parts requests')
      setRequests(data.requests || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, statusFilter])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading...</div>
  }
  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <ContentLayout title="Parts Requests" subtitle="Review and issue parts requested by contractors">
      <div className="max-w-4xl mx-auto">
        {!canManage ? (
          <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-800 dark:text-yellow-300">
            You don't have permission to manage inventory / parts requests.
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2">
              {(['REQUESTED', 'ISSUED', 'REJECTED', ''] as const).map(s => (
                <button
                  key={s || 'all'}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    statusFilter === s
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {s === '' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
                {error}
              </div>
            )}

            {loading && (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {!loading && requests.length === 0 && !error && (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow text-gray-500 dark:text-gray-400">
                No requests here.
              </div>
            )}

            <div className="space-y-3">
              {requests.map(r => (
                <div key={r.id} className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{r.description} × {r.quantity}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {r.contractorName} · {r.vehicle || 'Vehicle'}{r.vehiclePlate ? ` (${r.vehiclePlate})` : ''}
                      </p>
                      <p className="text-[10px] text-gray-400">{new Date(r.requestedAt).toLocaleString()}</p>
                      {r.issuedProductName && (
                        <p className="text-xs text-green-700 dark:text-green-400 mt-1">Issued as: {r.issuedProductName}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${STATUS_STYLES[r.status] || ''}`}>
                      {r.status}
                    </span>
                  </div>

                  {r.status === 'REQUESTED' && (
                    issuingId === r.id ? (
                      <IssueForm requestId={r.id} onDone={() => { setIssuingId(null); fetchRequests() }} onCancel={() => setIssuingId(null)} businessId={currentBusinessId!} />
                    ) : (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => setIssuingId(r.id)} className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg">
                          Issue
                        </button>
                        <RejectButton requestId={r.id} onDone={fetchRequests} />
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </ContentLayout>
  )
}

function IssueForm({ requestId, businessId, onDone, onCancel }: { requestId: string; businessId: string; onDone: () => void; onCancel: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [issuedQuantity, setIssuedQuantity] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/universal/products?businessId=${businessId}&productType=PHYSICAL&search=${encodeURIComponent(query)}&includeVariants=true&limit=8`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.products || data.data || [])
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query, businessId])

  const handleIssue = async () => {
    const variant = (selected?.product_variants || selected?.variants || [])[0]
    if (!variant) { setError('Select a matching product'); return }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/vehicle-service/parts-requests/${requestId}/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productVariantId: variant.id, issuedQuantity: issuedQuantity ? parseInt(issuedQuantity) : undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to issue'); return }
      onDone()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
      {selected ? (
        <div className="flex items-center justify-between text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900">
          <span>{selected.name}</span>
          <button onClick={() => setSelected(null)} className="text-xs text-blue-600 hover:underline">Change</button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search inventory to match this request..."
            className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          {results.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {results.map((p: any) => (
                <button key={p.id} type="button" onClick={() => { setSelected(p); setResults([]) }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input type="number" min="1" placeholder="Qty (default: requested)" value={issuedQuantity} onChange={e => setIssuedQuantity(e.target.value)}
          className="w-40 text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
        <button onClick={handleIssue} disabled={submitting || !selected} className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg">
          {submitting ? 'Issuing...' : 'Confirm Issue'}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400">Cancel</button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

function RejectButton({ requestId, onDone }: { requestId: string; onDone: () => void }) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleReject = async () => {
    if (!reason.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/vehicle-service/parts-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (res.ok) onDone()
    } finally {
      setSubmitting(false)
    }
  }

  if (!rejecting) {
    return (
      <button onClick={() => setRejecting(true)} className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
        Reject
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason..."
        className="text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
      <button onClick={handleReject} disabled={submitting} className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg">
        Confirm
      </button>
    </div>
  )
}
