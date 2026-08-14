'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'

const JOB_STATUSES = ['open', 'in_progress', 'completed', 'billed', 'cancelled']
const TASK_STATUSES = ['assigned', 'in_progress', 'completed']

const TASK_STATUS_STYLES: Record<string, string> = {
  assigned: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}

interface ServiceCatalogEntry { id: string; name: string; emoji: string; services: { id: string; name: string; emoji: string | null }[] }

export default function VehicleServiceJobDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const jobId = params.jobId as string

  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [catalog, setCatalog] = useState<ServiceCatalogEntry[]>([])
  const [eligible, setEligible] = useState<Array<{ contractorId: string; fullName: string; feeAmount: number }>>([])
  const [newTask, setNewTask] = useState({ subcategoryId: '', contractorId: '', customerPriceOverride: '', workDescription: '' })
  const [taskError, setTaskError] = useState<string | null>(null)
  const [showBillModal, setShowBillModal] = useState(false)

  const fetchJob = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/vehicle-service/jobs/${jobId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load job')
      setJob(data.job)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => { fetchJob() }, [fetchJob])

  useEffect(() => {
    if (!job?.businessId) return
    fetch(`/api/vehicle-service/service-catalog?businessId=${job.businessId}`)
      .then(res => res.ok ? res.json() : { categories: [] })
      .then(data => setCatalog(data.categories || []))
      .catch(() => setCatalog([]))
  }, [job?.businessId])

  useEffect(() => {
    if (!newTask.subcategoryId || !job?.businessId) { setEligible([]); return }
    fetch(`/api/vehicle-service/contractors/eligible?businessId=${job.businessId}&subcategoryId=${newTask.subcategoryId}`)
      .then(res => res.ok ? res.json() : { contractors: [] })
      .then(data => setEligible(data.contractors || []))
      .catch(() => setEligible([]))
    setNewTask(t => ({ ...t, contractorId: '' }))
  }, [newTask.subcategoryId, job?.businessId])

  const handleJobStatusChange = async (newStatus: string) => {
    await fetch(`/api/vehicle-service/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    fetchJob()
  }

  const handleReleaseVehicle = async () => {
    await fetch(`/api/vehicle-service/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ releaseVehicle: true }),
    })
    fetchJob()
  }

  const handlePrintCard = async () => {
    window.open(`/vehicle-service/jobs/${jobId}/card`, '_blank')
    await fetch(`/api/vehicle-service/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markPrinted: true }),
    })
    fetchJob()
  }

  const handleAddTask = async () => {
    setTaskError(null)
    if (!newTask.subcategoryId || !newTask.contractorId) {
      setTaskError('Select a service and a contractor')
      return
    }
    const res = await fetch(`/api/vehicle-service/jobs/${jobId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subcategoryId: newTask.subcategoryId,
        contractorId: newTask.contractorId,
        customerPriceOverride: newTask.customerPriceOverride ? parseFloat(newTask.customerPriceOverride) : undefined,
        workDescription: newTask.workDescription || undefined,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setTaskError(data.error || 'Failed to add task'); return }
    setNewTask({ subcategoryId: '', contractorId: '', customerPriceOverride: '', workDescription: '' })
    fetchJob()
  }

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    await fetch(`/api/vehicle-service/jobs/${jobId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    fetchJob()
  }

  const handleRemoveTask = async (taskId: string) => {
    const res = await fetch(`/api/vehicle-service/jobs/${jobId}/tasks/${taskId}`, { method: 'DELETE' })
    if (res.ok) fetchJob()
  }

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
  const allServices = catalog.flatMap(cat => cat.services.map(s => ({ ...s, categoryName: cat.name })))
  const selectedFee = eligible.find(c => c.contractorId === newTask.contractorId)?.feeAmount
  const allTasksComplete = !!job && job.tasks.length > 0 && job.tasks.every((t: any) => t.status === 'completed')

  const handleMarkCardReturned = async () => {
    await fetch(`/api/vehicle-service/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markCardReturned: true }),
    })
    fetchJob()
  }

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading...</div>
  }
  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <ContentLayout title="Job Detail" subtitle="Assign contractors to tasks and track progress">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.push('/vehicle-service/jobs')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4">
          ← Back to Jobs
        </button>

        {loading && <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}
        {error && <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">{error}</div>}

        {!loading && job && (
          <div className="space-y-6">
            {/* Job header */}
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {[job.vehicleMake, job.vehicleModel].filter(Boolean).join(' ') || 'Vehicle Service Job'}
                    {job.vehiclePlate && <span className="ml-2 text-sm text-gray-400">({job.vehiclePlate})</span>}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {job.business_customers?.name || 'Walk-in customer'}
                    {job.business_customers?.phone && ` · ${job.business_customers.phone}`}
                  </p>
                  {job.primaryContractor && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Primary contractor: {job.primaryContractor.persons.fullName}
                    </p>
                  )}
                </div>
                {job.orderId && (
                  <span className="px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full">
                    Billed
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {JOB_STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => handleJobStatusChange(s)}
                    disabled={job.status === 'billed'}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed ${
                      job.status === s
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </button>
                ))}
              </div>
              {allTasksComplete && job.status !== 'billed' && job.status !== 'cancelled' && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-1 text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full">
                    ✓ Ready to Bill
                  </span>
                  {!job.jobCardReturnedAt ? (
                    <button
                      onClick={handleMarkCardReturned}
                      className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Mark Job Card Returned
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400" title={new Date(job.jobCardReturnedAt).toLocaleString()}>
                      Card returned {new Date(job.jobCardReturnedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
              {allTasksComplete && job.status !== 'billed' && job.status !== 'cancelled' && (
                <button
                  onClick={() => setShowBillModal(true)}
                  className="mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                >
                  Bill This Job
                </button>
              )}
              {job.orderId && (
                <button
                  onClick={() => router.push(`/universal/receipts?businessId=${job.businessId}`)}
                  className="mt-3 ml-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  View Receipt
                </button>
              )}
              {job.status === 'billed' && job.business_orders?.paymentStatus === 'PAID' && (
                job.vehicleReleasedAt ? (
                  <span className="mt-3 ml-2 inline-block px-3 py-2 text-sm text-green-700 dark:text-green-400" title={new Date(job.vehicleReleasedAt).toLocaleString()}>
                    ✓ Vehicle released {new Date(job.vehicleReleasedAt).toLocaleDateString()}{job.vehicleReleasedBy?.name ? ` by ${job.vehicleReleasedBy.name}` : ''}
                  </span>
                ) : (
                  <button
                    onClick={handleReleaseVehicle}
                    className="mt-3 ml-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium"
                  >
                    🚗 Release Vehicle
                  </button>
                )
              )}
              <button
                onClick={handlePrintCard}
                className="mt-3 ml-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                🖨️ {job.jobCardPrintedAt ? 'Reprint Job Card' : 'Print Job Card'}
              </button>
            </div>

            {/* Tasks */}
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Tasks</h4>
              <div className="space-y-2 mb-4">
                {job.tasks.length === 0 && <p className="text-sm text-gray-400">No tasks assigned yet.</p>}
                {job.tasks.map((t: any) => {
                  const price = t.customerPriceOverride ?? t.agreedFeeAmount
                  return (
                    <div key={t.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {t.subcategory.emoji} {t.subcategory.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t.contractor.persons.fullName} · {formatCurrency(Number(price))}
                            {t.customerPriceOverride && (
                              <span className="ml-1 text-amber-600 dark:text-amber-400">
                                (fixed price; contractor paid {formatCurrency(Number(t.agreedFeeAmount))})
                              </span>
                            )}
                          </p>
                          {t.workDescription && <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{t.workDescription}</p>}
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${TASK_STATUS_STYLES[t.status]}`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {TASK_STATUSES.map(s => (
                          <button
                            key={s}
                            onClick={() => handleTaskStatusChange(t.id, s)}
                            className={`px-2 py-1 text-[11px] rounded border ${
                              t.status === s
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                            }`}
                          >
                            {s.replace('_', ' ')}
                          </button>
                        ))}
                        {t.status !== 'completed' && (
                          <button onClick={() => handleRemoveTask(t.id)} className="ml-auto text-[11px] text-red-500 hover:underline">
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {job.status !== 'billed' && job.status !== 'cancelled' && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                  <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400">Add Task</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newTask.subcategoryId}
                      onChange={e => setNewTask({ ...newTask, subcategoryId: e.target.value })}
                      className="text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select service...</option>
                      {allServices.map(s => (
                        <option key={s.id} value={s.id}>{s.categoryName} — {s.name}</option>
                      ))}
                    </select>
                    <select
                      value={newTask.contractorId}
                      onChange={e => setNewTask({ ...newTask, contractorId: e.target.value })}
                      disabled={!newTask.subcategoryId}
                      className="text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                    >
                      <option value="">
                        {newTask.subcategoryId && eligible.length === 0 ? 'No eligible contractors' : 'Select contractor...'}
                      </option>
                      {eligible.map(c => (
                        <option key={c.contractorId} value={c.contractorId}>{c.fullName} — {formatCurrency(Number(c.feeAmount))}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number" min="0" step="0.01"
                      placeholder={selectedFee !== undefined ? `Fixed customer price (default $${Number(selectedFee).toFixed(2)})` : 'Fixed customer price (optional)'}
                      value={newTask.customerPriceOverride}
                      onChange={e => setNewTask({ ...newTask, customerPriceOverride: e.target.value })}
                      className="text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Work notes (optional)"
                      value={newTask.workDescription}
                      onChange={e => setNewTask({ ...newTask, workDescription: e.target.value })}
                      className="text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  {taskError && <p className="text-xs text-red-600 dark:text-red-400">{taskError}</p>}
                  <button onClick={handleAddTask} className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded">
                    Add Task
                  </button>
                </div>
              )}
            </div>

            {/* Parts */}
            {(job.jobParts?.length > 0 || job.partsRequests?.length > 0) && (
              <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Parts</h4>
                {job.jobParts?.length > 0 && (
                  <div className="mb-3 space-y-1">
                    <p className="text-[10px] font-medium text-gray-400 uppercase">Issued</p>
                    {job.jobParts.map((jp: any) => (
                      <div key={jp.id} className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                        <span>{jp.productVariant.business_products.name} × {jp.quantity}</span>
                        <span>{formatCurrency(Number(jp.unitPrice) * jp.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {job.partsRequests?.filter((r: any) => r.status !== 'ISSUED').length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-gray-400 uppercase">Requests</p>
                    {job.partsRequests.filter((r: any) => r.status !== 'ISSUED').map((r: any) => (
                      <div key={r.id} className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                        <span>{r.description} × {r.quantity} <span className="text-xs text-gray-400">({r.contractor.persons.fullName})</span></span>
                        <span className={`text-xs font-medium ${r.status === 'REJECTED' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showBillModal && job && (
        <BillJobModal
          job={job}
          onClose={() => setShowBillModal(false)}
          onBilled={() => { setShowBillModal(false); fetchJob() }}
        />
      )}
    </ContentLayout>
  )
}

interface BillPart { productVariantId: string; name: string; quantity: number; unitPrice: number; stockQuantity: number }

function BillJobModal({ job, onClose, onBilled }: { job: any; onClose: () => void; onBilled: () => void }) {
  const [partsQuery, setPartsQuery] = useState('')
  const [partsResults, setPartsResults] = useState<any[]>([])
  const [billParts, setBillParts] = useState<BillPart[]>([])
  const [otherCharges, setOtherCharges] = useState<Array<{ description: string; amount: string }>>([])
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ orderNumber: string; totalAmount: number } | null>(null)

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  useEffect(() => {
    if (!partsQuery.trim()) { setPartsResults([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/universal/products?businessId=${job.businessId}&productType=PHYSICAL&search=${encodeURIComponent(partsQuery)}&includeVariants=true&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setPartsResults(data.products || data.data || [])
      }
    }, 300)
    return () => clearTimeout(t)
  }, [partsQuery, job.businessId])

  const addPart = (product: any) => {
    const variant = (product.product_variants || product.variants || [])[0]
    if (!variant) return
    if (billParts.some(p => p.productVariantId === variant.id)) return
    setBillParts([...billParts, {
      productVariantId: variant.id,
      name: product.name,
      quantity: 1,
      unitPrice: Number(variant.price ?? product.basePrice ?? 0),
      stockQuantity: Number(variant.stockQuantity ?? 0),
    }])
    setPartsQuery('')
    setPartsResults([])
  }

  const labourTotal = job.tasks.reduce((s: number, t: any) => s + Number(t.customerPriceOverride ?? t.agreedFeeAmount), 0)
  const partsTotal = billParts.reduce((s, p) => s + p.unitPrice * p.quantity, 0)
  const issuedPartsTotal = (job.jobParts || []).reduce((s: number, jp: any) => s + Number(jp.unitPrice) * jp.quantity, 0)
  const otherTotal = otherCharges.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0)
  const grandTotal = labourTotal + partsTotal + issuedPartsTotal + otherTotal

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/vehicle-service/jobs/${job.id}/bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parts: billParts.map(p => ({ productVariantId: p.productVariantId, quantity: p.quantity })),
          otherCharges: otherCharges.filter(c => c.description && parseFloat(c.amount) > 0).map(c => ({ description: c.description, amount: parseFloat(c.amount) })),
          paymentMethod,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to bill job'); return }
      setResult(data.order)
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
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Bill This Job</h3>
          </div>

          <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto text-left">
            {!result ? (
              <>
                {/* Labour */}
                <div>
                  <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Labour ({job.tasks.length})</h5>
                  {job.tasks.map((t: any) => (
                    <div key={t.id} className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                      <span>{t.subcategory.name}</span>
                      <span>{formatCurrency(Number(t.customerPriceOverride ?? t.agreedFeeAmount))}</span>
                    </div>
                  ))}
                </div>

                {/* Issued parts (already committed via a parts request — read-only) */}
                {job.jobParts?.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Issued Parts</h5>
                    {job.jobParts.map((jp: any) => (
                      <div key={jp.id} className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                        <span>{jp.productVariant.business_products.name} × {jp.quantity}</span>
                        <span>{formatCurrency(Number(jp.unitPrice) * jp.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Parts */}
                <div>
                  <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Add More Parts</h5>
                  <div className="relative mb-2">
                    <input
                      type="text"
                      value={partsQuery}
                      onChange={e => setPartsQuery(e.target.value)}
                      placeholder="Search parts to add..."
                      className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    {partsResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {partsResults.map((p: any) => (
                          <button key={p.id} type="button" onClick={() => addPart(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                            {p.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {billParts.map(p => (
                    <div key={p.productVariantId} className="flex items-center justify-between text-sm gap-2 mb-1">
                      <span className="flex-1 truncate">{p.name}</span>
                      <input
                        type="number" min="1" max={p.stockQuantity} value={p.quantity}
                        onChange={e => setBillParts(billParts.map(bp => bp.productVariantId === p.productVariantId ? { ...bp, quantity: parseInt(e.target.value) || 1 } : bp))}
                        className="w-14 text-xs px-1 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <span className="w-16 text-right">{formatCurrency(p.unitPrice * p.quantity)}</span>
                      <button onClick={() => setBillParts(billParts.filter(bp => bp.productVariantId !== p.productVariantId))} className="text-red-500 text-xs">✕</button>
                    </div>
                  ))}
                </div>

                {/* Other charges */}
                <div>
                  <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Other Charges</h5>
                  {otherCharges.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 mb-1">
                      <input
                        type="text" placeholder="Description" value={c.description}
                        onChange={e => setOtherCharges(otherCharges.map((oc, idx) => idx === i ? { ...oc, description: e.target.value } : oc))}
                        className="flex-1 text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <input
                        type="number" min="0" step="0.01" placeholder="$" value={c.amount}
                        onChange={e => setOtherCharges(otherCharges.map((oc, idx) => idx === i ? { ...oc, amount: e.target.value } : oc))}
                        className="w-20 text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <button onClick={() => setOtherCharges(otherCharges.filter((_, idx) => idx !== i))} className="text-red-500 text-xs">✕</button>
                    </div>
                  ))}
                  <button onClick={() => setOtherCharges([...otherCharges, { description: '', amount: '' }])} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                    + Add charge
                  </button>
                </div>

                {/* Payment method */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Payment Method</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    {['CASH', 'CARD', 'MOBILE_MONEY', 'ECOCASH', 'BANK_TRANSFER'].map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                  </select>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between text-base font-semibold text-gray-900 dark:text-white">
                  <span>Total</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>

                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-green-700 dark:text-green-400 font-medium mb-1">✓ Job billed successfully</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Receipt #{result.orderNumber} — {formatCurrency(result.totalAmount)}</p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            {!result ? (
              <>
                <button onClick={onClose} disabled={submitting} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium">
                  {submitting ? 'Processing...' : `Bill ${formatCurrency(grandTotal)}`}
                </button>
              </>
            ) : (
              <button onClick={onBilled} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium">
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
