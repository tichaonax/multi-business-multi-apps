'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { CustomerQuickRegister } from '@/components/pos/customer-quick-register'
import { ListSearchFilterBar } from '@/components/ui/list-search-filter-bar'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { getPresetDateRange, type DatePreset } from '@/lib/date-presets'

interface JobListItem {
  id: string
  status: string
  vehicleMake: string | null
  vehicleModel: string | null
  vehiclePlate: string | null
  orderId: string | null
  createdAt: string
  jobCardPrintedAt: string | null
  jobCardReturnedAt: string | null
  vehicleReleasedAt: string | null
  primaryContractorName: string | null
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
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
      <VehicleServiceJobsPageContent />
    </Suspense>
  )
}

function VehicleServiceJobsPageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentBusinessId, currentBusiness } = useBusinessPermissionsContext()

  const [jobs, setJobs] = useState<JobListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Deep link from elsewhere (e.g. the Customers page "Start a Job") — pre-selects
  // a customer and opens New Job immediately, no re-searching required.
  const [showAddModal, setShowAddModal] = useState(() => !!searchParams.get('newJobCustomerId'))
  const [initialCustomer] = useState(() => {
    const id = searchParams.get('newJobCustomerId')
    if (!id) return null
    return {
      id,
      name: searchParams.get('newJobCustomerName') || '',
      phone: searchParams.get('newJobCustomerPhone') || null,
    }
  })
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState(() => searchParams.get('search') || '')
  const [contractorFilter, setContractorFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [datePreset, setDatePreset] = useState<DatePreset>('')
  const [filterContractors, setFilterContractors] = useState<Array<{ id: string; fullName: string }>>([])

  const fetchJobs = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ businessId: currentBusinessId })
      if (statusFilter) params.append('status', statusFilter)
      if (search) params.append('search', search)
      if (contractorFilter) params.append('contractorId', contractorFilter)
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)
      const res = await fetch(`/api/vehicle-service/jobs?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load jobs')
      setJobs(data.jobs || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, statusFilter, search, contractorFilter, dateFrom, dateTo])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  useEffect(() => {
    if (!currentBusinessId) return
    fetch(`/api/vehicle-service/contractors?businessId=${currentBusinessId}&status=active`)
      .then(res => res.ok ? res.json() : { contractors: [] })
      .then(data => setFilterContractors((data.contractors || []).map((c: any) => ({ id: c.id, fullName: c.fullName }))))
      .catch(() => setFilterContractors([]))
  }, [currentBusinessId])

  function applyDatePreset(preset: 'today' | 'yesterday' | 'week' | 'month') {
    const { from, to } = getPresetDateRange(preset)
    setDateFrom(from)
    setDateTo(to)
    setDatePreset(preset)
  }

  function handleDateFromChange(iso: string) {
    setDateFrom(iso)
    const newTo = (!dateTo || iso > dateTo) ? iso : dateTo
    setDateTo(newTo)
    setDatePreset('custom')
  }

  function handleDateToChange(iso: string) {
    setDateTo(iso)
    setDatePreset('custom')
  }

  function clearDateFilters() {
    setDateFrom('')
    setDateTo('')
    setDatePreset('')
  }

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
        <ListSearchFilterBar
          onSearchChange={setSearch}
          searchLoading={loading}
          searchPlaceholder="Search by customer, contractor, vehicle, or service (e.g. oil change)..."
          initialValue={search}
          dateFrom={dateFrom}
          dateTo={dateTo}
          datePreset={datePreset}
          onPresetClick={applyDatePreset}
          onFromChange={handleDateFromChange}
          onToChange={handleDateToChange}
          onClearDates={clearDateFilters}
          extraFilters={
            <div className="w-48">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Contractor</label>
              <SearchableSelect
                options={filterContractors.map(c => ({ value: c.id, name: c.fullName }))}
                value={contractorFilter}
                onChange={setContractorFilter}
                placeholder="All contractors"
                searchPlaceholder="Search contractors..."
                allLabel="All contractors"
              />
            </div>
          }
        />

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
          <div className="flex items-center gap-2">
            <Link
              href="/vehicle-service/customers"
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-medium"
            >
              🧑‍🤝‍🧑 Customers
            </Link>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              + New Job
            </button>
          </div>
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
                  {['Vehicle', 'Customer', 'Primary Contractor', 'Status', 'Tasks', 'Total', 'Created'].map(h => (
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
                      {j.jobCardPrintedAt && (
                        <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full" title={`Printed ${new Date(j.jobCardPrintedAt).toLocaleString()}`}>
                          🖨️ Printed
                        </span>
                      )}
                      {j.jobCardReturnedAt && (
                        <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-medium bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-full" title={`Returned ${new Date(j.jobCardReturnedAt).toLocaleString()}`}>
                          ↩️ Returned
                        </span>
                      )}
                      {j.vehicleReleasedAt && (
                        <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                          ✓ Released
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {j.customerName || 'Walk-in'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {j.primaryContractorName || '—'}
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
          businessName={currentBusiness?.businessName || 'Business'}
          businessPhone={currentBusiness?.phone}
          initialCustomer={initialCustomer}
          onClose={() => setShowAddModal(false)}
          onCreated={(jobId) => router.push(`/vehicle-service/jobs/${jobId}`)}
        />
      )}
    </ContentLayout>
  )
}

function NewJobModal({ businessId, businessName, businessPhone, initialCustomer, onClose, onCreated }: {
  businessId: string; businessName: string; businessPhone?: string
  initialCustomer?: { id: string; name: string; phone: string | null } | null
  onClose: () => void; onCreated: (jobId: string) => void
}) {
  const [form, setForm] = useState({ vehicleMake: '', vehicleModel: '', vehiclePlate: '', vehicleVin: '', notes: '' })
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerResults, setCustomerResults] = useState<any[]>([])
  const [crossBusinessResults, setCrossBusinessResults] = useState<any[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<any>(initialCustomer ?? null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contractors, setContractors] = useState<Array<{ id: string; personId: string; fullName: string }>>([])
  const [primaryContractorId, setPrimaryContractorId] = useState('')
  const [personSearchResults, setPersonSearchResults] = useState<Array<{ id: string; fullName: string; phone: string }>>([])
  const [showNewContractorForm, setShowNewContractorForm] = useState(false)
  const [newContractorForm, setNewContractorForm] = useState({ fullName: '', phone: '', nationalId: '' })
  const [creatingContractor, setCreatingContractor] = useState(false)
  const [contractorFormError, setContractorFormError] = useState<string | null>(null)
  const [existingPersonMatch, setExistingPersonMatch] = useState<{ id: string; fullName: string } | null>(null)
  const [vehicleMakes, setVehicleMakes] = useState<string[]>([])
  const [vehiclePairs, setVehiclePairs] = useState<Array<{ make: string; model: string }>>([])
  const [showQuickRegister, setShowQuickRegister] = useState(false)

  useEffect(() => {
    if (!customerQuery.trim() || selectedCustomer) { setCustomerResults([]); setCrossBusinessResults([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/universal/customers?businessId=${businessId}&search=${encodeURIComponent(customerQuery)}&limit=5&crossBusiness=true`)
      if (res.ok) {
        const data = await res.json()
        setCustomerResults(data.customers || data.data || [])
        setCrossBusinessResults(data.crossBusinessMatches || [])
      }
    }, 300)
    return () => clearTimeout(t)
  }, [customerQuery, businessId, selectedCustomer])

  // Phone numbers uniquely identify a customer system-wide (see MBM-264 follow-up) —
  // a match found at another business is the SAME customer record, selected as-is,
  // not copied into a new row for this business.
  const handleUseOtherBusinessCustomer = (match: any) => {
    setSelectedCustomer(match)
    setCustomerResults([])
    setCrossBusinessResults([])
  }

  useEffect(() => {
    fetch(`/api/vehicle-service/contractors?businessId=${businessId}&status=active`)
      .then(res => res.ok ? res.json() : { contractors: [] })
      .then(data => setContractors((data.contractors || []).map((c: any) => ({ id: c.id, personId: c.personId, fullName: c.fullName }))))
      .catch(() => setContractors([]))

    fetch(`/api/vehicle-service/vehicle-suggestions?businessId=${businessId}`)
      .then(res => res.ok ? res.json() : { makes: [], pairs: [] })
      .then(data => { setVehicleMakes(data.makes || []); setVehiclePairs(data.pairs || []) })
      .catch(() => {})
  }, [businessId])

  // Model can only be created attached to a Make — the picker is scoped to
  // whichever make is currently selected and disabled until one is chosen.
  const modelsForSelectedMake = form.vehicleMake
    ? Array.from(new Set(vehiclePairs.filter(p => p.make === form.vehicleMake).map(p => p.model)))
    : []

  // Global person search (Persons has no businessId — search everywhere) so an
  // existing individual can be reused as a contractor instead of duplicated
  // (see MBM-264 follow-up — same standard as customer/contractor consistency).
  const handleContractorSearchQuery = (query: string) => {
    if (!query.trim()) { setPersonSearchResults([]); return }
    fetch(`/api/persons?search=${encodeURIComponent(query.trim())}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setPersonSearchResults((Array.isArray(data) ? data : []).map((p: any) => ({ id: p.id, fullName: p.fullName, phone: p.phone }))))
      .catch(() => setPersonSearchResults([]))
  }

  const existingContractorPersonIds = new Set(contractors.map(c => c.personId))
  const contractorOptions = [
    ...contractors.map(c => ({ value: `contractor:${c.id}`, name: c.fullName })),
    ...personSearchResults
      .filter(p => !existingContractorPersonIds.has(p.id))
      .map(p => ({ value: `person:${p.id}`, name: `${p.fullName} — not yet a contractor here` })),
  ]

  const handleUseExistingPerson = async (personId: string, fullName: string) => {
    setContractorFormError(null)
    try {
      const res = await fetch('/api/vehicle-service/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, personId }),
      })
      const data = await res.json()
      if (!res.ok) { setContractorFormError(data.error || `Failed to add ${fullName} as a contractor`); return }
      const newContractor = { id: data.contractor.id, personId, fullName: data.contractor.persons?.fullName ?? fullName }
      setContractors(prev => [...prev, newContractor])
      setPrimaryContractorId(newContractor.id)
      setExistingPersonMatch(null)
      setShowNewContractorForm(false)
    } catch {
      setContractorFormError('Connection error — please try again')
    }
  }

  const handleContractorChange = (val: string) => {
    if (val.startsWith('contractor:')) {
      setPrimaryContractorId(val.slice('contractor:'.length))
    } else if (val.startsWith('person:')) {
      const personId = val.slice('person:'.length)
      const person = personSearchResults.find(p => p.id === personId)
      if (person) handleUseExistingPerson(personId, person.fullName)
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
        body: JSON.stringify({ businessId, personId: person.id }),
      })
      const contractorData = await contractorRes.json()
      if (!contractorRes.ok) { setContractorFormError(contractorData.error || 'Failed to create contractor'); return }

      const newContractor = { id: contractorData.contractor.id, personId: person.id, fullName: contractorData.contractor.persons?.fullName ?? newContractorForm.fullName.trim() }
      setContractors(prev => [...prev, newContractor])
      setPrimaryContractorId(newContractor.id)
      setShowNewContractorForm(false)
      setNewContractorForm({ fullName: '', phone: '', nationalId: '' })
    } catch {
      setContractorFormError('Connection error — please try again')
    } finally {
      setCreatingContractor(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!primaryContractorId) { setError('Select a primary contractor for this job'); return }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/vehicle-service/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          primaryContractorId,
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
                ) : showQuickRegister ? (
                  <CustomerQuickRegister
                    businessId={businessId}
                    businessName={businessName}
                    businessPhone={businessPhone}
                    onCreated={(c: any) => { setSelectedCustomer(c); setShowQuickRegister(false) }}
                    onCancel={() => setShowQuickRegister(false)}
                  />
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
                    {customerQuery.trim() && customerResults.length === 0 && crossBusinessResults.length === 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        No match. <button type="button" onClick={() => setShowQuickRegister(true)} className="text-blue-600 dark:text-blue-400 hover:underline">Register a new customer</button>
                      </p>
                    )}
                    {customerResults.length === 0 && crossBusinessResults.length > 0 && (
                      <div className="mt-1 border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50 dark:bg-amber-900/10 p-2 space-y-1.5">
                        <p className="text-[11px] text-amber-700 dark:text-amber-400">Not a customer here yet, but found elsewhere:</p>
                        {crossBusinessResults.map((c: any) => (
                          <div key={c.id} className="flex items-center justify-between gap-2 text-sm bg-white dark:bg-gray-800 rounded px-2 py-1.5">
                            <span>
                              {c.name} {c.phone && <span className="text-xs text-gray-400">({c.phone})</span>}
                              <span className="block text-[10px] text-gray-400">at {c.sourceBusinessName}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUseOtherBusinessCustomer(c)}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                            >
                              Use This Customer
                            </button>
                          </div>
                        ))}
                        <button type="button" onClick={() => setShowQuickRegister(true)} className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline">
                          Or register as a new customer
                        </button>
                      </div>
                    )}
                    {!customerQuery.trim() && (
                      <button type="button" onClick={() => setShowQuickRegister(true)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1">
                        + New Customer
                      </button>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Primary Contractor *</label>
                {showNewContractorForm ? (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 bg-gray-50 dark:bg-gray-900">
                    {existingPersonMatch ? (
                      <>
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                          <span className="font-medium">{existingPersonMatch.fullName}</span> already exists with that phone/national ID — reuse them instead of creating a duplicate.
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleUseExistingPerson(existingPersonMatch.id, existingPersonMatch.fullName)}
                            className="flex-1 py-1.5 px-3 rounded-md text-xs font-medium text-white bg-teal-600 hover:bg-teal-700"
                          >
                            Use {existingPersonMatch.fullName}
                          </button>
                          <button
                            type="button"
                            onClick={() => setExistingPersonMatch(null)}
                            className="py-1.5 px-3 rounded-md text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            Back
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">New Contractor</p>
                        <input
                          type="text" placeholder="Full name *" value={newContractorForm.fullName}
                          onChange={e => setNewContractorForm({ ...newContractorForm, fullName: e.target.value })}
                          className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <input
                          type="text" placeholder="Phone *" value={newContractorForm.phone}
                          onChange={e => setNewContractorForm({ ...newContractorForm, phone: e.target.value })}
                          className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <input
                          type="text" placeholder="National ID *" value={newContractorForm.nationalId}
                          onChange={e => setNewContractorForm({ ...newContractorForm, nationalId: e.target.value })}
                          className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        {contractorFormError && <p className="text-xs text-red-600 dark:text-red-400">{contractorFormError}</p>}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleCreateContractor}
                            disabled={creatingContractor}
                            className="flex-1 py-1.5 px-3 rounded-md text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                          >
                            {creatingContractor ? 'Creating…' : 'Create & Select'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowNewContractorForm(false); setContractorFormError(null) }}
                            className="py-1.5 px-3 rounded-md text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-400">New contractors aren't authorized for any services yet — set that up from the Contractors page before assigning tasks.</p>
                      </>
                    )}
                  </div>
                ) : (
                  <SearchableSelect
                    options={contractorOptions}
                    value={primaryContractorId ? `contractor:${primaryContractorId}` : ''}
                    onChange={handleContractorChange}
                    onSearchQuery={handleContractorSearchQuery}
                    onCreateNew={q => { setNewContractorForm({ fullName: q, phone: '', nationalId: '' }); setShowNewContractorForm(true) }}
                    createNewLabel={q => `+ New Contractor: "${q}"`}
                    placeholder="Search contractors..."
                    searchPlaceholder="Search by name (also checks everyone in the system)..."
                    emptyMessage="No active contractors here yet"
                    required
                  />
                )}
                <p className="text-[10px] text-gray-400 mt-0.5">Who the job card is handed to — individual tasks can still go to other contractors.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Vehicle Make</label>
                <SearchableSelect
                  options={vehicleMakes.map(m => ({ value: m, name: m }))}
                  value={form.vehicleMake}
                  onChange={v => setForm({ ...form, vehicleMake: v, vehicleModel: '' })}
                  placeholder="Select or add a make..."
                  emptyMessage="No makes recorded yet"
                  onCreateNew={q => {
                    setForm({ ...form, vehicleMake: q, vehicleModel: '' })
                    if (!vehicleMakes.includes(q)) setVehicleMakes(prev => [...prev, q].sort())
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Vehicle Model</label>
                <SearchableSelect
                  options={modelsForSelectedMake.map(m => ({ value: m, name: m }))}
                  value={form.vehicleModel}
                  onChange={v => setForm({ ...form, vehicleModel: v })}
                  placeholder={form.vehicleMake ? 'Select or add a model...' : 'Pick a make first'}
                  emptyMessage="No models recorded for this make yet"
                  disabled={!form.vehicleMake}
                  onCreateNew={q => {
                    setForm({ ...form, vehicleModel: q })
                    if (form.vehicleMake && !modelsForSelectedMake.includes(q)) {
                      setVehiclePairs(prev => [...prev, { make: form.vehicleMake, model: q }])
                    }
                  }}
                />
                <p className="text-[10px] text-gray-400 mt-0.5">Models are attached to a make — pick or add the make first.</p>
              </div>
              {[
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
