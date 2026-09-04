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
import { PartsPickerGrid } from '@/components/vehicle-service/parts-picker-grid'
import { InvoicePrintModal } from '@/components/vehicle-service/invoice-print-modal'
import { UnifiedReceiptPreviewModal } from '@/components/receipts/unified-receipt-preview-modal'
import { ReceiptPrintManager } from '@/lib/receipts/receipt-print-manager'
import { buildReceiptWithBusinessInfo } from '@/lib/printing/receipt-builder'
import type { ReceiptData } from '@/types/printing'

// "Billed" is deliberately excluded here — it's a consequence of actually
// billing the job (Bill This Job), never a status a user picks directly.
// It still displays via the separate "Billed" badge once job.orderId is set.
const JOB_STATUSES = ['open', 'in_progress', 'completed', 'cancelled']
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
  const [taskParts, setTaskParts] = useState<Array<{ productVariantId: string; name: string; quantity: number; stockQuantity: number }>>([])
  const [showTaskPartsPicker, setShowTaskPartsPicker] = useState(false)
  const [showBillModal, setShowBillModal] = useState(false)
  const [showJobCardModal, setShowJobCardModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
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
  // Contractor-pay override (MBM-267) — independent of the customer-facing
  // waiveLabor flag. Only surfaced on rework jobs.
  const [contractorFeeOverrideInput, setContractorFeeOverrideInput] = useState('')
  const [originalJobTasks, setOriginalJobTasks] = useState<Array<{ subcategoryId: string; contractorId: string }>>([])

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
    setContractorFeeOverrideInput('')
  }, [newTask.subcategoryId, job?.businessId])

  // Rework jobs (MBM-267): fetch the original job's tasks once, so Add Task
  // can detect "same contractor redoing the same service" and default their
  // pay to $0 — a helpful nudge, not enforced.
  useEffect(() => {
    if (!job?.reworkOfJobId) { setOriginalJobTasks([]); return }
    fetch(`/api/vehicle-service/jobs/${job.reworkOfJobId}`)
      .then(res => res.ok ? res.json() : { job: null })
      .then(data => setOriginalJobTasks((data.job?.tasks || []).map((t: any) => ({ subcategoryId: t.subcategoryId, contractorId: t.contractorId }))))
      .catch(() => setOriginalJobTasks([]))
  }, [job?.reworkOfJobId])

  const sameContractorAsOriginal = originalJobTasks.some(
    t => t.subcategoryId === newTask.subcategoryId && t.contractorId === newTask.contractorId
  )

  useEffect(() => {
    if (sameContractorAsOriginal && !contractorFeeOverrideInput) {
      setContractorFeeOverrideInput('0')
    }
  }, [sameContractorAsOriginal]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const addTaskPart = (product: any, variant: any) => {
    if (taskParts.some(p => p.productVariantId === variant.id)) return
    setTaskParts([...taskParts, {
      productVariantId: variant.id,
      name: product.name,
      quantity: 1,
      stockQuantity: Number(variant.stockQuantity ?? 0),
    }])
    setShowTaskPartsPicker(false)
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
    setStatusError(null)
    const res = await fetch(`/api/vehicle-service/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setStatusError(data.error || 'Failed to update job status')
      return
    }
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
            contractorFeeOverride: job.reworkOfJobId && contractorFeeOverrideInput.trim() !== ''
              ? parseFloat(contractorFeeOverrideInput)
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
      setContractorFeeOverrideInput('')
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
    setStatusError(null)
    const res = await fetch(`/api/vehicle-service/jobs/${jobId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setStatusError(data.error || 'Failed to update task status')
      return
    }
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
                  {job.reworkOfJob && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      Rework of{' '}
                      <a href={`/vehicle-service/jobs/${job.reworkOfJob.id}`} className="underline hover:no-underline">
                        {[job.reworkOfJob.vehicleMake, job.reworkOfJob.vehicleModel].filter(Boolean).join(' ') || 'job'}
                        {job.reworkOfJob.vehiclePlate && ` (${job.reworkOfJob.vehiclePlate})`}
                      </a>
                    </p>
                  )}
                  {(job.waiveLabor || job.waiveParts) && (
                    <div className="flex gap-1.5 mt-1">
                      {job.waiveLabor && (
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                          Labor Waived
                        </span>
                      )}
                      {job.waiveParts && (
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                          Parts Waived
                        </span>
                      )}
                    </div>
                  )}
                  {job.reworkJobs && job.reworkJobs.length > 0 && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Rework jobs from this one:{' '}
                      {job.reworkJobs.map((rj: any, i: number) => (
                        <span key={rj.id}>
                          {i > 0 && ', '}
                          <a href={`/vehicle-service/jobs/${rj.id}`} className="underline hover:no-underline">
                            {[rj.vehicleMake, rj.vehicleModel].filter(Boolean).join(' ') || 'job'}
                            {rj.vehiclePlate && ` (${rj.vehiclePlate})`}
                          </a>
                        </span>
                      ))}
                    </div>
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
                {JOB_STATUSES.map(s => {
                  const blockedReason =
                    s === 'in_progress' && job.tasks.length === 0 ? 'Assign at least one task first'
                    : s === 'completed' && !allTasksComplete ? 'All tasks must be completed first'
                    : null
                  return (
                    <button
                      key={s}
                      onClick={() => handleJobStatusChange(s)}
                      disabled={job.status === 'billed' || (job.status !== s && !!blockedReason)}
                      title={job.status !== s ? blockedReason ?? undefined : undefined}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed ${
                        job.status === s
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </button>
                  )
                })}
              </div>
              {statusError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{statusError}</p>}
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
                  onClick={() => router.push(`/universal/receipts?businessId=${job.businessId}&receiptId=${job.orderId}`)}
                  className="mt-3 ml-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  View Receipt
                </button>
              )}
              {job.status === 'billed' && job.business_orders?.paymentStatus === 'PENDING' && canSeeMoney && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="mt-3 ml-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
                >
                  💰 Collect Payment
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
                                {' · '}Contractor pay {formatCurrency(Number(t.contractorFeeOverride ?? t.agreedFeeAmount))}
                                {t.contractorFeeOverride !== null && t.contractorFeeOverride !== undefined && (
                                  <span className="text-amber-600 dark:text-amber-400">
                                    {' '}{Number(t.contractorFeeOverride) === 0 ? '(waived)' : `(reduced from ${formatCurrency(Number(t.agreedFeeAmount))})`}
                                  </span>
                                )}
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
                        {TASK_STATUSES.map(s => {
                          const locked = job.status === 'billed' || job.status === 'cancelled'
                          return (
                            <button
                              key={s}
                              onClick={() => handleTaskStatusChange(t.id, s)}
                              disabled={locked}
                              title={locked ? `This job is ${job.status} — tasks can no longer be changed` : undefined}
                              className={`px-2 py-1 text-[11px] rounded border ${
                                t.status === s
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                              } ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {s.replace('_', ' ')}
                            </button>
                          )
                        })}
                        {t.status !== 'completed' && job.status !== 'billed' && job.status !== 'cancelled' && (
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
                    job.waiveLabor ? (
                      <p className="text-xs text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg p-2 bg-amber-50 dark:bg-amber-900/10">
                        Labor waived — rework job. This task will bill the customer $0 regardless of any configured rate.
                      </p>
                    ) : selectedService && selectedService.customerRate === null ? (
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
                  {canSeeMoney && job.reworkOfJobId && newTask.subcategoryId && newTask.contractorId && (
                    <div>
                      <input
                        type="number" min="0" step="0.01"
                        placeholder="Contractor pay for this task (optional override)"
                        value={contractorFeeOverrideInput}
                        onChange={e => setContractorFeeOverrideInput(e.target.value)}
                        className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {sameContractorAsOriginal
                          ? 'Same contractor as the original job — defaulted to $0 (waived). Adjust if needed.'
                          : 'Leave blank to pay this contractor their normal fee for the rework.'}
                      </p>
                    </div>
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
                    <button
                      type="button"
                      onClick={() => setShowTaskPartsPicker(true)}
                      className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 text-left"
                    >
                      📦 Browse Parts to Attach...
                    </button>
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

      {showPaymentModal && job && (
        <CollectPaymentModal
          job={job}
          onClose={() => setShowPaymentModal(false)}
          onPaid={() => { setShowPaymentModal(false); fetchJob() }}
        />
      )}

      {showTaskPartsPicker && job && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75" onClick={() => setShowTaskPartsPicker(false)} />
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Browse Parts</h3>
                <button onClick={() => setShowTaskPartsPicker(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
              </div>
              <div className="px-6 py-4 max-h-[70vh] overflow-y-auto text-left">
                <PartsPickerGrid
                  businessId={job.businessId}
                  excludeVariantIds={taskParts.map(p => p.productVariantId)}
                  onAdd={addTaskPart}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </ContentLayout>
  )
}

interface BillPart { productVariantId: string; name: string; quantity: number; unitPrice: number; stockQuantity: number }

function BillJobModal({ job, onClose, onBilled }: { job: any; onClose: () => void; onBilled: () => void }) {
  const [billParts, setBillParts] = useState<BillPart[]>([])
  const [otherCharges, setOtherCharges] = useState<Array<{ description: string; amount: string }>>([])
  const [discountInput, setDiscountInput] = useState('')
  const [taxInput, setTaxInput] = useState('')
  const [taxLabel, setTaxLabel] = useState('Tax')
  const [taxRate, setTaxRate] = useState(0)
  const [taxEnabled, setTaxEnabled] = useState(false)
  const [taxManuallyEdited, setTaxManuallyEdited] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [result, setResult] = useState<{ id: string; orderNumber: string; subtotal: number; taxAmount: number; discountAmount: number; totalAmount: number } | null>(null)

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  // Fetch the business's own tax settings (same source POS checkout uses) to
  // pre-fill a default — still a plain editable $ amount here, since labour
  // rates aren't tax-inclusive retail prices the way product pricing is.
  useEffect(() => {
    fetch(`/api/universal/business-config?businessId=${job.businessId}`)
      .then(res => res.ok ? res.json() : null)
      .then(config => {
        if (!config) return
        if (config.taxLabel) setTaxLabel(config.taxLabel)
        setTaxEnabled(!!config.taxEnabled)
        setTaxRate(Number(config.taxRate) || 0)
      })
      .catch(() => {})
  }, [job.businessId])

  const addPart = (product: any, variant: any) => {
    if (billParts.some(p => p.productVariantId === variant.id)) return
    setBillParts([...billParts, {
      productVariantId: variant.id,
      name: product.name,
      quantity: 1,
      unitPrice: Number(variant.price ?? product.basePrice ?? 0),
      stockQuantity: Number(variant.stockQuantity ?? 0),
    }])
  }

  const labourTotal = job.tasks.reduce((s: number, t: any) => s + Number(t.customerPriceOverride ?? t.customerLabourRate ?? t.agreedFeeAmount), 0)
  // Parts bill the customer at $0 on a parts-waived rework job (MBM-267) —
  // matches the bill route's own logic, so this preview never overstates
  // what's actually about to be invoiced.
  const partsTotal = job.waiveParts ? 0 : billParts.reduce((s, p) => s + p.unitPrice * p.quantity, 0)
  const issuedPartsTotal = job.waiveParts ? 0 : (job.jobParts || []).reduce((s: number, jp: any) => s + Number(jp.unitPrice) * jp.quantity, 0)
  const otherTotal = otherCharges.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0)
  const subtotal = labourTotal + partsTotal + issuedPartsTotal + otherTotal
  const taxAmount = parseFloat(taxInput) || 0
  const discountAmount = Math.min(parseFloat(discountInput) || 0, subtotal + taxAmount)
  const grandTotal = subtotal + taxAmount - discountAmount

  // Keep tax following the subtotal as parts/charges are added, until the
  // user manually types their own value — then it's their call from then on.
  useEffect(() => {
    if (taxManuallyEdited || !taxEnabled || !taxRate) return
    setTaxInput((subtotal * (taxRate / 100)).toFixed(2))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, taxEnabled, taxRate, taxManuallyEdited])

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
          discountAmount: discountAmount || undefined,
          taxAmount: taxAmount || undefined,
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
    <>
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75" onClick={submitting ? undefined : onClose} />
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Bill This Job</h3>
          </div>

          <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto text-left">
            {!result ? (
              <>
                {/* Labour */}
                <div>
                  <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Labour ({job.tasks.length}){job.waiveLabor && <span className="text-amber-600 dark:text-amber-400"> (waived)</span>}
                  </h5>
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
                    <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Issued Parts{job.waiveParts && <span className="text-amber-600 dark:text-amber-400"> (waived)</span>}
                    </h5>
                    {job.jobParts.map((jp: any) => (
                      <div key={jp.id} className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                        <span>{jp.productVariant.business_products.name} × {jp.quantity}</span>
                        <span>{job.waiveParts ? formatCurrency(0) : formatCurrency(Number(jp.unitPrice) * jp.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Parts */}
                <div>
                  <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Add More Parts{job.waiveParts && <span className="text-amber-600 dark:text-amber-400"> (customer billed $0 — rework job)</span>}
                  </h5>
                  <div className="mb-2">
                    <PartsPickerGrid
                      businessId={job.businessId}
                      excludeVariantIds={billParts.map(p => p.productVariantId)}
                      onAdd={addPart}
                    />
                  </div>
                  {billParts.map(p => (
                    <div key={p.productVariantId} className="flex items-center justify-between text-sm gap-2 mb-1">
                      <span className="flex-1 truncate">{p.name}</span>
                      <input
                        type="number" min="1" max={p.stockQuantity} value={p.quantity}
                        onChange={e => setBillParts(billParts.map(bp => bp.productVariantId === p.productVariantId ? { ...bp, quantity: parseInt(e.target.value) || 1 } : bp))}
                        className="w-14 text-xs px-1 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <span className="w-16 text-right">{job.waiveParts ? formatCurrency(0) : formatCurrency(p.unitPrice * p.quantity)}</span>
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

                {/* Discount & tax */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Discount</label>
                    <input
                      type="number" min="0" step="0.01" placeholder="$0.00" value={discountInput}
                      onChange={e => setDiscountInput(e.target.value)}
                      className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{taxLabel}</label>
                    <input
                      type="number" min="0" step="0.01" placeholder="$0.00" value={taxInput}
                      onChange={e => { setTaxInput(e.target.value); setTaxManuallyEdited(true) }}
                      className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 space-y-0.5 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                  {taxAmount > 0 && <div className="flex justify-between"><span>{taxLabel}</span><span>{formatCurrency(taxAmount)}</span></div>}
                  {discountAmount > 0 && <div className="flex justify-between text-amber-600 dark:text-amber-400"><span>Discount</span><span>-{formatCurrency(discountAmount)}</span></div>}
                  <div className="flex justify-between text-base font-semibold text-gray-900 dark:text-white pt-1">
                    <span>Total</span>
                    <span>{formatCurrency(grandTotal)}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-400">This generates the customer invoice — payment is collected separately afterward, from this job's "Collect Payment" action.</p>

                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              </>
            ) : (
              <div className="text-center py-4 space-y-3">
                <div>
                  <p className="text-green-700 dark:text-green-400 font-medium mb-1">✓ Invoice generated</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Invoice #{result.orderNumber} — {formatCurrency(result.totalAmount)}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Awaiting payment — collect it from the job detail page once the customer pays.</p>
                </div>
                <button onClick={() => setShowInvoiceModal(true)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800">
                  🖨️ Print Invoice
                </button>
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
                  {submitting ? 'Generating...' : `Generate Invoice ${formatCurrency(grandTotal)}`}
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
    <InvoicePrintModal
      isOpen={showInvoiceModal}
      onClose={() => setShowInvoiceModal(false)}
      job={job}
      billParts={billParts}
      otherCharges={otherCharges}
      result={result}
      taxLabel={taxLabel}
    />
    </>
  )
}

const PAYMENT_METHODS = ['CASH', 'CARD', 'MOBILE_MONEY', 'ECOCASH', 'BANK_TRANSFER']

// Step 2 of the two-step billing flow (see MBM-266) — a job that's already
// been invoiced (paymentStatus PENDING) gets paid here, potentially by a
// different user than the one who billed it (the customer walks the printed
// invoice to a cashier). This is what actually credits the business account.
function CollectPaymentModal({ job, onClose, onPaid }: { job: any; onClose: () => void; onPaid: () => void }) {
  const { currentBusiness } = useBusinessPermissionsContext()
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingReceiptData, setPendingReceiptData] = useState<ReceiptData | null>(null)
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
  const totalAmount = Number(job.business_orders?.totalAmount ?? 0)

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/vehicle-service/jobs/${job.id}/collect-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to process payment'); return }

      // Receipt preview is optional — same pattern used everywhere else in
      // the app (restaurant/grocery/clothing/universal POS): show a preview,
      // let the user print or just close it. Either way payment is already
      // recorded; printing is a courtesy step, not a requirement.
      const order = data.order
      const receiptData = buildReceiptWithBusinessInfo(
        {
          id: order.id,
          orderNumber: order.orderNumber,
          orderDate: order.paidAt || new Date().toISOString(),
          orderType: 'SALE',
          status: 'COMPLETED',
          subtotal: order.subtotal,
          taxAmount: order.taxAmount,
          discountAmount: order.discountAmount,
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          paymentStatus: 'PAID',
          customerName: order.customerName || undefined,
          customerPhone: order.customerPhone || undefined,
          items: order.items,
        },
        {
          id: job.businessId,
          name: currentBusiness?.businessName || 'Business',
          type: 'vehicle_service',
          address: currentBusiness?.address,
          phone: currentBusiness?.phone,
        }
      )
      setPendingReceiptData(receiptData)
      setShowReceiptPreview(true)
    } catch {
      setError('Connection error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75" onClick={submitting ? undefined : onClose} />
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Collect Payment</h3>
          </div>
          <div className="px-6 py-4 space-y-4 text-left">
            <div className="flex justify-between text-base font-semibold text-gray-900 dark:text-white">
              <span>Invoice {job.business_orders?.orderNumber}</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Payment Method</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button onClick={onClose} disabled={submitting} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium">
              {submitting ? 'Processing...' : `Confirm Payment ${formatCurrency(totalAmount)}`}
            </button>
          </div>
        </div>
      </div>
    </div>

    <UnifiedReceiptPreviewModal
      isOpen={showReceiptPreview}
      onClose={() => { setShowReceiptPreview(false); setPendingReceiptData(null); onPaid() }}
      receiptData={pendingReceiptData}
      businessType={'vehicle_service' as any}
      onPrintConfirm={async (options) => {
        if (!pendingReceiptData) return
        await ReceiptPrintManager.printReceipt(pendingReceiptData, 'vehicle_service' as any, { ...options, autoPrint: true })
        setShowReceiptPreview(false)
        setPendingReceiptData(null)
        onPaid()
      }}
    />
    </>
  )
}
