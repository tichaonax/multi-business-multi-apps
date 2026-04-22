'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { formatCurrency, formatDate } from '@/lib/date-format'
import { useAlert } from '@/components/ui/confirm-modal'
import AddAssetModal from './AddAssetModal'

interface Asset {
  id: string
  assetTag: string
  name: string
  description: string | null
  status: string
  purchaseDate: string
  purchasePrice: number
  currentBookValue: number
  depreciationMethod: string
  category: { id: string; name: string; icon: string | null } | null
}

interface Category {
  id: string
  name: string
}

interface Summary {
  totalAssets: number
  disposedCount: number
  totalBookValue: number
  totalPurchaseValue: number
  ytdDepreciation: number
}

interface ReportData {
  valueByCategory: Array<{ name: string; count: number; totalBookValue: number; totalPurchaseValue: number }>
  depreciationSummary: Array<{ id: string; assetTag: string; name: string; category: string; purchasePrice: number; currentBookValue: number; periodDepreciation: number; totalDepreciated: number }>
  disposals: Array<{ id: string; assetTag: string; name: string; status: string; category: string; purchasePrice: number; bookValueAtDisposal: number; disposalValue: number | null; gainLoss: number | null; disposalMethod: string | null; disposalRecipient: string | null; disposedAt: string | null }>
  maintenanceSummary: Array<{ id: string; assetTag: string; name: string; category: string; maintenanceCount: number; totalMaintenanceCost: number }>
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  MAINTENANCE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  DISPOSED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  WRITTEN_OFF: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

type PageTab = 'register' | 'reports'

export default function AssetsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const alert = useAlert()
  const { currentBusinessId, currentBusiness, isSystemAdmin, hasPermission, loading: bizLoading } = useBusinessPermissionsContext()

  const canManageAssets = isSystemAdmin || hasPermission('canManageAssets')

  const [pageTab, setPageTab] = useState<PageTab>('register')
  const [assets, setAssets] = useState<Asset[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  // Register filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  // Reports state
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportFrom, setReportFrom] = useState('')
  const [reportTo, setReportTo] = useState('')
  const [activeReport, setActiveReport] = useState<'value' | 'depreciation' | 'disposal' | 'maintenance'>('value')

  const fetchAll = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ businessId: currentBusinessId })
      if (statusFilter) params.set('status', statusFilter)
      if (categoryFilter) params.set('categoryId', categoryFilter)
      if (search) params.set('search', search)

      const [assetsRes, summaryRes, catsRes] = await Promise.all([
        fetch(`/api/assets?${params}`, { credentials: 'include' }),
        fetch(`/api/assets/summary?businessId=${currentBusinessId}`, { credentials: 'include' }),
        fetch(`/api/assets/categories?businessId=${currentBusinessId}`, { credentials: 'include' }),
      ])

      if (assetsRes.ok) setAssets((await assetsRes.json()).data || [])
      if (summaryRes.ok) setSummary((await summaryRes.json()).data)
      if (catsRes.ok) setCategories((await catsRes.json()).data || [])
    } catch (e: unknown) {
      await alert({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to load assets' })
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, statusFilter, categoryFilter, search, alert])

  const fetchReports = useCallback(async () => {
    if (!currentBusinessId) return
    setReportLoading(true)
    try {
      const params = new URLSearchParams({ businessId: currentBusinessId })
      if (reportFrom) params.set('from', reportFrom)
      if (reportTo) params.set('to', reportTo)
      const res = await fetch(`/api/assets/reports?${params}`, { credentials: 'include' })
      const json = await res.json()
      if (res.ok) setReportData(json.data)
    } finally {
      setReportLoading(false)
    }
  }, [currentBusinessId, reportFrom, reportTo])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
    if (!canManageAssets) { router.push('/dashboard'); return }
    if (!currentBusinessId) return
    fetchAll()
  }, [session, status, router, canManageAssets, currentBusinessId, fetchAll])

  useEffect(() => {
    if (pageTab === 'reports' && currentBusinessId) fetchReports()
  }, [pageTab, currentBusinessId, fetchReports])

  if (status === 'loading' || bizLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" /></div>
  }
  if (!session) return null

  return (
    <ContentLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Asset Register</h1>
            {currentBusiness && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currentBusiness.businessName}</p>}
          </div>
          <div className="flex gap-2">
            <Link href="/assets/categories" className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              Categories
            </Link>
            {canManageAssets && pageTab === 'register' && (
              <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                + Add Asset
              </button>
            )}
          </div>
        </div>

        {/* Summary Bar */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Active Assets', value: summary.totalAssets.toString(), color: 'blue' },
              { label: 'Total Book Value', value: formatCurrency(summary.totalBookValue), color: 'green' },
              { label: 'YTD Depreciation', value: formatCurrency(summary.ytdDepreciation), color: 'orange' },
              { label: 'Disposed This Year', value: summary.disposedCount.toString(), color: 'gray' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                <p className={`text-xl font-bold text-${color}-600 dark:text-${color}-400 mt-1`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Page Tabs */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
          {([['register', 'Asset Register'], ['reports', 'Reports']] as [PageTab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setPageTab(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${pageTab === t ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── REGISTER TAB ── */}
        {pageTab === 'register' && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <input
                type="text"
                placeholder="Search by name, tag, serial..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchAll()}
                className="flex-1 min-w-48 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="DISPOSED">Disposed</option>
                <option value="WRITTEN_OFF">Written Off</option>
              </select>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={fetchAll} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                Search
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {loading ? (
                <div className="py-16 text-center text-gray-400 dark:text-gray-500">Loading assets...</div>
              ) : assets.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-4xl mb-3">📦</p>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No assets found</p>
                  {canManageAssets && (
                    <button onClick={() => setShowAddModal(true)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                      Add Your First Asset
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        {['Asset Tag', 'Name', 'Category', 'Purchase Price', 'Book Value', 'Status', 'Purchase Date', ''].map(h => (
                          <th key={h} className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {assets.map(asset => (
                        <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => router.push(`/assets/${asset.id}`)}>
                          <td className="py-3 px-4 text-sm font-mono text-gray-600 dark:text-gray-400">{asset.assetTag}</td>
                          <td className="py-3 px-4">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{asset.name}</p>
                            {asset.description && <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-48">{asset.description}</p>}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{asset.category?.name ?? '—'}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{formatCurrency(asset.purchasePrice)}</td>
                          <td className="py-3 px-4">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatCurrency(asset.currentBookValue)}</p>
                            {asset.purchasePrice > 0 && (
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                {(((asset.purchasePrice - asset.currentBookValue) / asset.purchasePrice) * 100).toFixed(0)}% depreciated
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[asset.status] || STATUS_COLORS.ACTIVE}`}>
                              {asset.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(asset.purchaseDate)}</td>
                          <td className="py-3 px-4">
                            <button onClick={e => { e.stopPropagation(); router.push(`/assets/${asset.id}`) }} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                              View →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── REPORTS TAB ── */}
        {pageTab === 'reports' && (
          <div className="space-y-6">
            {/* Date range filter */}
            <div className="flex flex-wrap gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 items-end">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">From</label>
                <input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">To</label>
                <input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
              </div>
              <button onClick={fetchReports} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Refresh
              </button>
              {(reportFrom || reportTo) && (
                <button onClick={() => { setReportFrom(''); setReportTo('') }} className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                  Clear dates
                </button>
              )}
            </div>

            {/* Sub-report selector */}
            <div className="flex gap-1 flex-wrap">
              {([
                ['value', 'Value by Category'],
                ['depreciation', 'Depreciation'],
                ['disposal', 'Disposals'],
                ['maintenance', 'Maintenance Costs'],
              ] as ['value' | 'depreciation' | 'disposal' | 'maintenance', string][]).map(([key, label]) => (
                <button key={key} onClick={() => setActiveReport(key)}
                  className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${activeReport === key ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  {label}
                </button>
              ))}
            </div>

            {reportLoading ? (
              <div className="py-12 text-center text-gray-400 dark:text-gray-500">Loading reports...</div>
            ) : !reportData ? null : (
              <>
                {/* Value by Category */}
                {activeReport === 'value' && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Asset Value by Category</h3>
                    </div>
                    {reportData.valueByCategory.length === 0 ? (
                      <p className="p-6 text-sm text-gray-400 dark:text-gray-500 text-center">No data</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-gray-200 dark:border-gray-700">
                            {['Category', 'Count', 'Purchase Value', 'Book Value', 'Depreciated'].map(h => (
                              <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 dark:text-gray-400">{h}</th>
                            ))}
                          </tr></thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {reportData.valueByCategory.map(row => (
                              <tr key={row.name}>
                                <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{row.name}</td>
                                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{row.count}</td>
                                <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{formatCurrency(row.totalPurchaseValue)}</td>
                                <td className="py-3 px-4 font-medium text-green-700 dark:text-green-400">{formatCurrency(row.totalBookValue)}</td>
                                <td className="py-3 px-4 text-red-600 dark:text-red-400">{formatCurrency(row.totalPurchaseValue - row.totalBookValue)}</td>
                              </tr>
                            ))}
                            <tr className="border-t-2 border-gray-300 dark:border-gray-500 font-semibold">
                              <td className="py-3 px-4 text-gray-900 dark:text-gray-100">Total</td>
                              <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{reportData.valueByCategory.reduce((s, r) => s + r.count, 0)}</td>
                              <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{formatCurrency(reportData.valueByCategory.reduce((s, r) => s + r.totalPurchaseValue, 0))}</td>
                              <td className="py-3 px-4 text-green-700 dark:text-green-400">{formatCurrency(reportData.valueByCategory.reduce((s, r) => s + r.totalBookValue, 0))}</td>
                              <td className="py-3 px-4 text-red-600 dark:text-red-400">{formatCurrency(reportData.valueByCategory.reduce((s, r) => s + r.totalPurchaseValue - r.totalBookValue, 0))}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Depreciation Summary */}
                {activeReport === 'depreciation' && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Depreciation Summary</h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{reportFrom || reportTo ? 'For selected date range' : 'All time'}</p>
                    </div>
                    {reportData.depreciationSummary.length === 0 ? (
                      <p className="p-6 text-sm text-gray-400 dark:text-gray-500 text-center">No depreciation entries in this period</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-gray-200 dark:border-gray-700">
                            {['Tag', 'Asset', 'Category', 'Purchase Price', 'Period Dep.', 'Total Dep.', 'Book Value'].map(h => (
                              <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 dark:text-gray-400">{h}</th>
                            ))}
                          </tr></thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {reportData.depreciationSummary.map(row => (
                              <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => router.push(`/assets/${row.id}`)}>
                                <td className="py-3 px-4 font-mono text-xs text-gray-500 dark:text-gray-400">{row.assetTag}</td>
                                <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{row.name}</td>
                                <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{row.category}</td>
                                <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{formatCurrency(row.purchasePrice)}</td>
                                <td className="py-3 px-4 text-red-600 dark:text-red-400 font-medium">-{formatCurrency(row.periodDepreciation)}</td>
                                <td className="py-3 px-4 text-red-500 dark:text-red-500">-{formatCurrency(row.totalDepreciated)}</td>
                                <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{formatCurrency(row.currentBookValue)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Disposal Report */}
                {activeReport === 'disposal' && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Disposal Report</h3>
                    </div>
                    {reportData.disposals.length === 0 ? (
                      <p className="p-6 text-sm text-gray-400 dark:text-gray-500 text-center">No disposals in this period</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-gray-200 dark:border-gray-700">
                            {['Tag', 'Asset', 'Method', 'Disposed', 'Book Value', 'Disposal Value', 'Gain / Loss'].map(h => (
                              <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 dark:text-gray-400">{h}</th>
                            ))}
                          </tr></thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {reportData.disposals.map(row => (
                              <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => router.push(`/assets/${row.id}`)}>
                                <td className="py-3 px-4 font-mono text-xs text-gray-500 dark:text-gray-400">{row.assetTag}</td>
                                <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{row.name}</td>
                                <td className="py-3 px-4">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[row.status] || STATUS_COLORS.DISPOSED}`}>{row.disposalMethod || row.status}</span>
                                </td>
                                <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{row.disposedAt ? formatDate(row.disposedAt) : '—'}</td>
                                <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{formatCurrency(row.bookValueAtDisposal)}</td>
                                <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{row.disposalValue != null ? formatCurrency(row.disposalValue) : '—'}</td>
                                <td className="py-3 px-4">
                                  {row.gainLoss != null ? (
                                    <span className={row.gainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                      {row.gainLoss >= 0 ? '+' : ''}{formatCurrency(row.gainLoss)}
                                    </span>
                                  ) : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Maintenance Costs */}
                {activeReport === 'maintenance' && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Maintenance Cost Report</h3>
                    </div>
                    {reportData.maintenanceSummary.length === 0 ? (
                      <p className="p-6 text-sm text-gray-400 dark:text-gray-500 text-center">No maintenance logs in this period</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-gray-200 dark:border-gray-700">
                            {['Tag', 'Asset', 'Category', 'Log Entries', 'Total Cost'].map(h => (
                              <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 dark:text-gray-400">{h}</th>
                            ))}
                          </tr></thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {reportData.maintenanceSummary.map(row => (
                              <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => router.push(`/assets/${row.id}`)}>
                                <td className="py-3 px-4 font-mono text-xs text-gray-500 dark:text-gray-400">{row.assetTag}</td>
                                <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{row.name}</td>
                                <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{row.category}</td>
                                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{row.maintenanceCount}</td>
                                <td className="py-3 px-4 font-medium text-orange-600 dark:text-orange-400">{formatCurrency(row.totalMaintenanceCost)}</td>
                              </tr>
                            ))}
                            <tr className="border-t-2 border-gray-300 dark:border-gray-500 font-semibold">
                              <td colSpan={3} className="py-3 px-4 text-gray-900 dark:text-gray-100">Total</td>
                              <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{reportData.maintenanceSummary.reduce((s, r) => s + r.maintenanceCount, 0)}</td>
                              <td className="py-3 px-4 text-orange-600 dark:text-orange-400">{formatCurrency(reportData.maintenanceSummary.reduce((s, r) => s + r.totalMaintenanceCost, 0))}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {showAddModal && currentBusinessId && (
        <AddAssetModal
          businessId={currentBusinessId}
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchAll() }}
        />
      )}
    </ContentLayout>
  )
}
