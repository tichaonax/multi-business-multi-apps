'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'

interface PortalTask {
  id: string
  jobId: string
  status: string
  workDescription: string | null
  assignedAt: string
  serviceName: string
  serviceEmoji: string | null
  vehicle: string | null
  vehiclePlate: string | null
  vehicleVin: string | null
}

interface PartsRequestItem {
  id: string
  description: string
  quantity: number
  status: string
  requestedAt: string
  rejectionReason: string | null
  issuedQuantity: number | null
  vehicle: string | null
  vehiclePlate: string | null
}

const PARTS_STATUS_STYLES: Record<string, string> = {
  REQUESTED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  ISSUED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export default function ContractorPortalPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [tasks, setTasks] = useState<PortalTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [workNote, setWorkNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [partsRequests, setPartsRequests] = useState<PartsRequestItem[]>([])
  const [requestingTaskId, setRequestingTaskId] = useState<string | null>(null)
  const [partForm, setPartForm] = useState({ description: '', quantity: '1' })
  const [partSubmitting, setPartSubmitting] = useState(false)
  const [partError, setPartError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/vehicle-service/contractor-portal/tasks')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load tasks')
      setTasks(data.tasks || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPartsRequests = useCallback(async () => {
    const res = await fetch('/api/vehicle-service/contractor-portal/parts-requests')
    if (res.ok) {
      const data = await res.json()
      setPartsRequests(data.requests || [])
    }
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])
  useEffect(() => { fetchPartsRequests() }, [fetchPartsRequests])

  const handleRequestPart = async (task: PortalTask) => {
    if (!partForm.description.trim()) { setPartError('Describe the part you need'); return }
    setPartSubmitting(true)
    setPartError(null)
    try {
      const res = await fetch('/api/vehicle-service/contractor-portal/parts-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: task.jobId,
          taskId: task.id,
          description: partForm.description,
          quantity: parseInt(partForm.quantity) || 1,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setPartError(data.error || 'Failed to request part'); return }
      setRequestingTaskId(null)
      setPartForm({ description: '', quantity: '1' })
      fetchPartsRequests()
    } finally {
      setPartSubmitting(false)
    }
  }

  const handleStartWork = async (taskId: string) => {
    await fetch(`/api/vehicle-service/contractor-portal/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' }),
    })
    fetchTasks()
  }

  const handleMarkComplete = async (taskId: string) => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/vehicle-service/contractor-portal/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', workDescription: workNote || undefined }),
      })
      if (res.ok) {
        setExpandedTaskId(null)
        setWorkNote('')
        fetchTasks()
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading...</div>
  }
  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{session.user?.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Contractor Portal</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          Sign out
        </button>
      </div>

      <ContentLayout title="My Tasks" subtitle="Incomplete jobs assigned to you" showBackButton={false} maxWidth="2xl">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!loading && tasks.length === 0 && !error && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow text-gray-500 dark:text-gray-400">
            No tasks assigned right now.
          </div>
        )}

        <div className="space-y-3">
          {tasks.map(t => (
            <div key={t.id} className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {t.serviceEmoji} {t.serviceName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t.vehicle || 'Vehicle'}{t.vehiclePlate ? ` — ${t.vehiclePlate}` : ''}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                  t.status === 'in_progress'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {t.status.replace('_', ' ')}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-3">
                {t.status === 'assigned' && (
                  <button
                    onClick={() => handleStartWork(t.id)}
                    className="px-3 py-1.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50"
                  >
                    Start Work
                  </button>
                )}
                {expandedTaskId === t.id ? (
                  <div className="flex-1 flex flex-col gap-2">
                    <textarea
                      value={workNote}
                      onChange={e => setWorkNote(e.target.value)}
                      placeholder="Briefly describe the work performed..."
                      rows={2}
                      className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMarkComplete(t.id)}
                        disabled={submitting}
                        className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg"
                      >
                        {submitting ? 'Saving...' : 'Confirm Complete'}
                      </button>
                      <button
                        onClick={() => { setExpandedTaskId(null); setWorkNote('') }}
                        className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => { setExpandedTaskId(t.id); setWorkNote(t.workDescription || '') }}
                      className="px-3 py-1.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50"
                    >
                      Mark Complete
                    </button>
                    <button
                      onClick={() => { setRequestingTaskId(requestingTaskId === t.id ? null : t.id); setPartError(null) }}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50"
                    >
                      Request Part
                    </button>
                  </>
                )}
              </div>

              {requestingTaskId === t.id && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2">
                  <input
                    type="text"
                    value={partForm.description}
                    onChange={e => setPartForm({ ...partForm, description: e.target.value })}
                    placeholder="What part do you need? (e.g. front brake pads)"
                    className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min="1" value={partForm.quantity}
                      onChange={e => setPartForm({ ...partForm, quantity: e.target.value })}
                      className="w-20 text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={() => handleRequestPart(t)}
                      disabled={partSubmitting}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg"
                    >
                      {partSubmitting ? 'Sending...' : 'Send Request'}
                    </button>
                  </div>
                  {partError && <p className="text-xs text-red-600 dark:text-red-400">{partError}</p>}
                </div>
              )}
            </div>
          ))}
        </div>

        {partsRequests.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">My Parts Requests</h4>
            <div className="space-y-2">
              {partsRequests.map(r => (
                <div key={r.id} className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">{r.description} × {r.quantity}</p>
                      <p className="text-xs text-gray-400">{r.vehicle || 'Vehicle'}{r.vehiclePlate ? ` — ${r.vehiclePlate}` : ''}</p>
                      {r.status === 'REJECTED' && r.rejectionReason && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">Reason: {r.rejectionReason}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${PARTS_STATUS_STYLES[r.status] || ''}`}>
                      {r.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </ContentLayout>
    </div>
  )
}
