'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

interface JobListItem {
  id: string
  status: string
  vehicleMake: string | null
  vehicleModel: string | null
  vehiclePlate: string | null
  orderId: string | null
  createdAt: string
  customerName: string | null
  customerPhone: string | null
  taskCount: number
  completedTaskCount: number
  totalCustomerPrice: number
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  billed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export default function VehicleServiceJobsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { currentBusinessId } = useBusinessPermissionsContext()

  const [jobs, setJobs] = useState<JobListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  const fetchJobs = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ businessId: currentBusinessId })
      if (statusFilter) params.append('status', statusFilter)
      const res = await fetch(`/api/vehicle-service/jobs?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load jobs')
      setJobs(data.jobs || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, statusFilter])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading...</div>
  }
  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <ContentLayout title="Vehicle Service Jobs" subtitle="Create jobs, assign contractors to tasks, and track progress">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {(['', 'open', 'in_progress', 'completed', 'billed', 'cancelled'] as const).map(s => (
              <button
                key={s || 'all'}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                {s === '' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            + New Job
          </button>
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

        {!loading && jobs.length === 0 && !error && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow text-gray-500 dark:text-gray-400">
            No jobs yet. Click "New Job" to start one.
          </div>
        )}

        {!loading && jobs.length > 0 && (
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  {['Vehicle', 'Customer', 'Status', 'Tasks', 'Total', 'Created'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {jobs.map(j => (
                  <tr
                    key={j.id}
                    onClick={() => router.push(`/vehicle-service/jobs/${j.id}`)}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {[j.vehicleMake, j.vehicleModel].filter(Boolean).join(' ') || '—'}
                      {j.vehiclePlate && <span className="ml-1 text-xs text-gray-400">({j.vehiclePlate})</span>}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {j.customerName || 'Walk-in'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_STYLES[j.status] || ''}`}>
                        {j.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {j.completedTaskCount}/{j.taskCount} completed
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(j.totalCustomerPrice)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(j.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && currentBusinessId && (
        <NewJobModal
          businessId={currentBusinessId}
          onClose={() => setShowAddModal(false)}
          onCreated={(jobId) => router.push(`/vehicle-service/jobs/${jobId}`)}
        />
      )}
    </ContentLayout>
  )
}

function NewJobModal({ businessId, onClose, onCreated }: { businessId: string; onClose: () => void; onCreated: (jobId: string) => void }) {
  const [form, setForm] = useState({ vehicleMake: '', vehicleModel: '', vehiclePlate: '', vehicleVin: '', notes: '' })
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerResults, setCustomerResults] = useState<any[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!customerQuery.trim() || selectedCustomer) { setCustomerResults([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/universal/customers?businessId=${businessId}&search=${encodeURIComponent(customerQuery)}&limit=5`)
      if (res.ok) {
        const data = await res.json()
        setCustomerResults(data.customers || data.data || [])
      }
    }, 300)
    return () => clearTimeout(t)
  }, [customerQuery, businessId, selectedCustomer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/vehicle-service/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          customerId: selectedCustomer?.id || undefined,
          vehicleMake: form.vehicleMake || undefined,
          vehicleModel: form.vehicleModel || undefined,
          vehiclePlate: form.vehiclePlate || undefined,
          vehicleVin: form.vehicleVin || undefined,
          notes: form.notes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create job'); return }
      onCreated(data.job.id)
    } catch {
      setError('Connection error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75" onClick={submitting ? undefined : onClose} />
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">New Job</h3>
            </div>
            <div className="px-6 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
              <div className="relative">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Customer (optional — leave blank for walk-in)</label>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <span>{selectedCustomer.name}</span>
                    <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerQuery('') }} className="text-xs text-blue-600 hover:underline">Change</button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={customerQuery}
                      onChange={e => setCustomerQuery(e.target.value)}
                      placeholder="Search by name or phone..."
                      className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    {customerResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {customerResults.map((c: any) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => { setSelectedCustomer(c); setCustomerResults([]) }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            {c.name} {c.phone && <span className="text-xs text-gray-400">({c.phone})</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {[
                { key: 'vehicleMake', label: 'Vehicle Make' },
                { key: 'vehicleModel', label: 'Vehicle Model' },
                { key: 'vehiclePlate', label: 'Plate Number' },
                { key: 'vehicleVin', label: 'VIN' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{f.label}</label>
                  <input
                    type="text"
                    value={(form as any)[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button type="button" onClick={onClose} disabled={submitting} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium">
                {submitting ? 'Creating...' : 'Create Job'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
