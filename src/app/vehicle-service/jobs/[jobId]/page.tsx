'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { NationalIdInput } from '@/components/ui/national-id-input'
import { formatPhoneNumberForDisplay } from '@/lib/country-codes'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { JobCardPrintModal } from '@/components/vehicle-service/job-card-print-modal'

const JOB_STATUSES = ['open', 'in_progress', 'completed', 'billed', 'cancelled']
const TASK_STATUSES = ['assigned', 'in_progress', 'completed']

const TASK_STATUS_STYLES: Record<string, string> = {
  assigned: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}

// Actual duration is informational only (see MBM-265) — nothing recalculates
// the labour charge from it, it's just shown alongside a completed task.
function formatDuration(startedAt?: string | null, completedAt?: string | null): string | null {
  if (!startedAt || !completedAt) return null
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  if (ms <= 0) return null
  const totalMinutes = Math.round(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

interface ServiceCatalogEntry { id: string; name: string; emoji: string; services: { id: string; name: string; emoji: string | null; customerRate: number | null }[] }

export default function VehicleServiceJobDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const jobId = params.jobId as string
  const { hasPermission, isSystemAdmin: isSysAdmin } = useBusinessPermissionsContext()
  const canSeeMoney = isSysAdmin || hasPermission('canAccessFinancialData')

  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [catalog, setCatalog] = useState<ServiceCatalogEntry[]>([])
  const [eligible, setEligible] = useState<Array<{ contractorId: string; fullName: string; feeAmount: number }>>([])
  const [newTask, setNewTask] = useState({ categoryId: '', subcategoryId: '', contractorId: '', customerPriceOverride: '', workDescription: '' })
  const [taskError, setTaskError] = useState<string | null>(null)
  const [addingTask, setAddingTask] = useState(false)
  const [taskPartsQuery, setTaskPartsQuery] = useState('')
  const [taskPartsResults, setTaskPartsResults] = useState<any[]>([])
  const [taskParts, setTaskParts] = useState<Array<{ productVariantId: string; name: string; quantity: number; stockQuantity: number }>>([])
  const [showBillModal, setShowBillModal] = useState(false)
  const [showJobCardModal, setShowJobCardModal] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesInput, setNotesInput] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  // Add Task contractor picker: contractors who exist but aren't authorized
  // (with a fee) for the currently selected service, and global person search
  // for adding someone brand new — same "already exists, reuse it" pattern as
  // New Job's Primary Contractor field (see MBM-264 follow-ups).
  const [allContractors, setAllContractors] = useState<Array<{ id: string; personId: string; fullName: string }>>([])
  const [personSearchResults, setPersonSearchResults] = useState<Array<{ id: string; fullName: string; phone: string }>>([])
  const [showNewContractorForm, setShowNewContractorForm] = useState(false)
  const [newContractorForm, setNewContractorForm] = useState({ fullName: '', phone: '', nationalId: '', idFormatTemplateId: '' })
  const [creatingContractor, setCreatingContractor] = useState(false)
  const [contractorFormError, setContractorFormError] = useState<string | null>(null)
  const [existingPersonMatch, setExistingPersonMatch] = useState<{ id: string; fullName: string } | null>(null)
  const [authorizingContractor, setAuthorizingContractor] = useState<{ id: string; fullName: string } | null>(null)
  const [authorizeFee, setAuthorizeFee] = useState('')
  const [authorizing, setAuthorizing] = useState(false)
  // New default labour rate, entered inline the first time a service with no
  // configured customer rate is used in Add Task (see MBM-265).
  const [newLabourRate, setNewLabourRate] = useState('')

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
    setAuthorizingContractor(null)
    setAuthorizeFee('')
    setNewLabourRate('')
  }, [newTask.subcategoryId, job?.businessId])

  // All active contractors at the business (not just those authorized for the
  // currently selected service) — powers the "not authorized yet" and
  // "not a contractor yet" branches of the Add Task contractor picker.
  useEffect(() => {
    if (!job?.businessId) return
    fetch(`/api/vehicle-service/contractors?businessId=${job.businessId}&status=active`)
      .then(res => res.ok ? res.json() : { contractors: [] })
      .then(data => setAllContractors((data.contractors || []).map((c: any) => ({ id: c.id, personId: c.personId, fullName: c.fullName }))))
      .catch(() => setAllContractors([]))
  }, [job?.businessId])

  // Known-parts search for Add Task (e.g. an oil filter for an oil change) —
  // same product search + immediate-stock-decrement model as Bill Job's own
  // "Add More Parts", just usable earlier, at task-creation time.
  useEffect(() => {
    if (!taskPartsQuery.trim() || !job?.businessId) { setTaskPartsResults([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/universal/products?businessId=${job.businessId}&productType=PHYSICAL&search=${encodeURIComponent(taskPartsQuery)}&includeVariants=true&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setTaskPartsResults(data.products || data.data || [])
      }
    }, 300)
    return () => clearTimeout(t)
  }, [taskPartsQuery, job?.businessId])

  const addTaskPart = (product: any) => {
    const variant = (product.product_variants || product.variants || [])[0]
    if (!variant) return
    if (taskParts.some(p => p.productVariantId === variant.id)) return
    setTaskParts([...taskParts, {
      productVariantId: variant.id,
      name: product.name,
      quantity: 1,
      stockQuantity: Number(variant.stockQuantity ?? 0),
    }])
    setTaskPartsQuery('')
    setTaskPartsResults([])
  }

  // Global person search (Persons has no businessId — search everywhere) so an
  // existing individual can be reused as a contractor instead of duplicated.
  const handleContractorSearchQuery = (query: string) => {
    if (!query.trim()) { setPersonSearchResults([]); return }
    fetch(`/api/persons?search=${encodeURIComponent(query.trim())}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setPersonSearchResults((Array.isArray(data) ? data : []).map((p: any) => ({ id: p.id, fullName: p.fullName, phone: p.phone }))))
      .catch(() => setPersonSearchResults([]))
  }

  const handleUseExistingPersonAsContractor = async (personId: string, fullName: string) => {
    setContractorFormError(null)
    try {
      const res = await fetch('/api/vehicle-service/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: job.businessId, personId }),
      })
      const data = await res.json()
      if (!res.ok) { setContractorFormError(data.error || `Failed to add ${fullName} as a contractor`); return }
      const newContractor = { id: data.contractor.id, personId, fullName: data.contractor.persons?.fullName ?? fullName }
      setAllContractors(prev => [...prev, newContractor])
      setAuthorizingContractor({ id: newContractor.id, fullName: newContractor.fullName })
      setAuthorizeFee('')
      setExistingPersonMatch(null)
      setShowNewContractorForm(false)
      setPersonSearchResults([])
    } catch {
      setContractorFormError('Connection error — please try again')
    }
  }

  const handleTaskContractorChange = (val: string) => {
    setTaskError(null)
    if (val.startsWith('eligible:')) {
      setNewTask(t => ({ ...t, contractorId: val.slice('eligible:'.length) }))
      setAuthorizingContractor(null)
    } else if (val.startsWith('contractor:')) {
      const contractorId = val.slice('contractor:'.length)
      const c = allContractors.find(c => c.id === contractorId)
      setNewTask(t => ({ ...t, contractorId: '' }))
      setAuthorizingContractor(c ? { id: c.id, fullName: c.fullName } : null)
      setAuthorizeFee('')
    } else if (val.startsWith('person:')) {
      const personId = val.slice('person:'.length)
      const p = personSearchResults.find(p => p.id === personId)
      if (p) handleUseExistingPersonAsContractor(personId, p.fullName)
    }
  }

  const handleCreateContractor = async () => {
    if (!newContractorForm.fullName.trim() || !newContractorForm.phone.trim() || !newContractorForm.nationalId.trim()) {
      setContractorFormError('Full name, phone, and national ID are required')
      return
    }
    setCreatingContractor(true)
    setContractorFormError(null)
    setExistingPersonMatch(null)
    try {
      const personRes = await fetch('/api/persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newContractorForm.fullName.trim(),
          phone: newContractorForm.phone.trim(),
          nationalId: newContractorForm.nationalId.trim(),
          idFormatTemplateId: newContractorForm.idFormatTemplateId || undefined,
        }),
      })
      const person = await personRes.json()
      if (personRes.status === 409 && person.existingPerson) {
        setExistingPersonMatch({ id: person.existingPerson.id, fullName: person.existingPerson.fullName })
        return
      }
      if (!personRes.ok) { setContractorFormError(person.error || 'Failed to register person'); return }

      const contractorRes = await fetch('/api/vehicle-service/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: job.businessId, personId: person.id }),
      })
      const contractorData = await contractorRes.json()
      if (!contractorRes.ok) { setContractorFormError(contractorData.error || 'Failed to create contractor'); return }

      const newContractor = { id: contractorData.contractor.id, personId: person.id, fullName: contractorData.contractor.persons?.fullName ?? newContractorForm.fullName.trim() }
      setAllContractors(prev => [...prev, newContractor])
      setAuthorizingContractor({ id: newContractor.id, fullName: newContractor.fullName })
      setAuthorizeFee('')
      setShowNewContractorForm(false)
      setNewContractorForm({ fullName: '', phone: '', nationalId: '', idFormatTemplateId: '' })
    } catch {
      setContractorFormError('Connection error — please try again')
    } finally {
      setCreatingContractor(false)
    }
  }

  // Authorizes the picked contractor for the currently selected service
  // (POST .../services requires canManageEmployees/admin server-side — a 403
  // here surfaces as a task error telling staff to ask a manager).
  const handleAuthorizeContractor = async () => {
    if (!authorizingContractor || !newTask.subcategoryId) return
    const fee = parseFloat(authorizeFee)
    if (isNaN(fee) || fee < 0) { setTaskError('Enter a valid fee to authorize this contractor for this service'); return }
    setAuthorizing(true)
    setTaskError(null)
    try {
      const res = await fetch(`/api/vehicle-service/contractors/${authorizingContractor.id}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subcategoryId: newTask.subcategoryId, feeAmount: fee }),
      })
      const data = await res.json()
      if (!res.ok) { setTaskError(data.error || 'Failed to authorize contractor'); return }

      const eligibleRes = await fetch(`/api/vehicle-service/contractors/eligible?businessId=${job.businessId}&subcategoryId=${newTask.subcategoryId}`)
      if (eligibleRes.ok) {
        const eligibleData = await eligibleRes.json()
        setEligible(eligibleData.contractors || [])
      }
      setNewTask(t => ({ ...t, contractorId: authorizingContractor.id }))
      setAuthorizingContractor(null)
      setAuthorizeFee('')
    } finally {
      setAuthorizing(false)
    }
  }

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
    setShowJobCardModal(true)
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
    if (canSeeMoney && selectedService && selectedService.customerRate === null && !newLabourRate.trim()) {
      setTaskError('Set a labour rate for this service before adding the task')
      return
    }
    setAddingTask(true)
    try {
      const res = await fetch(`/api/vehicle-service/jobs/${jobId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subcategoryId: newTask.subcategoryId,
          contractorId: newTask.contractorId,
          ...(canSeeMoney ? {
            customerPriceOverride: newTask.customerPriceOverride ? parseFloat(newTask.customerPriceOverride) : undefined,
            customerRate: selectedService && selectedService.customerRate === null && newLabourRate.trim()
              ? parseFloat(newLabourRate)
              : undefined,
          } : {}),
          workDescription: newTask.workDescription || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setTaskError(data.error || 'Failed to add task'); return }

      // Attach any known parts picked while adding this task (e.g. an oil
      // filter for an oil change) — decrements stock immediately, same as
      // Bill Job's part-adding.
      for (const p of taskParts) {
        const partRes = await fetch(`/api/vehicle-service/jobs/${jobId}/parts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productVariantId: p.productVariantId, quantity: p.quantity }),
        })
        if (!partRes.ok) {
          const partData = await partRes.json()
          setTaskError(`Task added, but couldn't add part "${p.name}": ${partData.error || 'unknown error'}`)
        }
      }

      setNewTask({ categoryId: '', subcategoryId: '', contractorId: '', customerPriceOverride: '', workDescription: '' })
      setTaskParts([])
      setAuthorizingContractor(null)
      setAuthorizeFee('')
      setNewLabourRate('')
      setShowNewContractorForm(false)
      setNewContractorForm({ fullName: '', phone: '', nationalId: '', idFormatTemplateId: '' })
      setContractorFormError(null)
      setExistingPersonMatch(null)
      setPersonSearchResults([])
      fetchJob()
    } finally {
      setAddingTask(false)
    }
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
  const selectedCategory = catalog.find(c => c.id === newTask.categoryId)
  const selectedService = selectedCategory?.services.find(s => s.id === newTask.subcategoryId)
  const eligibleIds = new Set(eligible.map(c => c.contractorId))
  const allContractorPersonIds = new Set(allContractors.map(c => c.personId))
  const taskContractorOptions = [
    ...eligible.map(c => ({ value: `eligible:${c.contractorId}`, name: `${c.fullName} — ${formatCurrency(Number(c.feeAmount))}` })),
    ...allContractors.filter(c => !eligibleIds.has(c.id)).map(c => ({ value: `contractor:${c.id}`, name: `${c.fullName} — not authorized for this service yet` })),
    ...personSearchResults.filter(p => !allContractorPersonIds.has(p.id)).map(p => ({ value: `person:${p.id}`, name: `${p.fullName} — not yet a contractor here` })),
  ]
  const allTasksComplete = !!job && job.tasks.length > 0 && job.tasks.every((t: any) => t.status === 'completed')

  const handleMarkCardReturned = async () => {
    await fetch(`/api/vehicle-service/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markCardReturned: true }),
    })
    fetchJob()
  }

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try {
      await fetch(`/api/vehicle-service/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesInput }),
      })
      setEditingNotes(false)
      fetchJob()
    } finally {
      setSavingNotes(false)
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
                    {job.business_customers?.phone && ` · ${formatPhoneNumberForDisplay(job.business_customers.phone)}`}
                  </p>
                  {job.primaryContractor && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Primary contractor: {job.primaryContractor.persons.fullName}
                    </p>
                  )}
                  {editingNotes ? (
                    <div className="mt-2 space-y-1.5">
                      <textarea
                        value={notesInput}
                        onChange={e => setNotesInput(e.target.value)}
                        rows={2}
                        placeholder="Job notes (optional)"
                        autoFocus
                        className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <div className="flex gap-2">
                        <button onClick={handleSaveNotes} disabled={savingNotes}
                          className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded">
                          {savingNotes ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => setEditingNotes(false)} disabled={savingNotes}
                          className="px-3 py-1 text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setNotesInput(job.notes || ''); setEditingNotes(true) }}
                      className="mt-1 text-xs text-left text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:underline block"
                    >
                      {job.notes ? `Notes: ${job.notes}` : '+ Add job notes'}
                    </button>
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
              {allTasksComplete && job.status !== 'billed' && job.status !== 'cancelled' && canSeeMoney && (
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
                  const customerAmount = t.customerPriceOverride ?? t.customerLabourRate ?? t.agreedFeeAmount
                  const duration = formatDuration(t.startedAt, t.completedAt)
                  return (
                    <div key={t.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {t.subcategory.emoji} {t.subcategory.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t.contractor.persons.fullName}
                            {canSeeMoney && (
                              <>
                                {' · '}Labour {formatCurrency(Number(customerAmount))}
                                {t.customerPriceOverride && <span className="text-amber-600 dark:text-amber-400"> (fixed)</span>}
                                {' · '}Contractor pay {formatCurrency(Number(t.agreedFeeAmount))}
                              </>
                            )}
                            {duration && <> · {duration}</>}
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

              {canSeeMoney && job.financials && (
                <div className="flex justify-between items-center text-sm font-semibold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-3 mb-1">
                  <span>Total Estimated Cost</span>
                  <span>{formatCurrency(job.financials.totalEstimatedCost)}</span>
                </div>
              )}

              {job.status !== 'billed' && job.status !== 'cancelled' && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                  <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400">Add Task</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <SearchableSelect
                      options={catalog.map(c => ({ value: c.id, name: `${c.emoji ? c.emoji + ' ' : ''}${c.name}` }))}
                      value={newTask.categoryId}
                      onChange={v => setNewTask({ ...newTask, categoryId: v, subcategoryId: '' })}
                      placeholder="Select category..."
                      searchPlaceholder="Search categories..."
                      required
                    />
                    <SearchableSelect
                      options={(selectedCategory?.services ?? []).map(s => ({ value: s.id, name: `${s.emoji ? s.emoji + ' ' : ''}${s.name}` }))}
                      value={newTask.subcategoryId}
                      onChange={v => setNewTask({ ...newTask, subcategoryId: v })}
                      placeholder={newTask.categoryId ? 'Select service...' : 'Pick a category first'}
                      searchPlaceholder="Search services..."
                      emptyMessage="No services in this category"
                      disabled={!newTask.categoryId}
                      required
                    />
                  </div>
                  {authorizingContractor ? (
                    <div className="border border-amber-200 dark:border-amber-800 rounded-lg p-3 bg-amber-50 dark:bg-amber-900/10 space-y-2">
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        <span className="font-medium">{authorizingContractor.fullName}</span> isn't authorized for {selectedCategory && newTask.subcategoryId
                          ? (selectedCategory.services.find(s => s.id === newTask.subcategoryId)?.name ?? 'this service')
                          : 'this service'} yet — set a fee to authorize them.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="number" min="0" step="0.01" placeholder="Fee $" value={authorizeFee}
                          onChange={e => setAuthorizeFee(e.target.value)}
                          className="flex-1 text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <button type="button" onClick={handleAuthorizeContractor} disabled={authorizing}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded">
                          {authorizing ? 'Authorizing…' : 'Authorize & Select'}
                        </button>
                        <button type="button" onClick={() => { setAuthorizingContractor(null); setAuthorizeFee('') }}
                          className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : showNewContractorForm ? (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 bg-gray-50 dark:bg-gray-900">
                      {existingPersonMatch ? (
                        <>
                          <p className="text-sm text-amber-700 dark:text-amber-400">
                            <span className="font-medium">{existingPersonMatch.fullName}</span> already exists with that phone/national ID — reuse them instead of creating a duplicate.
                          </p>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => handleUseExistingPersonAsContractor(existingPersonMatch.id, existingPersonMatch.fullName)}
                              className="flex-1 py-1.5 px-3 rounded-md text-xs font-medium text-white bg-teal-600 hover:bg-teal-700">
                              Use {existingPersonMatch.fullName}
                            </button>
                            <button type="button" onClick={() => setExistingPersonMatch(null)}
                              className="py-1.5 px-3 rounded-md text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                              Back
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-300">New Contractor</p>
                          <input type="text" placeholder="Full name *" value={newContractorForm.fullName}
                            onChange={e => setNewContractorForm({ ...newContractorForm, fullName: e.target.value })}
                            className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                          <PhoneNumberInput
                            value={newContractorForm.phone}
                            onChange={fullPhone => setNewContractorForm({ ...newContractorForm, phone: fullPhone })}
                            label="Phone *"
                            required
                          />
                          <NationalIdInput
                            value={newContractorForm.nationalId}
                            templateId={newContractorForm.idFormatTemplateId}
                            onChange={(nationalId, templateId) => setNewContractorForm({ ...newContractorForm, nationalId, idFormatTemplateId: templateId || '' })}
                            onTemplateChange={templateId => setNewContractorForm({ ...newContractorForm, idFormatTemplateId: templateId })}
                            label="National ID *"
                            required
                          />
                          {contractorFormError && <p className="text-xs text-red-600 dark:text-red-400">{contractorFormError}</p>}
                          <div className="flex gap-2">
                            <button type="button" onClick={handleCreateContractor} disabled={creatingContractor}
                              className="flex-1 py-1.5 px-3 rounded-md text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                              {creatingContractor ? 'Creating…' : 'Create & Continue'}
                            </button>
                            <button type="button" onClick={() => { setShowNewContractorForm(false); setContractorFormError(null) }}
                              className="py-1.5 px-3 rounded-md text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                              Cancel
                            </button>
                          </div>
                          <p className="text-[10px] text-gray-400">After creating, you'll set their fee to authorize them for the selected service.</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <SearchableSelect
                      options={taskContractorOptions}
                      value={newTask.contractorId ? `eligible:${newTask.contractorId}` : ''}
                      onChange={handleTaskContractorChange}
                      onSearchQuery={handleContractorSearchQuery}
                      onCreateNew={q => { setNewContractorForm({ fullName: q, phone: '', nationalId: '', idFormatTemplateId: '' }); setShowNewContractorForm(true) }}
                      createNewLabel={q => `+ New Contractor: "${q}"`}
                      placeholder="Select contractor..."
                      searchPlaceholder="Search contractors (also checks everyone in the system)..."
                      emptyMessage={newTask.subcategoryId ? 'No contractors found' : 'Pick a service first'}
                      disabled={!newTask.subcategoryId}
                      required
                    />
                  )}
                  {canSeeMoney && newTask.subcategoryId && (
                    selectedService && selectedService.customerRate === null ? (
                      <div className="border border-amber-200 dark:border-amber-800 rounded-lg p-3 bg-amber-50 dark:bg-amber-900/10 space-y-1.5">
                        <p className="text-xs text-amber-700 dark:text-amber-400">No labour rate set for this service yet — set one now (becomes the default for future tasks).</p>
                        <input
                          type="number" min="0" step="0.01" placeholder="Labour rate $"
                          value={newLabourRate}
                          onChange={e => setNewLabourRate(e.target.value)}
                          className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    ) : (
                      <input
                        type="number" min="0" step="0.01"
                        placeholder={selectedService?.customerRate != null ? `Override labour price for this task (default $${Number(selectedService.customerRate).toFixed(2)})` : 'Override labour price for this task (optional)'}
                        value={newTask.customerPriceOverride}
                        onChange={e => setNewTask({ ...newTask, customerPriceOverride: e.target.value })}
                        className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    )
                  )}
                  <input
                    type="text"
                    placeholder="Work notes (optional)"
                    value={newTask.workDescription}
                    onChange={e => setNewTask({ ...newTask, workDescription: e.target.value })}
                    className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />

                  {/* Known parts (optional) — e.g. an oil filter for an oil change */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Known Parts (optional)</label>
                    {taskParts.length > 0 && (
                      <div className="space-y-1 mb-1.5">
                        {taskParts.map(p => (
                          <div key={p.productVariantId} className="flex items-center justify-between gap-2 text-xs bg-gray-50 dark:bg-gray-900 rounded px-2 py-1">
                            <span>{p.name}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <input
                                type="number" min="1" max={p.stockQuantity} value={p.quantity}
                                onChange={e => setTaskParts(taskParts.map(x => x.productVariantId === p.productVariantId ? { ...x, quantity: Math.max(1, parseInt(e.target.value) || 1) } : x))}
                                className="w-14 text-xs px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                              <button type="button" onClick={() => setTaskParts(taskParts.filter(x => x.productVariantId !== p.productVariantId))} className="text-red-500 hover:underline">Remove</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="relative">
                      <input
                        type="text"
                        value={taskPartsQuery}
                        onChange={e => setTaskPartsQuery(e.target.value)}
                        placeholder="Search parts inventory to attach..."
                        className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      {taskPartsResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {taskPartsResults.map((p: any) => (
                            <button key={p.id} type="button" onClick={() => addTaskPart(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                              {p.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {taskError && <p className="text-xs text-red-600 dark:text-red-400">{taskError}</p>}
                  <button onClick={handleAddTask} disabled={addingTask} className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded">
                    {addingTask ? 'Adding…' : 'Add Task'}
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
                        {canSeeMoney && <span>{formatCurrency(Number(jp.unitPrice) * jp.quantity)}</span>}
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

      <JobCardPrintModal
        isOpen={showJobCardModal}
        job={job}
        onClose={() => setShowJobCardModal(false)}
      />
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

  const labourTotal = job.tasks.reduce((s: number, t: any) => s + Number(t.customerPriceOverride ?? t.customerLabourRate ?? t.agreedFeeAmount), 0)
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
                      <span>{formatCurrency(Number(t.customerPriceOverride ?? t.customerLabourRate ?? t.agreedFeeAmount))}</span>
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
