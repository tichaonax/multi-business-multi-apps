'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { generatePaymentVoucherPdf } from '@/components/expense-account/payment-voucher-pdf'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { NationalIdInput } from '@/components/ui/national-id-input'
import { formatPhoneNumberForDisplay } from '@/lib/country-codes'

interface ContractorListItem {
  id: string
  status: string
  notes: string | null
  createdAt: string
  fullName: string
  phone: string
  email: string | null
  hasLogin: boolean
  loginEmail: string | null
  skillCount: number
  serviceCount: number
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  retired: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  disabled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export default function VehicleServiceContractorsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { currentBusinessId, currentBusiness, hasPermission, isSystemAdmin } = useBusinessPermissionsContext()

  const [contractors, setContractors] = useState<ContractorListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedContractorId, setSelectedContractorId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')

  const canManage = isSystemAdmin || hasPermission('canManageEmployees')

  const fetchContractors = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ businessId: currentBusinessId })
      if (statusFilter) params.append('status', statusFilter)
      const res = await fetch(`/api/vehicle-service/contractors?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load contractors')
      setContractors(data.contractors || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, statusFilter])

  useEffect(() => { fetchContractors() }, [fetchContractors])

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading...</div>
  }
  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <ContentLayout title="Contractors" subtitle="Manage vehicle service contractors, skills, authorized services, and login access">
      <div className="max-w-6xl mx-auto">
        {!canManage ? (
          <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-800 dark:text-yellow-300">
            You don't have permission to manage contractors.
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {(['', 'active', 'retired', 'disabled'] as const).map(s => (
                  <button
                    key={s || 'all'}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      statusFilter === s
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
              >
                + Add Contractor
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

            {!loading && contractors.length === 0 && !error && (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow text-gray-500 dark:text-gray-400">
                No contractors yet. Click "Add Contractor" to register one.
              </div>
            )}

            {!loading && contractors.length > 0 && (
              <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      {['Name', 'Contact', 'Status', 'Skills', 'Services', 'Login', ''].map(h => (
                        <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {contractors.map(c => (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedContractorId(c.id)}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{c.fullName}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                          <div>{formatPhoneNumberForDisplay(c.phone)}</div>
                          {c.email && <div className="text-xs text-gray-400">{c.email}</div>}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_STYLES[c.status] || ''}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{c.skillCount}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{c.serviceCount}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm">
                          {c.hasLogin
                            ? <span className="text-green-600 dark:text-green-400">✓ {c.loginEmail}</span>
                            : <span className="text-gray-400">Not set up</span>}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-right text-sm">
                          <span className="text-blue-600 dark:text-blue-400 hover:underline">Manage</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {showAddModal && currentBusinessId && (
        <AddContractorModal
          businessId={currentBusinessId}
          onClose={() => setShowAddModal(false)}
          onCreated={() => { setShowAddModal(false); fetchContractors() }}
        />
      )}

      {selectedContractorId && (
        <ContractorDetailModal
          contractorId={selectedContractorId}
          businessId={currentBusinessId!}
          businessName={currentBusiness?.businessName || 'Business'}
          creatorName={session?.user?.name || 'Manager'}
          onClose={() => setSelectedContractorId(null)}
          onChanged={fetchContractors}
        />
      )}
    </ContentLayout>
  )
}

function AddContractorModal({ businessId, onClose, onCreated }: { businessId: string; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', nationalId: '', idFormatTemplateId: '', address: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingPersonMatch, setExistingPersonMatch] = useState<{ id: string; fullName: string } | null>(null)

  // Search first — Persons has no businessId, it's already one shared identity
  // system-wide, so check for the person before offering to create a new one
  // (same standard as customer/contractor search elsewhere — see MBM-264 follow-up).
  const [lookupQuery, setLookupQuery] = useState('')
  const [lookupResults, setLookupResults] = useState<any[]>([])
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [addingPersonId, setAddingPersonId] = useState<string | null>(null)

  useEffect(() => {
    if (!lookupQuery.trim()) { setLookupResults([]); return }
    const t = setTimeout(() => {
      fetch(`/api/persons?search=${encodeURIComponent(lookupQuery.trim())}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setLookupResults(Array.isArray(data) ? data : []))
        .catch(() => setLookupResults([]))
    }, 300)
    return () => clearTimeout(t)
  }, [lookupQuery])

  const handleUsePerson = async (personId: string) => {
    setAddingPersonId(personId)
    setError(null)
    try {
      const res = await fetch('/api/vehicle-service/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, personId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to add contractor'); return }
      onCreated()
    } catch {
      setError('Connection error — please try again')
    } finally {
      setAddingPersonId(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName.trim() || !form.phone.trim() || !form.nationalId.trim()) {
      setError('Full name, phone, and national ID are required')
      return
    }
    setSubmitting(true)
    setError(null)
    setExistingPersonMatch(null)
    try {
      const personRes = await fetch('/api/persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          phone: form.phone,
          email: form.email || undefined,
          nationalId: form.nationalId,
          idFormatTemplateId: form.idFormatTemplateId || undefined,
          address: form.address || undefined,
          notes: form.notes || undefined,
        }),
      })
      const person = await personRes.json()
      if (personRes.status === 409 && person.existingPerson) {
        setExistingPersonMatch({ id: person.existingPerson.id, fullName: person.existingPerson.fullName })
        return
      }
      if (!personRes.ok) { setError(person.error || 'Failed to register person'); return }

      const contractorRes = await fetch('/api/vehicle-service/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, personId: person.id, notes: form.notes || undefined }),
      })
      const contractorData = await contractorRes.json()
      if (!contractorRes.ok) { setError(contractorData.error || 'Failed to create contractor'); return }

      onCreated()
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
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Add Contractor</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
          </div>

          {!showRegisterForm ? (
            <div className="px-6 py-4 space-y-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Search first — if they're already in the system (even as a contractor at another business, or a payee), reuse that record instead of creating a duplicate.
              </p>
              <input
                type="text"
                autoFocus
                value={lookupQuery}
                onChange={e => setLookupQuery(e.target.value)}
                placeholder="Search by name, phone, or national ID..."
                className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
              {lookupResults.length > 0 && (
                <div className="space-y-1.5">
                  {lookupResults.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 text-sm bg-gray-50 dark:bg-gray-900 rounded px-2 py-1.5">
                      <span>
                        {p.fullName} <span className="text-xs text-gray-400">({formatPhoneNumberForDisplay(p.phone)})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUsePerson(p.id)}
                        disabled={addingPersonId === p.id}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 shrink-0"
                      >
                        {addingPersonId === p.id ? 'Adding…' : 'Use This Person'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {lookupQuery.trim() && lookupResults.length === 0 && (
                <p className="text-xs text-gray-400">No match found.</p>
              )}
              <button
                type="button"
                onClick={() => { setForm({ ...form, fullName: lookupQuery }); setShowRegisterForm(true) }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {lookupQuery.trim() ? 'None of these — register a new contractor' : '+ Register a new contractor (skip search)'}
              </button>
            </div>
          ) : (
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
              {existingPersonMatch ? (
                <div className="border border-amber-300 dark:border-amber-700 rounded-lg p-3 bg-amber-50 dark:bg-amber-900/10 space-y-2">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    <span className="font-medium">{existingPersonMatch.fullName}</span> already exists with that phone/national ID — use their record instead of creating a duplicate.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleUsePerson(existingPersonMatch.id)}
                      className="flex-1 py-1.5 px-3 rounded-md text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"
                    >
                      Use {existingPersonMatch.fullName}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExistingPersonMatch(null)}
                      className="py-1.5 px-3 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Back
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={e => setForm({ ...form, fullName: e.target.value })}
                      className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <PhoneNumberInput
                    value={form.phone}
                    onChange={fullPhone => setForm({ ...form, phone: fullPhone })}
                    label="Phone *"
                    required
                  />
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email</label>
                    <input
                      type="text"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <NationalIdInput
                    value={form.nationalId}
                    templateId={form.idFormatTemplateId}
                    onChange={(nationalId, templateId) => setForm({ ...form, nationalId, idFormatTemplateId: templateId || '' })}
                    onTemplateChange={templateId => setForm({ ...form, idFormatTemplateId: templateId })}
                    label="National ID *"
                    required
                  />
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Address</label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={e => setForm({ ...form, address: e.target.value })}
                      className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
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
                </>
              )}
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button type="button" onClick={() => { setShowRegisterForm(false); setExistingPersonMatch(null); setError(null) }} disabled={submitting} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
                Back to Search
              </button>
              {!existingPersonMatch && (
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium">
                  {submitting ? 'Creating...' : 'Create Contractor'}
                </button>
              )}
            </div>
          </form>
          )}
        </div>
      </div>
    </div>
  )
}

interface ServiceCatalogEntry { id: string; name: string; emoji: string; services: { id: string; name: string; emoji: string | null }[] }

function ContractorDetailModal({ contractorId, businessId, businessName, creatorName, onClose, onChanged }: {
  contractorId: string; businessId: string; businessName: string; creatorName: string; onClose: () => void; onChanged: () => void
}) {
  const [contractor, setContractor] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [catalog, setCatalog] = useState<ServiceCatalogEntry[]>([])
  const [newSkill, setNewSkill] = useState({ name: '', certification: '' })
  const [newService, setNewService] = useState({ subcategoryId: '', feeAmount: '' })
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [loginAudit, setLoginAudit] = useState<Array<{ id: string; action: string; timestamp: string; performedBy: { name: string; email: string } | null; reason: string | null }>>([])
  const [showLoginAudit, setShowLoginAudit] = useState(false)
  const [revokeReason, setRevokeReason] = useState('')
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false)
  const [showResetPasswordForm, setShowResetPasswordForm] = useState(false)
  const [resetPasswordInput, setResetPasswordInput] = useState('')
  const [loginActionLoading, setLoginActionLoading] = useState(false)
  const [loginActionError, setLoginActionError] = useState<string | null>(null)
  const [payoutPeriod, setPayoutPeriod] = useState(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
    return { start, end }
  })
  const [payoutPreview, setPayoutPreview] = useState<any>(null)
  const [payoutHistory, setPayoutHistory] = useState<any[]>([])
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [payoutError, setPayoutError] = useState<string | null>(null)
  const [payoutResult, setPayoutResult] = useState<any>(null)

  const fetchContractor = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/vehicle-service/contractors/${contractorId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load contractor')
      setContractor(data.contractor)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [contractorId])

  useEffect(() => { fetchContractor() }, [fetchContractor])
  useEffect(() => {
    fetch(`/api/vehicle-service/service-catalog?businessId=${businessId}`)
      .then(res => res.ok ? res.json() : { categories: [] })
      .then(data => setCatalog(data.categories || []))
      .catch(() => setCatalog([]))
  }, [businessId])

  const fetchPayoutHistory = useCallback(async () => {
    const res = await fetch(`/api/vehicle-service/contractors/${contractorId}/payouts`)
    if (res.ok) {
      const data = await res.json()
      setPayoutHistory(data.payouts || [])
    }
  }, [contractorId])

  useEffect(() => { fetchPayoutHistory() }, [fetchPayoutHistory])

  const handlePreviewPayout = async () => {
    setPayoutLoading(true)
    setPayoutError(null)
    setPayoutPreview(null)
    try {
      const res = await fetch(`/api/vehicle-service/contractors/${contractorId}/payout-preview?periodStart=${payoutPeriod.start}&periodEnd=${payoutPeriod.end}`)
      const data = await res.json()
      if (!res.ok) { setPayoutError(data.error || 'Failed to preview payout'); return }
      setPayoutPreview(data)
    } finally {
      setPayoutLoading(false)
    }
  }

  const handleGeneratePayout = async () => {
    setPayoutLoading(true)
    setPayoutError(null)
    try {
      const res = await fetch(`/api/vehicle-service/contractors/${contractorId}/payouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodStart: payoutPeriod.start, periodEnd: payoutPeriod.end }),
      })
      const data = await res.json()
      if (!res.ok) { setPayoutError(data.error || 'Failed to generate payout'); return }
      setPayoutResult(data.payout)
      setPayoutPreview(null)
      fetchPayoutHistory()
    } finally {
      setPayoutLoading(false)
    }
  }

  const downloadVoucher = (payout: { voucherNumber: string; totalAmount: number; paymentDate?: string; notes?: string | null }) => {
    if (!contractor) return
    generatePaymentVoucherPdf({
      voucherNumber: payout.voucherNumber,
      paymentDate: payout.paymentDate || new Date().toISOString(),
      amount: Number(payout.totalAmount),
      payeeName: contractor.persons.fullName,
      payeeType: 'Contractor',
      purpose: payout.notes || 'Vehicle service contractor payout',
      collectorName: contractor.persons.fullName,
      collectorPhone: contractor.persons.phone,
      creatorName,
      businessName,
    })
  }

  const handleStatusChange = async (newStatus: string) => {
    await fetch(`/api/vehicle-service/contractors/${contractorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    fetchContractor()
    onChanged()
  }

  const handleAddSkill = async () => {
    if (!newSkill.name.trim()) return
    await fetch(`/api/vehicle-service/contractors/${contractorId}/skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSkill),
    })
    setNewSkill({ name: '', certification: '' })
    fetchContractor()
  }

  const handleRemoveSkill = async (skillId: string) => {
    await fetch(`/api/vehicle-service/contractors/${contractorId}/skills/${skillId}`, { method: 'DELETE' })
    fetchContractor()
  }

  const handleAddService = async () => {
    if (!newService.subcategoryId || !newService.feeAmount) return
    await fetch(`/api/vehicle-service/contractors/${contractorId}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subcategoryId: newService.subcategoryId, feeAmount: parseFloat(newService.feeAmount) }),
    })
    setNewService({ subcategoryId: '', feeAmount: '' })
    fetchContractor()
    onChanged()
  }

  const handleRemoveService = async (serviceId: string) => {
    await fetch(`/api/vehicle-service/contractors/${contractorId}/services/${serviceId}`, { method: 'DELETE' })
    fetchContractor()
    onChanged()
  }

  const handleCreateLogin = async () => {
    if (!loginForm.email.trim()) return
    const res = await fetch(`/api/vehicle-service/contractors/${contractorId}/provision-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginForm.email, password: loginForm.password || undefined }),
    })
    const data = await res.json()
    if (res.ok) {
      setLoginForm({ email: '', password: '' })
      if (data.temporaryPassword) setTempPassword(data.temporaryPassword)
      fetchContractor()
      onChanged()
    }
  }

  const fetchLoginAudit = useCallback(async () => {
    const res = await fetch(`/api/vehicle-service/contractors/${contractorId}/login-audit`)
    if (res.ok) {
      const data = await res.json()
      setLoginAudit(data.entries || [])
    }
  }, [contractorId])

  const handleRevokeLogin = async () => {
    setLoginActionLoading(true)
    setLoginActionError(null)
    try {
      const res = await fetch(`/api/vehicle-service/contractors/${contractorId}/revoke-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: revokeReason || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setLoginActionError(data.error || 'Failed to revoke login'); return }
      setShowRevokeConfirm(false)
      setRevokeReason('')
      fetchContractor()
      if (showLoginAudit) fetchLoginAudit()
    } finally {
      setLoginActionLoading(false)
    }
  }

  const handleReactivateLogin = async () => {
    setLoginActionLoading(true)
    setLoginActionError(null)
    try {
      const res = await fetch(`/api/vehicle-service/contractors/${contractorId}/reactivate-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) { setLoginActionError(data.error || 'Failed to reactivate login'); return }
      fetchContractor()
      if (showLoginAudit) fetchLoginAudit()
    } finally {
      setLoginActionLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (resetPasswordInput && resetPasswordInput.length < 6) {
      setLoginActionError('Password must be at least 6 characters')
      return
    }
    setLoginActionLoading(true)
    setLoginActionError(null)
    try {
      const res = await fetch(`/api/vehicle-service/contractors/${contractorId}/reset-login-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPasswordInput || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setLoginActionError(data.error || 'Failed to reset password'); return }
      if (data.temporaryPassword) setTempPassword(data.temporaryPassword)
      setResetPasswordInput('')
      setShowResetPasswordForm(false)
      if (showLoginAudit) fetchLoginAudit()
    } finally {
      setLoginActionLoading(false)
    }
  }

  const allServices = catalog.flatMap(cat => cat.services.map(s => ({ ...s, categoryName: cat.name })))
  const authorizedSubcategoryIds = new Set((contractor?.services || []).map((s: any) => s.subcategoryId))

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75" onClick={onClose} />
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {contractor?.persons?.fullName || 'Contractor'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
          </div>

          <div className="px-6 py-4 max-h-[75vh] overflow-y-auto space-y-6">
            {loading && <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            {!loading && contractor && (
              <>
                {/* Status */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Status</h4>
                  <div className="flex gap-2">
                    {['active', 'retired', 'disabled'].map(s => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                          contractor.status === s
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                  {contractor.status !== 'active' && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      {contractor.status === 'retired' ? 'Retired' : 'Disabled'} contractors cannot be assigned to new jobs.
                    </p>
                  )}
                </div>

                {/* Contact */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Contact</h4>
                  <p className="text-sm text-gray-900 dark:text-white">{formatPhoneNumberForDisplay(contractor.persons.phone)}</p>
                  {contractor.persons.email && <p className="text-sm text-gray-600 dark:text-gray-300">{contractor.persons.email}</p>}
                </div>

                {/* Skills */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Skills & Certifications</h4>
                  <div className="space-y-1 mb-2">
                    {contractor.skills.length === 0 && <p className="text-xs text-gray-400">No skills recorded</p>}
                    {contractor.skills.map((sk: any) => (
                      <div key={sk.id} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded">
                        <span>{sk.name}{sk.certification ? ` — ${sk.certification}` : ''}</span>
                        <button onClick={() => handleRemoveSkill(sk.id)} className="text-red-500 hover:underline text-xs">Remove</button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input placeholder="Skill name" value={newSkill.name} onChange={e => setNewSkill({ ...newSkill, name: e.target.value })}
                      className="flex-1 text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    <input placeholder="Certification (optional)" value={newSkill.certification} onChange={e => setNewSkill({ ...newSkill, certification: e.target.value })}
                      className="flex-1 text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    <button onClick={handleAddSkill} className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600">Add</button>
                  </div>
                </div>

                {/* Authorized services */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Authorized Services & Fees</h4>
                  <div className="space-y-1 mb-2">
                    {contractor.services.length === 0 && <p className="text-xs text-gray-400">Not authorized for any services yet</p>}
                    {contractor.services.map((sv: any) => (
                      <div key={sv.id} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded">
                        <span>{sv.subcategory.emoji} {sv.subcategory.name} — ${Number(sv.feeAmount).toFixed(2)}</span>
                        <button onClick={() => handleRemoveService(sv.id)} className="text-red-500 hover:underline text-xs">Remove</button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SearchableSelect
                        options={allServices.filter(s => !authorizedSubcategoryIds.has(s.id)).map(s => ({ value: s.id, name: `${s.categoryName} — ${s.name}` }))}
                        value={newService.subcategoryId}
                        onChange={v => setNewService({ ...newService, subcategoryId: v })}
                        placeholder="Select a service..."
                        searchPlaceholder="Search services..."
                        required
                      />
                    </div>
                    <input type="number" min="0" step="0.01" placeholder="Fee $" value={newService.feeAmount}
                      onChange={e => setNewService({ ...newService, feeAmount: e.target.value })}
                      className="w-24 text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    <button onClick={handleAddService} className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600">Add</button>
                  </div>
                </div>

                {/* Login */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Contractor Portal Login</h4>
                  {tempPassword && (
                    <div className="p-2 mb-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                      <span>Temporary password: <span className="font-mono font-semibold">{tempPassword}</span> — share securely, must be changed on first login.</span>
                      <button onClick={() => setTempPassword(null)} className="shrink-0 text-amber-600 dark:text-amber-400 hover:underline">Dismiss</button>
                    </div>
                  )}
                  {contractor.users ? (
                    <div className="space-y-2">
                      {contractor.users.isActive ? (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-green-700 dark:text-green-400">✓ Login active: {contractor.users.email}</p>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => { setShowResetPasswordForm(true); setLoginActionError(null) }}
                              className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              Reset Password
                            </button>
                            <button
                              onClick={() => { setShowRevokeConfirm(true); setLoginActionError(null) }}
                              className="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              Revoke Access
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm text-red-600 dark:text-red-400">⛔ Login revoked: {contractor.users.email}</p>
                            {contractor.users.deactivatedAt && (
                              <p className="text-xs text-gray-400">
                                {new Date(contractor.users.deactivatedAt).toLocaleString()}
                                {contractor.users.deactivationReason ? ` — ${contractor.users.deactivationReason}` : ''}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => { setShowResetPasswordForm(true); setLoginActionError(null) }}
                              className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              Reset Password
                            </button>
                            <button
                              onClick={handleReactivateLogin}
                              disabled={loginActionLoading}
                              className="px-2 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded"
                            >
                              {loginActionLoading ? 'Reactivating…' : 'Reactivate'}
                            </button>
                          </div>
                        </div>
                      )}

                      {showResetPasswordForm && (
                        <div className="p-2 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900 space-y-2">
                          <input
                            type="password" placeholder="New password (optional — leave blank to auto-generate)" value={resetPasswordInput}
                            onChange={e => setResetPasswordInput(e.target.value)}
                            className="w-full text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          <div className="flex gap-2">
                            <button onClick={handleResetPassword} disabled={loginActionLoading} className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded">
                              {loginActionLoading ? 'Resetting…' : 'Set New Password'}
                            </button>
                            <button onClick={() => { setShowResetPasswordForm(false); setResetPasswordInput('') }} disabled={loginActionLoading} className="px-3 py-1 text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {showRevokeConfirm && (
                        <div className="p-2 border border-red-200 dark:border-red-800 rounded bg-red-50 dark:bg-red-900/10 space-y-2">
                          <p className="text-xs text-red-700 dark:text-red-400">This blocks sign-in to the contractor portal immediately. Their profile, tasks, and payout history are unaffected and this can be reversed anytime.</p>
                          <input
                            type="text" placeholder="Reason (optional)" value={revokeReason}
                            onChange={e => setRevokeReason(e.target.value)}
                            className="w-full text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          <div className="flex gap-2">
                            <button onClick={handleRevokeLogin} disabled={loginActionLoading} className="px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded">
                              {loginActionLoading ? 'Revoking…' : 'Confirm Revoke'}
                            </button>
                            <button onClick={() => { setShowRevokeConfirm(false); setRevokeReason('') }} disabled={loginActionLoading} className="px-3 py-1 text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {loginActionError && <p className="text-xs text-red-600 dark:text-red-400">{loginActionError}</p>}

                      <button
                        onClick={() => { const next = !showLoginAudit; setShowLoginAudit(next); if (next) fetchLoginAudit() }}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {showLoginAudit ? '▲ Hide login history' : '▼ View login history'}
                      </button>
                      {showLoginAudit && (
                        <div className="space-y-1 border-t border-gray-100 dark:border-gray-700 pt-2">
                          {loginAudit.length === 0 && <p className="text-xs text-gray-400">No history yet.</p>}
                          {loginAudit.map(entry => (
                            <div key={entry.id} className="text-xs text-gray-600 dark:text-gray-300 flex justify-between gap-2">
                              <span>
                                {entry.action === 'CREATE' ? 'Login created' : entry.action === 'ACCOUNT_LOCKED' ? 'Access revoked' : entry.action === 'ACCOUNT_UNLOCKED' ? 'Access reactivated' : entry.action === 'PASSWORD_RESET' ? 'Password reset' : entry.action}
                                {entry.reason ? ` — ${entry.reason}` : ''}
                                {entry.performedBy ? ` (by ${entry.performedBy.name})` : ''}
                              </span>
                              <span className="text-gray-400 shrink-0">{new Date(entry.timestamp).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input placeholder="Login email" value={loginForm.email} onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                          className="flex-1 text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                        <input type="password" placeholder="Password (optional)" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                          className="flex-1 text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                        <button onClick={handleCreateLogin} className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded whitespace-nowrap">Create Login</button>
                      </div>
                      <p className="text-xs text-gray-400">Leave password blank to auto-generate a temporary one.</p>
                    </div>
                  )}
                </div>

                {/* Monthly payout */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Monthly Payout</h4>
                  <div className="flex items-end gap-2 mb-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">From</label>
                      <input type="date" value={payoutPeriod.start} onChange={e => { setPayoutPeriod({ ...payoutPeriod, start: e.target.value }); setPayoutPreview(null) }}
                        className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">To</label>
                      <input type="date" value={payoutPeriod.end} onChange={e => { setPayoutPeriod({ ...payoutPeriod, end: e.target.value }); setPayoutPreview(null) }}
                        className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                    <button onClick={handlePreviewPayout} disabled={payoutLoading} className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50">
                      Preview
                    </button>
                  </div>

                  {payoutError && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{payoutError}</p>}

                  {payoutResult && (
                    <div className="p-2 mb-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs text-green-800 dark:text-green-400 flex items-center justify-between gap-2">
                      <span>✓ Payout of ${Number(payoutResult.totalAmount).toFixed(2)} submitted for cashier approval ({payoutResult.taskCount} job{payoutResult.taskCount === 1 ? '' : 's'}).</span>
                      <button onClick={() => downloadVoucher(payoutResult)} className="shrink-0 px-2 py-1 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40">
                        Download Voucher
                      </button>
                    </div>
                  )}

                  {payoutPreview && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 mb-2 space-y-1">
                      {payoutPreview.tasks.length === 0 ? (
                        <p className="text-xs text-gray-400">No unpaid completed work in this period.</p>
                      ) : (
                        <>
                          {payoutPreview.tasks.map((t: any) => (
                            <div key={t.taskId} className="flex justify-between text-xs text-gray-700 dark:text-gray-300">
                              <span>{t.orderNumber} — {t.serviceName}{t.vehicle ? ` (${t.vehicle})` : ''}</span>
                              <span>${Number(t.amount).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-xs font-semibold text-gray-900 dark:text-white pt-1 border-t border-gray-100 dark:border-gray-700">
                            <span>Total</span>
                            <span>${Number(payoutPreview.totalAmount).toFixed(2)}</span>
                          </div>
                          <button onClick={handleGeneratePayout} disabled={payoutLoading} className="mt-1 px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded">
                            {payoutLoading ? 'Generating...' : 'Generate Payout Voucher'}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {payoutHistory.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-gray-400 uppercase mb-1">Past Payouts</p>
                      {payoutHistory.map(p => (
                        <div key={p.id} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 py-0.5 gap-2">
                          <span className="truncate">{new Date(p.periodStart).toLocaleDateString()} – {new Date(p.periodEnd).toLocaleDateString()} ({p.taskCount} jobs)</span>
                          <span className="shrink-0">${Number(p.totalAmount).toFixed(2)} — {p.paymentStatus}</span>
                          <button onClick={() => downloadVoucher(p)} className="shrink-0 text-blue-600 dark:text-blue-400 hover:underline" title="Download voucher PDF">
                            PDF
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
