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

const STATUS_STYLES: Record<string, string> = {
  GROWING:   'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  CULLING:   'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  COMPLETED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

export default function ChickenRunDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const alert = useAlert()
  const { currentBusinessId, currentBusiness, isAuthenticated, loading: bizLoading } = useBusinessPermissionsContext()

  const [batches, setBatches] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  // Alert state
  const [mortalityThreshold, setMortalityThreshold] = useState(5)
  const [inventoryThreshold, setInventoryThreshold] = useState(10)
  const [freezerTotal, setFreezerTotal] = useState(0)
  const [highMortalityBatches, setHighMortalityBatches] = useState<any[]>([])

  const fetchSettings = useCallback(async (businessId: string) => {
    try {
      const res = await fetch(`/api/chicken-run/settings?businessId=${businessId}`, { credentials: 'include' })
      const json = await res.json()
      if (res.ok && json.data) {
        setMortalityThreshold(Number(json.data.highMortalityThreshold ?? 5))
        setInventoryThreshold(Number(json.data.lowInventoryThreshold ?? 10))
      }
    } catch {
      // silently fail; defaults already set
    }
  }, [])

  const fetchInventoryFreezerTotal = useCallback(async (businessId: string) => {
    try {
      const res = await fetch(`/api/chicken-run/inventory?businessId=${businessId}`, { credentials: 'include' })
      const json = await res.json()
      if (res.ok && json.data) {
        const total = (json.data as Array<{ status: string; quantityInFreezer: unknown }>)
          .filter((inv: { status: string }) => inv.status === 'CLOSED')
          .reduce((sum: number, inv: { quantityInFreezer: unknown }) => sum + Number(inv.quantityInFreezer ?? 0), 0)
        setFreezerTotal(total)
      }
    } catch {
      // silently fail
    }
  }, [])

  const fetchBatches = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/chicken-run/batches?businessId=${currentBusinessId}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load batches')
      const data: any[] = json.data || []
      setBatches(data)
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, alert])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
    if (!currentBusinessId) return
    fetchSettings(currentBusinessId)
    fetchInventoryFreezerTotal(currentBusinessId)
    fetchBatches()
  }, [session, status, router, currentBusinessId, fetchSettings, fetchInventoryFreezerTotal, fetchBatches])

  // Recompute high mortality batches whenever batches or threshold changes
  useEffect(() => {
    const high = batches.filter(b => b.status === 'GROWING' && parseFloat(b.mortalityRate) >= mortalityThreshold)
    setHighMortalityBatches(high)
  }, [batches, mortalityThreshold])

  const filtered = statusFilter
    ? batches.filter(b => b.status === statusFilter)
    : batches

  const showMortalityAlert = highMortalityBatches.length > 0
  const showInventoryAlert = freezerTotal < inventoryThreshold

  if (status === 'loading' || bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    )
  }
  if (!session || !isAuthenticated) return null

  return (
    <ContentLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">🐔 Chicken Run</h1>
            {currentBusiness && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currentBusiness.businessName}</p>
            )}
          </div>
          <Link
            href="/chicken-run/batches/new"
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
          >
            + New Batch
          </Link>
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/chicken-run/inventory', icon: '🧊', label: 'Inventory', sub: 'Freezer stock' },
            { href: '/chicken-run/inventory/purchase', icon: '🛒', label: 'Buy Stock', sub: 'Add purchased birds' },
            { href: '/chicken-run/reports', icon: '📊', label: 'Reports', sub: 'Analytics & history' },
            { href: '/chicken-run/settings', icon: '⚙️', label: 'Settings', sub: 'Thresholds & schedules' },
          ].map(({ href, icon, label, sub }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 hover:shadow-md hover:border-green-400 dark:hover:border-green-600 transition-all"
            >
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{sub}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Alert Banners */}
        {showMortalityAlert && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 dark:bg-red-900/20 dark:border-red-800 flex items-start gap-3">
            <span className="text-xl flex-shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">High Mortality Detected</p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">
                High mortality detected in {highMortalityBatches.length} batch{highMortalityBatches.length > 1 ? 'es' : ''} (≥{mortalityThreshold}%). Review immediately.
              </p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                Affected: {highMortalityBatches.map(b => `${b.batchNumber} (${b.mortalityRate}%)`).join(', ')}
              </p>
            </div>
          </div>
        )}

        {showInventoryAlert && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 dark:bg-orange-900/20 dark:border-orange-800 flex items-start gap-3">
            <span className="text-xl flex-shrink-0">🧊</span>
            <div>
              <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">Low Freezer Stock</p>
              <p className="text-sm text-orange-700 dark:text-orange-400 mt-0.5">
                Low freezer stock: {freezerTotal} bird{freezerTotal !== 1 ? 's' : ''} remaining. Consider purchasing more.
              </p>
            </div>
          </div>
        )}

        {/* Status Filters */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: '', label: 'All' },
            { value: 'GROWING', label: 'Growing' },
            { value: 'CULLING', label: 'Culling' },
            { value: 'COMPLETED', label: 'Completed' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                statusFilter === f.value
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Batch Grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">Loading batches...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-5xl mb-3">🐔</p>
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No batches found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              {statusFilter ? `No ${statusFilter.toLowerCase()} batches` : 'Start by creating your first batch'}
            </p>
            <Link
              href="/chicken-run/batches/new"
              className="mt-4 inline-block px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              + New Batch
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(batch => {
              const mortalityHigh = parseFloat(batch.mortalityRate) >= mortalityThreshold
              return (
                <Link
                  key={batch.id}
                  href={`/chicken-run/batches/${batch.id}`}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow block"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{batch.batchNumber}</p>
                      {batch.supplier?.name && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{batch.supplier.name}</p>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[batch.status] || STATUS_STYLES.COMPLETED}`}>
                      {batch.status}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Age</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {batch.ageInWeeks}w {batch.ageInDays % 7}d
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{batch.feedStage}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Alive</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {batch.currentAliveCount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">of {batch.initialCount.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Mortality</p>
                      <p className={`text-sm font-semibold ${mortalityHigh ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                        {batch.mortalityRate}%
                      </p>
                      {mortalityHigh && <p className="text-xs text-red-500">High</p>}
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total Cost</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(batch.totalCost)}
                      </p>
                    </div>
                  </div>

                  {/* Vaccination Due Badge */}
                  {batch.vaccinationsDue > 0 && (
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-medium">
                      💉 {batch.vaccinationsDue} vaccination{batch.vaccinationsDue > 1 ? 's' : ''} due
                    </div>
                  )}

                  {/* Purchase Date */}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Purchased: {formatDate(batch.purchaseDate)}
                  </p>
                  {batch.expectedCullDate && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Expected cull: {formatDate(batch.expectedCullDate)}
                    </p>
                  )}

                  {/* Quick Actions */}
                  <div className="flex gap-1 mt-3 flex-wrap" onClick={e => e.preventDefault()}>
                    {[
                      { tab: 'Feed', label: '🌾 Feed' },
                      { tab: 'Medication', label: '💊 Med' },
                      { tab: 'Mortality', label: '💀 Mortality' },
                      { tab: 'Weight', label: '⚖️ Weight' },
                    ].map(({ tab, label }) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={e => { e.preventDefault(); e.stopPropagation(); router.push(`/chicken-run/batches/${batch.id}?tab=${tab}`) }}
                        className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </ContentLayout>
  )
}
