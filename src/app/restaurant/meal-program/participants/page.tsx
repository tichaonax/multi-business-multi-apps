'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useToastContext } from '@/components/ui/toast'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { NationalIdInput } from '@/components/ui/national-id-input'

type Participant = {
  participantRecordId: string | null
  participantType: 'EMPLOYEE' | 'EXTERNAL'
  isEnrolled: boolean
  isActive: boolean
  employeeId?: string
  personId?: string
  fullName: string
  phone: string
  nationalId?: string | null
  employeeNumber?: string
  employmentStatus?: string
  terminationDate?: string | null
  contractEndDate?: string | null
  notes?: string
  registeredAt?: string
  alreadyPurchasedToday: boolean
}

export default function ParticipantsPage() {
  const { currentBusinessId } = useBusinessPermissionsContext()
  const toast = useToastContext()

  const [tab, setTab] = useState<'EXTERNAL' | 'EMPLOYEE'>('EXTERNAL')
  const [search, setSearch] = useState('')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(false)
  const [showRegisterForm, setShowRegisterForm] = useState(false)

  // Registration form state
  const [regName, setRegName] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regNationalId, setRegNationalId] = useState('')
  const [regNationalIdTemplateId, setRegNationalIdTemplateId] = useState<string | undefined>()
  const [regNotes, setRegNotes] = useState('')
  const [registering, setRegistering] = useState(false)

  const fetchParticipants = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/restaurant/meal-program/participants?businessId=${currentBusinessId}&search=${encodeURIComponent(search)}&type=${tab}`
      )
      const data = await res.json()
      if (data.success) setParticipants(data.data)
    } catch {
      toast.push('Failed to load participants', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, search, tab, toast])

  useEffect(() => {
    const t = setTimeout(fetchParticipants, 300)
    return () => clearTimeout(t)
  }, [fetchParticipants])

  async function handleToggleActive(participant: Participant) {
    // Auto-enrolled employee (no explicit DB record) — create a deactivated record
    if (participant.participantType === 'EMPLOYEE' && !participant.participantRecordId) {
      try {
        const res = await fetch('/api/restaurant/meal-program/participants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: currentBusinessId, employeeId: participant.employeeId, isActive: false }),
        })
        const data = await res.json()
        if (!res.ok) { toast.push(data.error || 'Failed to deactivate', { type: 'error' }); return }
        toast.push('Employee deactivated from meal program', { type: 'success' })
        fetchParticipants()
      } catch {
        toast.push('Failed to deactivate employee', { type: 'error' })
      }
      return
    }
    if (!participant.participantRecordId) return
    try {
      const res = await fetch(
        `/api/restaurant/meal-program/participants/${participant.participantRecordId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !participant.isActive }),
        }
      )
      if (res.ok) {
        toast.push(participant.isActive ? 'Participant deactivated' : 'Participant reactivated', { type: 'success' })
        fetchParticipants()
      }
    } catch {
      toast.push('Failed to update participant', { type: 'error' })
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!currentBusinessId) return
    setRegistering(true)
    try {
      const res = await fetch('/api/restaurant/meal-program/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusinessId,
          personData: { fullName: regName, phone: regPhone, nationalId: regNationalId || undefined },
          notes: regNotes || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.push(`${regName} registered successfully`, { type: 'success' })
        setShowRegisterForm(false)
        setRegName('')
        setRegPhone('')
        setRegNationalId('')
        setRegNationalIdTemplateId(undefined)
        setRegNotes('')
        setTab('EXTERNAL')
        fetchParticipants()
      } else {
        toast.push(data.error || 'Registration failed', { type: 'error' })
      }
    } catch {
      toast.push('Registration failed', { type: 'error' })
    } finally {
      setRegistering(false)
    }
  }

  const filteredParticipants = participants // already filtered by API

  return (
    <ProtectedRoute>
      <BusinessTypeRoute requiredBusinessType="restaurant">
        <ContentLayout
          title="👥 Meal Program Participants"
          breadcrumb={[
            { label: 'Restaurant', href: '/restaurant' },
            { label: 'Meal Program', href: '/restaurant/meal-program' },
            { label: 'Participants', isActive: true },
          ]}
        >
          {/* Tab bar + actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex gap-2">
              {(['EXTERNAL', 'EMPLOYEE'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tab === t
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-secondary hover:text-primary'
                  }`}
                >
                  {t === 'EXTERNAL' ? '🏷️ External Persons' : '👔 Employees'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, employee #…"
                className="px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 w-56"
              />
              {tab === 'EXTERNAL' && (
                <button
                  onClick={() => setShowRegisterForm(true)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  + Register Person
                </button>
              )}
            </div>
          </div>

          {/* Registration form */}
          {showRegisterForm && (
            <div className="card p-6 mb-6 border-2 border-amber-300 dark:border-amber-700">
              <h3 className="font-semibold text-primary mb-4">Register New External Participant</h3>
              <form onSubmit={handleRegister} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div>
                  <PhoneNumberInput
                    label="Phone"
                    required
                    value={regPhone}
                    onChange={(full) => setRegPhone(full)}
                  />
                </div>
                <div>
                  <NationalIdInput
                    label="National ID (optional)"
                    value={regNationalId}
                    templateId={regNationalIdTemplateId}
                    onChange={(id, tid) => { setRegNationalId(id); setRegNationalIdTemplateId(tid) }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Notes (optional)
                  </label>
                  <input
                    type="text"
                    value={regNotes}
                    onChange={(e) => setRegNotes(e.target.value)}
                    placeholder="e.g. Child of John Doe"
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div className="sm:col-span-2 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowRegisterForm(false)}
                    className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={registering}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                  >
                    {registering ? 'Registering…' : 'Register'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Participants table */}
          {loading ? (
            <div className="text-center py-12 text-secondary">Loading…</div>
          ) : filteredParticipants.length === 0 ? (
            <div className="text-center py-12 card">
              <div className="text-4xl mb-3">👥</div>
              <p className="text-secondary">
                {search ? 'No participants match your search.' : tab === 'EXTERNAL'
                  ? 'No external participants registered yet. Click "Register Person" to add one.'
                  : 'No employees found for this business.'}
              </p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left px-4 py-3 font-medium text-secondary">Name</th>
                    {tab === 'EMPLOYEE' && (
                      <th className="text-left px-4 py-3 font-medium text-secondary">Emp #</th>
                    )}
                    <th className="text-left px-4 py-3 font-medium text-secondary">Phone</th>
                    <th className="text-left px-4 py-3 font-medium text-secondary">Today</th>
                    <th className="text-left px-4 py-3 font-medium text-secondary">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map((p, i) => (
                    <tr
                      key={p.participantRecordId || p.employeeId || i}
                      className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                    >
                      <td className="px-4 py-3 font-medium text-primary">
                        {p.fullName}
                        {p.notes && (
                          <span className="ml-2 text-xs text-secondary">({p.notes})</span>
                        )}
                        {p.employmentStatus === 'terminated' && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">Terminated</span>
                        )}
                        {p.contractEndDate && new Date(p.contractEndDate) < new Date() && p.employmentStatus !== 'terminated' && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">Contract expired</span>
                        )}
                        {p.contractEndDate && new Date(p.contractEndDate) >= new Date() && new Date(p.contractEndDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">Contract ending soon</span>
                        )}
                      </td>
                      {tab === 'EMPLOYEE' && (
                        <td className="px-4 py-3 text-secondary">{p.employeeNumber}</td>
                      )}
                      <td className="px-4 py-3 text-secondary">{p.phone}</td>
                      <td className="px-4 py-3">
                        {p.alreadyPurchasedToday ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-medium">
                            ⛔ Used today
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                            ✅ Eligible
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.isActive
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                          }`}
                        >
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.participantRecordId ? (
                          <button
                            onClick={() => handleToggleActive(p)}
                            className={`text-xs px-2 py-1 border rounded transition-colors ${
                              p.isActive
                                ? 'hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                                : 'hover:bg-green-50 dark:hover:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400'
                            }`}
                          >
                            {p.isActive ? 'Deactivate' : 'Reactivate'}
                          </button>
                        ) : p.participantType === 'EMPLOYEE' ? (
                          <button
                            onClick={() => handleToggleActive(p)}
                            className="text-xs px-2 py-1 border rounded transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
                          >
                            Deactivate
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ContentLayout>
      </BusinessTypeRoute>
    </ProtectedRoute>
  )
}
