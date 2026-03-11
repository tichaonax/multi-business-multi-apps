'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { formatDate, formatCurrency } from '@/lib/date-format'
import { useAlert } from '@/components/ui/confirm-modal'
import { DateInput } from '@/components/ui/date-input'

const todayStr = () => new Date().toISOString().split('T')[0]

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
const LABEL_CLS = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
const SUBMIT_CLS = 'px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50'
const CARD_CLS = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5'

const UTILITY_SUGGESTIONS = ['Electricity', 'Water', 'Gas', 'Diesel', 'Other']

interface UtilityCost {
  id: string
  date: string
  utilityType: string
  totalCost: string | number
  notes?: string | null
}

interface LaborLog {
  id: string
  date: string
  workerName?: string | null
  hoursWorked: string | number
  hourlyRate: string | number
  totalCost: string | number
  notes?: string | null
}

export default function CostsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const alert = useAlert()
  const { currentBusinessId, currentBusiness, isAuthenticated, loading: bizLoading } = useBusinessPermissionsContext()

  const [tab, setTab] = useState<'utility' | 'labor'>('utility')
  const [utilityCosts, setUtilityCosts] = useState<UtilityCost[]>([])
  const [laborLogs, setLaborLogs] = useState<LaborLog[]>([])
  const [totalUtility, setTotalUtility] = useState(0)
  const [totalLabor, setTotalLabor] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Utility form
  const [uForm, setUForm] = useState({ date: todayStr(), utilityType: '', totalCost: '', notes: '' })

  // Labor form
  const [lForm, setLForm] = useState({ date: todayStr(), workerName: '', hoursWorked: '', hourlyRate: '', notes: '' })
  const lComputedTotal = lForm.hoursWorked && lForm.hourlyRate
    ? (parseFloat(lForm.hoursWorked) * parseFloat(lForm.hourlyRate)).toFixed(2)
    : ''

  const fetchCosts = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/chicken-run/costs?businessId=${currentBusinessId}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load costs')
      setUtilityCosts(json.data.utilityCosts || [])
      setLaborLogs(json.data.laborLogs || [])
      setTotalUtility(json.data.totalUtility || 0)
      setTotalLabor(json.data.totalLabor || 0)
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, alert])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
    fetchCosts()
  }, [session, status, router, fetchCosts])

  async function handleUtilitySubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentBusinessId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/chicken-run/costs/utility', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusinessId,
          date: uForm.date,
          utilityType: uForm.utilityType,
          totalCost: parseFloat(uForm.totalCost),
          notes: uForm.notes || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save utility cost')
      setUForm({ date: todayStr(), utilityType: '', totalCost: '', notes: '' })
      await fetchCosts()
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLaborSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentBusinessId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/chicken-run/costs/labor', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusinessId,
          date: lForm.date,
          workerName: lForm.workerName || undefined,
          hoursWorked: parseFloat(lForm.hoursWorked),
          hourlyRate: parseFloat(lForm.hourlyRate),
          totalCost: parseFloat(lComputedTotal || '0'),
          notes: lForm.notes || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save labor log')
      setLForm({ date: todayStr(), workerName: '', hoursWorked: '', hourlyRate: '', notes: '' })
      await fetchCosts()
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading' || bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    )
  }
  if (!session || !isAuthenticated) return null

  return (
    <ContentLayout title="Chicken Run - Costs">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 dark:text-gray-400">
          <Link href="/chicken-run" className="hover:underline">Chicken Run</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 dark:text-gray-100 font-medium">Costs</span>
        </nav>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">💰 Costs</h1>
          {currentBusiness && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currentBusiness.businessName}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {(['utility', 'labor'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
                tab === t
                  ? 'border-green-600 text-green-700 dark:text-green-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t === 'utility' ? 'Utility' : 'Labor'}
            </button>
          ))}
        </div>

        {/* Utility Tab */}
        {tab === 'utility' && (
          <div className="space-y-5">
            {/* Add Form */}
            <div className={CARD_CLS}>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Add Utility Cost</h2>
              <form onSubmit={handleUtilitySubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <DateInput
                    value={uForm.date}
                    onChange={(d) => setUForm(f => ({ ...f, date: d }))}
                    label="Date"
                    required={true}
                    compact={true}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Utility Type</label>
                  <input
                    type="text"
                    list="utility-types"
                    className={INPUT_CLS}
                    placeholder="e.g. Electricity"
                    value={uForm.utilityType}
                    onChange={e => setUForm(f => ({ ...f, utilityType: e.target.value }))}
                    required
                  />
                  <datalist id="utility-types">
                    {UTILITY_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div>
                  <label className={LABEL_CLS}>Total Cost</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={INPUT_CLS}
                    placeholder="0.00"
                    value={uForm.totalCost}
                    onChange={e => setUForm(f => ({ ...f, totalCost: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Notes (optional)</label>
                  <input
                    type="text"
                    className={INPUT_CLS}
                    placeholder="Optional notes"
                    value={uForm.notes}
                    onChange={e => setUForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <button type="submit" className={SUBMIT_CLS} disabled={submitting}>
                    {submitting ? 'Saving...' : 'Add Utility Cost'}
                  </button>
                </div>
              </form>
            </div>

            {/* History */}
            <div className={CARD_CLS}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Utility History</h2>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Total: <span className="text-green-700 dark:text-green-400">{formatCurrency(totalUtility)}</span>
                </span>
              </div>
              {loading ? (
                <p className="text-center py-8 text-gray-400">Loading...</p>
              ) : utilityCosts.length === 0 ? (
                <p className="text-center py-8 text-gray-400 dark:text-gray-500">No utility costs recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                        <th className="pb-2 text-gray-500 dark:text-gray-400 font-medium">Date</th>
                        <th className="pb-2 text-gray-500 dark:text-gray-400 font-medium">Type</th>
                        <th className="pb-2 text-gray-500 dark:text-gray-400 font-medium text-right">Cost</th>
                        <th className="pb-2 text-gray-500 dark:text-gray-400 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {utilityCosts.map((c: UtilityCost) => (
                        <tr key={c.id} className="border-b border-gray-100 dark:border-gray-700/50">
                          <td className="py-2 text-gray-900 dark:text-gray-100">{formatDate(c.date)}</td>
                          <td className="py-2 text-gray-700 dark:text-gray-300">{c.utilityType}</td>
                          <td className="py-2 text-right text-gray-900 dark:text-gray-100 font-medium">{formatCurrency(Number(c.totalCost))}</td>
                          <td className="py-2 text-gray-500 dark:text-gray-400">{c.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={2} className="pt-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Total</td>
                        <td className="pt-3 text-right text-sm font-bold text-green-700 dark:text-green-400">{formatCurrency(totalUtility)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Labor Tab */}
        {tab === 'labor' && (
          <div className="space-y-5">
            {/* Add Form */}
            <div className={CARD_CLS}>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Add Labor Log</h2>
              <form onSubmit={handleLaborSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <DateInput
                    value={lForm.date}
                    onChange={(d) => setLForm(f => ({ ...f, date: d }))}
                    label="Date"
                    required={true}
                    compact={true}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Worker Name (optional)</label>
                  <input
                    type="text"
                    className={INPUT_CLS}
                    placeholder="e.g. John Doe"
                    value={lForm.workerName}
                    onChange={e => setLForm(f => ({ ...f, workerName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Hours Worked</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className={INPUT_CLS}
                    placeholder="0.0"
                    value={lForm.hoursWorked}
                    onChange={e => setLForm(f => ({ ...f, hoursWorked: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Hourly Rate</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={INPUT_CLS}
                    placeholder="0.00"
                    value={lForm.hourlyRate}
                    onChange={e => setLForm(f => ({ ...f, hourlyRate: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Total Cost (auto-computed)</label>
                  <input
                    type="text"
                    className={`${INPUT_CLS} bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed`}
                    value={lComputedTotal ? formatCurrency(parseFloat(lComputedTotal)) : '-'}
                    readOnly
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Notes (optional)</label>
                  <input
                    type="text"
                    className={INPUT_CLS}
                    placeholder="Optional notes"
                    value={lForm.notes}
                    onChange={e => setLForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <button type="submit" className={SUBMIT_CLS} disabled={submitting || !lComputedTotal}>
                    {submitting ? 'Saving...' : 'Add Labor Log'}
                  </button>
                </div>
              </form>
            </div>

            {/* History */}
            <div className={CARD_CLS}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Labor History</h2>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Total: <span className="text-green-700 dark:text-green-400">{formatCurrency(totalLabor)}</span>
                </span>
              </div>
              {loading ? (
                <p className="text-center py-8 text-gray-400">Loading...</p>
              ) : laborLogs.length === 0 ? (
                <p className="text-center py-8 text-gray-400 dark:text-gray-500">No labor logs recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                        <th className="pb-2 text-gray-500 dark:text-gray-400 font-medium">Date</th>
                        <th className="pb-2 text-gray-500 dark:text-gray-400 font-medium">Worker</th>
                        <th className="pb-2 text-gray-500 dark:text-gray-400 font-medium text-right">Hours</th>
                        <th className="pb-2 text-gray-500 dark:text-gray-400 font-medium text-right">Rate</th>
                        <th className="pb-2 text-gray-500 dark:text-gray-400 font-medium text-right">Cost</th>
                        <th className="pb-2 text-gray-500 dark:text-gray-400 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {laborLogs.map((l: LaborLog) => (
                        <tr key={l.id} className="border-b border-gray-100 dark:border-gray-700/50">
                          <td className="py-2 text-gray-900 dark:text-gray-100">{formatDate(l.date)}</td>
                          <td className="py-2 text-gray-700 dark:text-gray-300">{l.workerName || '-'}</td>
                          <td className="py-2 text-right text-gray-700 dark:text-gray-300">{Number(l.hoursWorked).toFixed(1)}h</td>
                          <td className="py-2 text-right text-gray-700 dark:text-gray-300">{formatCurrency(Number(l.hourlyRate))}</td>
                          <td className="py-2 text-right text-gray-900 dark:text-gray-100 font-medium">{formatCurrency(Number(l.totalCost))}</td>
                          <td className="py-2 text-gray-500 dark:text-gray-400">{l.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={4} className="pt-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Total</td>
                        <td className="pt-3 text-right text-sm font-bold text-green-700 dark:text-green-400">{formatCurrency(totalLabor)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ContentLayout>
  )
}
