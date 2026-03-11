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

const CARD_CLS = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5'
const TH_CLS = 'text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider py-2 px-3'
const TD_CLS = 'py-2 px-3 text-sm text-gray-900 dark:text-gray-100'

interface InventoryEntry {
  id: string; entryDate: string; supplier?: { id: string; name: string } | null
  quantityWhole: number; totalWeightKg: unknown; costPerBird: unknown; costPerKg: unknown; quantityInFreezer: number
}
interface InventoryGroup {
  entries: InventoryEntry[]
  totalBirds: number; totalKg: number; inFreezer: number
  totalCost?: number
}
interface ReportData {
  raised: InventoryGroup
  purchased: InventoryGroup & { totalCost: number }
  combined: { totalInFreezer: number; totalBirds: number; totalKg: number }
}

function InventoryTable({ entries, showCost }: { entries: InventoryEntry[]; showCost: boolean }) {
  if (entries.length === 0) return <p className="text-sm text-gray-400 dark:text-gray-500">No entries.</p>
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 dark:border-gray-600">
          <th className={TH_CLS}>Date</th>
          <th className={TH_CLS}>Supplier</th>
          <th className={`${TH_CLS} text-right`}>Birds</th>
          <th className={`${TH_CLS} text-right`}>Total Kg</th>
          <th className={`${TH_CLS} text-right`}>In Freezer</th>
          {showCost && <th className={`${TH_CLS} text-right`}>Cost/Kg</th>}
        </tr>
      </thead>
      <tbody>
        {entries.map(e => (
          <tr key={e.id} className="border-b border-gray-100 dark:border-gray-700">
            <td className={TD_CLS}>{formatDate(e.entryDate)}</td>
            <td className={TD_CLS}>{e.supplier?.name || '—'}</td>
            <td className={`${TD_CLS} text-right`}>{e.quantityWhole}</td>
            <td className={`${TD_CLS} text-right`}>{Number(e.totalWeightKg).toFixed(2)} kg</td>
            <td className={`${TD_CLS} text-right font-semibold`}>{e.quantityInFreezer}</td>
            {showCost && <td className={`${TD_CLS} text-right`}>{formatCurrency(Number(e.costPerKg))}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function InventoryStockReportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const alert = useAlert()
  const { currentBusinessId, isAuthenticated, loading: bizLoading } = useBusinessPermissionsContext()

  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchReport = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/chicken-run/reports/inventory?businessId=${currentBusinessId}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load report')
      setReport(json.data)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error'
      await alert({ title: 'Error', description: msg })
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, alert])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
    if (!currentBusinessId) return
    fetchReport()
  }, [session, status, router, currentBusinessId, fetchReport])

  if (status === 'loading' || bizLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" /></div>
  }
  if (!session || !isAuthenticated) return null

  return (
    <ContentLayout title="Inventory Stock Report">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <nav className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/chicken-run" className="hover:underline">Chicken Run</Link>
            <span className="mx-2">/</span>
            <Link href="/chicken-run/reports" className="hover:underline">Reports</Link>
            <span className="mx-2">/</span>
            <span>Inventory Stock</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Inventory Stock Report</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Current freezer stock by source (closed entries only)</p>
        </div>

        {loading && <div className="text-center py-8 text-gray-400">Loading report...</div>}

        {report && (
          <>
            {/* Combined summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className={CARD_CLS}>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total In Freezer</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{report.combined.totalInFreezer} birds</p>
              </div>
              <div className={CARD_CLS}>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Birds (all entries)</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{report.combined.totalBirds}</p>
              </div>
              <div className={CARD_CLS}>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Weight</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{report.combined.totalKg} kg</p>
              </div>
            </div>

            {/* Raised */}
            <div className={CARD_CLS}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Raised</h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {report.raised.inFreezer} in freezer · {report.raised.totalKg} kg total
                </span>
              </div>
              <InventoryTable entries={report.raised.entries} showCost={false} />
            </div>

            {/* Purchased */}
            <div className={CARD_CLS}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Purchased</h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {report.purchased.inFreezer} in freezer · {formatCurrency(report.purchased.totalCost)} total cost
                </span>
              </div>
              <InventoryTable entries={report.purchased.entries} showCost={true} />
            </div>
          </>
        )}
      </div>
    </ContentLayout>
  )
}
