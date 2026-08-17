'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ListSearchFilterBar } from '@/components/ui/list-search-filter-bar'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { BarcodeScanner } from '@/components/universal/barcode-scanner'
import { QuickStockFromScanModal } from '@/components/inventory/quick-stock-from-scan-modal'
import { AddPartModal } from '@/components/vehicle-service/add-part-modal'

interface PartListItem {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  condition: string
  partType: string | null
  basePrice: number
  business_categories: { id: string; name: string; emoji: string | null; domainId: string | null } | null
  inventory_subcategory: { id: string; name: string; emoji: string | null } | null
  business_locations: { id: string; name: string; locationCode: string } | null
  product_variants: Array<{ id: string; stockQuantity: number; reorderLevel: number; sku: string }>
  vehicle_part_compatibility: Array<{ vehicleMake: string; vehicleModel: string | null }>
}

const STOCK_PILLS = [
  { key: '', label: 'All' },
  { key: 'in_stock', label: 'In Stock' },
  { key: 'low_stock', label: 'Low Stock' },
  { key: 'out_of_stock', label: 'Out of Stock' },
]

export default function VehiclePartsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
      <VehiclePartsPageContent />
    </Suspense>
  )
}

function VehiclePartsPageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { currentBusinessId, hasPermission, isSystemAdmin } = useBusinessPermissionsContext()
  const canManage = isSystemAdmin || hasPermission('canManageInventory')

  const [parts, setParts] = useState<PartListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [domainId, setDomainId] = useState('')
  const [stockStatus, setStockStatus] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null)

  const fetchParts = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ businessId: currentBusinessId })
      if (search) params.append('search', search)
      if (domainId) params.append('domainId', domainId)
      if (stockStatus) params.append('stockStatus', stockStatus)
      const res = await fetch(`/api/vehicle-service/parts?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load parts')
      setParts(data.parts || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, search, domainId, stockStatus])

  useEffect(() => { fetchParts() }, [fetchParts])

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const stockLabel = (p: PartListItem) => {
    const v = p.product_variants[0]
    if (!v) return { text: 'No variant', cls: 'bg-gray-100 text-gray-600' }
    const qty = Number(v.stockQuantity)
    const reorder = Number(v.reorderLevel)
    if (qty <= 0) return { text: 'Out of stock', cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' }
    if (reorder > 0 && qty <= reorder) return { text: `Low (${qty})`, cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' }
    return { text: `${qty} in stock`, cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' }
  }

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading...</div>
  }
  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <ContentLayout title="Parts Inventory" subtitle="Search, stock, and manage vehicle parts and workshop supplies">
      <div className="max-w-7xl mx-auto">
        <ListSearchFilterBar
          onSearchChange={setSearch}
          searchLoading={loading}
          searchPlaceholder="Search by name, SKU, or barcode..."
          extraFilters={
            <div className="w-56">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Domain</label>
              <SearchableSelect
                options={[
                  { value: 'vsdom_parts', name: '🧰 Parts and Accessories Sales' },
                  { value: 'vsdom_workshop', name: '🔧 Workshop Inventory' },
                ]}
                value={domainId}
                onChange={setDomainId}
                placeholder="All domains"
                allLabel="All domains"
              />
            </div>
          }
        />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {STOCK_PILLS.map(p => (
              <button
                key={p.key}
                onClick={() => setStockStatus(p.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  stockStatus === p.key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/vehicle-service/jobs"
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-medium"
            >
              🔧 Jobs
            </Link>
            {canManage && (
              <Link
                href="/vehicle-service/parts/reports"
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-medium"
              >
                📊 Reports
              </Link>
            )}
            {canManage && (
              <>
                <button
                  onClick={() => setShowScanner(true)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-medium"
                >
                  📷 Scan
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  + Add Part
                </button>
              </>
            )}
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

        {!loading && parts.length === 0 && !error && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow text-gray-500 dark:text-gray-400">
            No parts found. Click "+ Add Part" or "📷 Scan" to register one.
          </div>
        )}

        {!loading && parts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  {['Part', 'Category', 'Vehicle Compatibility', 'Condition', 'Stock', 'Price', 'Location'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {parts.map(p => {
                  const stock = stockLabel(p)
                  return (
                    <tr
                      key={p.id}
                      onClick={() => router.push(`/vehicle-service/parts/${p.id}`)}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-3 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {p.name}
                        {p.sku && <div className="text-xs text-gray-400 font-mono">{p.sku}</div>}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {p.inventory_subcategory ? `${p.inventory_subcategory.emoji || ''} ${p.inventory_subcategory.name}` : (p.business_categories ? `${p.business_categories.emoji || ''} ${p.business_categories.name}` : '—')}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {p.vehicle_part_compatibility.length === 0
                          ? '—'
                          : p.vehicle_part_compatibility.slice(0, 2).map(c => [c.vehicleMake, c.vehicleModel].filter(Boolean).join(' ')).join(', ') +
                            (p.vehicle_part_compatibility.length > 2 ? ` +${p.vehicle_part_compatibility.length - 2} more` : '')}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                        {p.condition}{p.partType ? ` · ${p.partType}` : ''}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${stock.cls}`}>{stock.text}</span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(Number(p.basePrice))}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {p.business_locations ? p.business_locations.name : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showScanner && currentBusinessId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75" onClick={() => setShowScanner(false)} />
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Scan a Part</h3>
              <BarcodeScanner
                businessId={currentBusinessId}
                showScanner={true}
                onProductScanned={(product) => {
                  setShowScanner(false)
                  router.push(`/vehicle-service/parts/${product.id}`)
                }}
                onNotFound={(barcode) => {
                  setShowScanner(false)
                  setNotFoundBarcode(barcode)
                }}
              />
              <button onClick={() => setShowScanner(false)} className="mt-4 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {notFoundBarcode && currentBusinessId && (
        <QuickStockFromScanModal
          isOpen={true}
          barcode={notFoundBarcode}
          businessId={currentBusinessId}
          businessType="vehicle_service"
          onSuccess={(productId) => { setNotFoundBarcode(null); router.push(`/vehicle-service/parts/${productId}`) }}
          onClose={() => setNotFoundBarcode(null)}
        />
      )}

      {showAddModal && currentBusinessId && (
        <AddPartModal
          businessId={currentBusinessId}
          onClose={() => setShowAddModal(false)}
          onCreated={(partId) => { setShowAddModal(false); router.push(`/vehicle-service/parts/${partId}`) }}
        />
      )}
    </ContentLayout>
  )
}
