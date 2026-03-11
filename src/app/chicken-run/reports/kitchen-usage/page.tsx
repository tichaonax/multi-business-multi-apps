'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { formatDate } from '@/lib/date-format'
import { useAlert } from '@/components/ui/confirm-modal'
import { DateInput } from '@/components/ui/date-input'

const CARD_CLS = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5'
const INPUT_CLS = 'px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
const TH_CLS = 'text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider py-2 px-3'
const TD_CLS = 'py-2 px-3 text-sm text-gray-900 dark:text-gray-100'

interface Movement {
  id: string
  inventoryId: string
  movementDate: string
  movementType: string
  quantity: number
  weightKg: unknown
  destinationBusinessId: string | null
  purpose: string | null
  source: string
}
interface Summary {
  totalKitchenOut: number
  totalTransferred: number
  raisedUsed: number
  purchasedUsed: number
}

function thirtyDaysAgoStr() {
  return new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
}
function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export default function KitchenUsageReportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const alert = useAlert()
  const { currentBusinessId, isAuthenticated, loading: bizLoading } = useBusinessPermissionsContext()

  const [startDate, setStartDate] = useState(thirtyDaysAgoStr())
  const [endDate, setEndDate] = useState(todayStr())
  const [movements, setMovements] = useState<Movement[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchReport = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ businessId: currentBusinessId, startDate, endDate })
      const res = await fetch(`/api/chicken-run/reports/kitchen-usage?${params}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load report')
      setMovements(json.data.movements || [])
      setSummary(json.data.summary || null)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error'
      await alert({ title: 'Error', description: msg })
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, startDate, endDate, alert])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
    if (!currentBusinessId) return
    fetchReport()
  }, [session, status, router, currentBusinessId, fetchReport])

  if (status === 'loading' || bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    )
  }
  if (!session || !isAuthenticated) return null

  const summaryCards = summary ? [
    { label: 'Total Kitchen Out', value: `${summary.totalKitchenOut} birds` },
    { label: 'Total Transferred', value: `${summary.totalTransferred} birds` },
    { label: 'Raised Used', value: `${summary.raisedUsed} birds` },
    { label: 'Purchased Used', value: `${summary.purchasedUsed} birds` },
  ] : []

  return (
    <ContentLayout title="Kitchen Usage Report">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <nav className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/chicken-run" className="hover:underline">Chicken Run</Link>
            <span className="mx-2">/</span>
            <Link href="/chicken-run/reports" className="hover:underline">Reports</Link>
            <span className="mx-2">/</span>
            <span>Kitchen Usage</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Kitchen Usage</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Transfer history by source and business</p>
        </div>

        <div className={CARD_CLS}>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <DateInput
                value={startDate}
                onChange={(d) => setStartDate(d)}
                label="Start Date"
                compact={true}
              />
            </div>
            <div>
              <DateInput
                value={endDate}
                onChange={(d) => setEndDate(d)}
                label="End Date"
                compact={true}
              />
            </div>
            <button
              onClick={fetchReport}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Apply'}
            </button>
          </div>
        </div>

        {summaryCards.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {summaryCards.map(c => (
              <div key={c.label} className={CARD_CLS}>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{c.label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{c.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className={CARD_CLS}>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Movements</h2>
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : movements.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">No movements found in this date range.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className={TH_CLS}>Date</th>
                  <th className={`${TH_CLS} text-right`}>Qty</th>
                  <th className={`${TH_CLS} text-right`}>Weight</th>
                  <th className={TH_CLS}>Type</th>
                  <th className={TH_CLS}>Source</th>
                  <th className={TH_CLS}>Purpose</th>
                  <th className={TH_CLS}>Destination</th>
                </tr>
              </thead>
              <tbody>
                {movements.map(m => (
                  <tr key={m.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className={TD_CLS}>{formatDate(m.movementDate)}</td>
                    <td className={`${TD_CLS} text-right`}>{m.quantity}</td>
                    <td className={`${TD_CLS} text-right`}>{m.weightKg ? `${Number(m.weightKg).toFixed(2)} kg` : '—'}</td>
                    <td className={TD_CLS}>{m.movementType.replace('_', ' ')}</td>
                    <td className={TD_CLS}>{m.source}</td>
                    <td className={TD_CLS}>{m.purpose || '—'}</td>
                    <td className={TD_CLS}>{m.destinationBusinessId || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ContentLayout>
  )
}
