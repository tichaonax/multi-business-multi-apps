'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { formatCurrency, formatDate } from '@/lib/date-format'
import { useAlert } from '@/components/ui/confirm-modal'
import DepreciateAssetModal from './DepreciateAssetModal'
import DisposeAssetModal from './DisposeAssetModal'
import AddMaintenanceModal from './AddMaintenanceModal'
import AssetPhotosTab from './AssetPhotosTab'

interface DepreciationEntry {
  id: string
  periodDate: string
  amount: number
  bookValueAfter: number
  notes: string | null
  createdAt: string
}

interface MaintenanceLog {
  id: string
  maintenanceDate: string
  maintenanceType: string
  description: string
  cost: number | null
  vendor: string | null
  nextMaintenanceDate: string | null
  notes: string | null
  createdAt: string
}

interface Asset {
  id: string
  assetTag: string
  name: string
  description: string | null
  serialNumber: string | null
  manufacturer: string | null
  model: string | null
  location: string | null
  status: string
  purchaseDate: string
  purchasePrice: number
  currentBookValue: number
  salvageValue: number
  depreciationMethod: string
  usefulLifeYears: number | null
  notes: string | null
  disposedAt: string | null
  disposalMethod: string | null
  disposalValue: number | null
  disposalRecipient: string | null
  disposalNotes: string | null
  category: { id: string; name: string } | null
  depreciationEntries: DepreciationEntry[]
  maintenanceLogs: MaintenanceLog[]
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  MAINTENANCE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  DISPOSED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  WRITTEN_OFF: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

type Tab = 'details' | 'maintenance' | 'depreciation' | 'photos'

export default function AssetDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const alert = useAlert()
  const { isSystemAdmin, hasPermission, loading: bizLoading } = useBusinessPermissionsContext()

  const canManageAssets = isSystemAdmin || hasPermission('canManageAssets')

  const [asset, setAsset] = useState<Asset | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('details')
  const [showDepreciate, setShowDepreciate] = useState(false)
  const [showDispose, setShowDispose] = useState(false)
  const [showMaintenance, setShowMaintenance] = useState(false)

  const fetchAsset = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/assets/${id}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Not found')
      setAsset(json.data)
    } catch (e: unknown) {
      await alert({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to load asset' })
      router.push('/assets')
    } finally {
      setLoading(false)
    }
  }, [id, alert, router])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
    if (!canManageAssets) { router.push('/dashboard'); return }
    fetchAsset()
  }, [session, status, router, canManageAssets, fetchAsset])

  if (status === 'loading' || bizLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" /></div>
  }
  if (!asset) return null

  const isDisposed = asset.status === 'DISPOSED' || asset.status === 'WRITTEN_OFF'
  const totalDepreciated = asset.purchasePrice - asset.currentBookValue

  // Projected depreciation schedule
  const projectedSchedule: Array<{ year: number; depreciation: number; bookValue: number }> = []
  if (asset.depreciationMethod !== 'NONE' && asset.usefulLifeYears && asset.currentBookValue > asset.salvageValue) {
    let bookValue = asset.currentBookValue
    const salvage = asset.salvageValue
    for (let y = 1; y <= Math.min(asset.usefulLifeYears, 10); y++) {
      let dep = 0
      if (asset.depreciationMethod === 'STRAIGHT_LINE') {
        dep = (asset.purchasePrice - salvage) / asset.usefulLifeYears
      } else {
        dep = bookValue * (2 / asset.usefulLifeYears)
      }
      dep = Math.min(dep, bookValue - salvage)
      bookValue = Math.max(bookValue - dep, salvage)
      projectedSchedule.push({ year: y, depreciation: dep, bookValue })
      if (bookValue <= salvage) break
    }
  }

  return (
    <ContentLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/assets" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">← Assets</Link>
              <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{asset.assetTag}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[asset.status] || STATUS_COLORS.ACTIVE}`}>
                {asset.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{asset.name}</h1>
            {asset.category && <p className="text-sm text-gray-500 dark:text-gray-400">{asset.category.name}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 dark:text-gray-500">Book Value</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(asset.currentBookValue)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">of {formatCurrency(asset.purchasePrice)} purchase price</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
          {(['details', 'maintenance', 'depreciation', 'photos'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              {t} {t === 'maintenance' && `(${asset.maintenanceLogs.length})`}
              {t === 'depreciation' && `(${asset.depreciationEntries.length})`}
            </button>
          ))}
        </div>

        {/* Details Tab */}
        {tab === 'details' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Asset Details</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Location', value: asset.location || '—' },
                  { label: 'Serial Number', value: asset.serialNumber || '—' },
                  { label: 'Manufacturer', value: asset.manufacturer || '—' },
                  { label: 'Model', value: asset.model || '—' },
                  { label: 'Purchase Date', value: formatDate(asset.purchaseDate) },
                  { label: 'Useful Life', value: asset.usefulLifeYears ? `${asset.usefulLifeYears} years` : '—' },
                  { label: 'Salvage Value', value: formatCurrency(asset.salvageValue) },
                  { label: 'Depreciation', value: asset.depreciationMethod.replace('_', ' ') },
                  { label: 'Total Depreciated', value: formatCurrency(totalDepreciated) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              {asset.notes && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{asset.notes}</p>
                </div>
              )}
            </div>

            {isDisposed && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 p-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Disposal Information</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Disposed On', value: formatDate(asset.disposedAt!) },
                    { label: 'Method', value: asset.disposalMethod || '—' },
                    { label: 'Disposal Value', value: asset.disposalValue != null ? formatCurrency(asset.disposalValue) : '—' },
                    { label: 'Recipient', value: asset.disposalRecipient || '—' },
                    { label: 'Gain / Loss', value: asset.disposalValue != null ? formatCurrency(asset.disposalValue - asset.currentBookValue) : '—' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
                {asset.disposalNotes && <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">{asset.disposalNotes}</p>}
              </div>
            )}

            {projectedSchedule.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Projected Depreciation Schedule</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-3 text-xs text-gray-500 dark:text-gray-400">Year</th>
                      <th className="text-right py-2 px-3 text-xs text-gray-500 dark:text-gray-400">Depreciation</th>
                      <th className="text-right py-2 px-3 text-xs text-gray-500 dark:text-gray-400">Book Value</th>
                    </tr></thead>
                    <tbody>
                      {projectedSchedule.map(row => (
                        <tr key={row.year} className="border-b border-gray-100 dark:border-gray-700/50">
                          <td className="py-2 px-3 text-gray-700 dark:text-gray-300">Year {row.year}</td>
                          <td className="py-2 px-3 text-right text-red-600 dark:text-red-400">-{formatCurrency(row.depreciation)}</td>
                          <td className="py-2 px-3 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(row.bookValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Maintenance Tab */}
        {tab === 'maintenance' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {asset.maintenanceLogs.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-3xl mb-2">🔧</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">No maintenance logs yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {asset.maintenanceLogs.map(log => (
                  <div key={log.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{log.description}</p>
                        <div className="flex gap-3 mt-1 flex-wrap">
                          <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(log.maintenanceDate)}</span>
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">{log.maintenanceType}</span>
                          {log.vendor && <span className="text-xs text-gray-400 dark:text-gray-500">Vendor: {log.vendor}</span>}
                        </div>
                        {log.nextMaintenanceDate && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Next due: {formatDate(log.nextMaintenanceDate)}</p>
                        )}
                        {log.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{log.notes}</p>}
                      </div>
                      {log.cost != null && (
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 ml-4">{formatCurrency(log.cost)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Depreciation History Tab */}
        {tab === 'depreciation' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {asset.depreciationEntries.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-3xl mb-2">📉</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">No depreciation entries yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-xs text-gray-500 dark:text-gray-400">Period</th>
                    <th className="text-right py-3 px-4 text-xs text-gray-500 dark:text-gray-400">Amount</th>
                    <th className="text-right py-3 px-4 text-xs text-gray-500 dark:text-gray-400">Book Value After</th>
                    <th className="text-left py-3 px-4 text-xs text-gray-500 dark:text-gray-400">Notes</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {asset.depreciationEntries.map(entry => (
                      <tr key={entry.id}>
                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{formatDate(entry.periodDate)}</td>
                        <td className="py-3 px-4 text-right text-red-600 dark:text-red-400 font-medium">-{formatCurrency(entry.amount)}</td>
                        <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(entry.bookValueAfter)}</td>
                        <td className="py-3 px-4 text-xs text-gray-400 dark:text-gray-500">{entry.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Photos Tab */}
        {tab === 'photos' && (
          <AssetPhotosTab assetId={asset.id} canManageAssets={canManageAssets} />
        )}

        {/* Action Footer */}
        {canManageAssets && !isDisposed && (
          <div className="flex flex-wrap gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <button onClick={() => setShowDepreciate(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Record Depreciation
            </button>
            <button onClick={() => setShowMaintenance(true)} className="px-4 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
              Log Maintenance
            </button>
            <button onClick={() => setShowDispose(true)} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 ml-auto">
              Dispose Asset
            </button>
          </div>
        )}
      </div>

      {showDepreciate && (
        <DepreciateAssetModal asset={asset} onClose={() => setShowDepreciate(false)} onSuccess={() => { setShowDepreciate(false); fetchAsset() }} />
      )}
      {showDispose && (
        <DisposeAssetModal asset={asset} onClose={() => setShowDispose(false)} onSuccess={() => { setShowDispose(false); router.push('/assets') }} />
      )}
      {showMaintenance && (
        <AddMaintenanceModal assetId={asset.id} onClose={() => setShowMaintenance(false)} onSuccess={() => { setShowMaintenance(false); fetchAsset(); setTab('maintenance') }} />
      )}
    </ContentLayout>
  )
}
