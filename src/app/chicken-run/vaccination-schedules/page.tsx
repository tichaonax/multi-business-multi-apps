'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
const LABEL_CLS = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
const SUBMIT_CLS = 'px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50'
const TH_CLS = 'text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider py-2 px-3'
const TD_CLS = 'py-2 px-3 text-sm text-gray-900 dark:text-gray-100'

export default function VaccinationSchedulesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const alert = useAlert()
  const confirm = useConfirm()
  const { currentBusinessId } = useBusinessPermissionsContext()

  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', dayAge: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  const fetchSchedules = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/chicken-run/vaccination-schedules?businessId=${currentBusinessId}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load schedules')
      setSchedules(json.data || [])
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, alert])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
  }, [session, status, router])

  useEffect(() => {
    if (currentBusinessId) fetchSchedules()
  }, [currentBusinessId, fetchSchedules])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentBusinessId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/chicken-run/vaccination-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ businessId: currentBusinessId, ...form, dayAge: Number(form.dayAge) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create schedule')
      setForm({ name: '', dayAge: '', notes: '' })
      fetchSchedules()
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: 'Delete Schedule',
      description: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
    })
    if (!confirmed) return
    try {
      const res = await fetch(`/api/chicken-run/vaccination-schedules/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to delete schedule')
      fetchSchedules()
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    )
  }
  if (!session) return null

  return (
    <ContentLayout title="Vaccination Schedules">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <Link href="/chicken-run" className="hover:text-gray-700 dark:hover:text-gray-200">Chicken Run</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100">Vaccination Schedules</span>
        </nav>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Vaccination Schedules</h1>

        {/* Add New Schedule Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Add New Schedule</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Vaccine Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className={INPUT_CLS}
                placeholder="e.g. Newcastle Disease"
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Day Age (day of flock life)</label>
              <input
                type="number"
                required
                min={0}
                value={form.dayAge}
                onChange={e => setForm(p => ({ ...p, dayAge: e.target.value }))}
                className={INPUT_CLS}
                placeholder="e.g. 7"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLS}>Notes (optional)</label>
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                className={INPUT_CLS}
                placeholder="Additional notes about this vaccination"
              />
            </div>
          </div>
          <button type="submit" disabled={submitting} className={SUBMIT_CLS}>
            {submitting ? 'Adding...' : 'Add Schedule'}
          </button>
        </form>

        {/* Schedules List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Schedules ({schedules.length})
          </h2>
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
          ) : schedules.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className={TH_CLS}>Vaccine</th>
                    <th className={TH_CLS}>Day Age</th>
                    <th className={TH_CLS}>Notes</th>
                    <th className={TH_CLS}></th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s: any) => (
                    <tr key={s.id} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className={TD_CLS}>{s.name}</td>
                      <td className={TD_CLS}>Day {s.dayAge}</td>
                      <td className={TD_CLS}>{s.notes || '—'}</td>
                      <td className="py-2 px-3">
                        <button
                          onClick={() => handleDelete(s.id, s.name)}
                          className="text-xs text-red-600 dark:text-red-400 hover:underline"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No vaccination schedules yet. Add one above.</p>
          )}
        </div>
      </div>
    </ContentLayout>
  )
}
