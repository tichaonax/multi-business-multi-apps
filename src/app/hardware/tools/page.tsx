'use client'

import React, { useState } from 'react'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider } from '@/components/universal'
import { useAlert } from '@/components/ui/confirm-modal'
import { UniversalInventoryForm } from '@/components/universal/inventory'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

// Sample tool data
const toolCategories = [
  {
    id: 'power-tools',
    name: 'Power Tools',
    icon: '⚡',
    description: 'Electric and battery-powered tools'
  },
  {
    id: 'hand-tools',
    name: 'Hand Tools',
    icon: '🔨',
    description: 'Manual tools and implements'
  },
  {
    id: 'yard-equipment',
    name: 'Yard Equipment',
    icon: '🌱',
    description: 'Lawn mowers, trimmers, and outdoor tools'
  },
  {
    id: 'construction',
    name: 'Construction Equipment',
    icon: '🏗️',
    description: 'Heavy-duty construction tools'
  }
]

const sampleTools = [
  // Power Tools
  {
    id: 1,
    name: 'Makita 18V Drill Driver',
    category: 'power-tools',
    type: 'sale',
    price: 89.99,
    rentalPrice: 12.00,
    stock: 15,
    brand: 'Makita',
    model: 'XFD131',
    condition: 'New',
    available: true,
    image: '🔧'
  },
  {
    id: 2,
    name: 'DeWalt Circular Saw',
    category: 'power-tools',
    type: 'rental',
    price: 159.99,
    rentalPrice: 25.00,
    stock: 8,
    brand: 'DeWalt',
    model: 'DWE575SB',
    condition: 'Good',
    available: true,
    image: '⚡'
  },
  // Hand Tools
  {
    id: 3,
    name: 'Stanley Hammer Set',
    category: 'hand-tools',
    type: 'sale',
    price: 24.99,
    rentalPrice: 0,
    stock: 32,
    brand: 'Stanley',
    model: 'STHT51512',
    condition: 'New',
    available: true,
    image: '🔨'
  },
  // Yard Equipment
  {
    id: 4,
    name: 'Honda Push Mower',
    category: 'yard-equipment',
    type: 'rental',
    price: 449.99,
    rentalPrice: 35.00,
    stock: 5,
    brand: 'Honda',
    model: 'HRR216VKA',
    condition: 'Good',
    available: false,
    image: '🌱'
  },
  // Construction
  {
    id: 5,
    name: 'Pneumatic Nail Gun',
    category: 'construction',
    type: 'both',
    price: 129.99,
    rentalPrice: 18.00,
    stock: 12,
    brand: 'Porter-Cable',
    model: 'PCC790LA',
    condition: 'Good',
    available: true,
    image: '🏗️'
  }
]

function ToolsContent() {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'all' | 'sale' | 'rental'>('all')
  const [showAddTool, setShowAddTool] = useState(false)
  const [selectedTool, setSelectedTool] = useState<any>(null)
  // make tools stateful so we can update UI without reloading
  const [tools, setTools] = useState<any[]>(sampleTools)

  const [reportLoading, setReportLoading] = useState(false)
  const [reportData, setReportData] = useState<any | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const customAlert = useAlert()

  // Helper: download CSV from array of objects
  const downloadCSV = (rows: any[], filename = 'report.csv') => {
    if (!rows || rows.length === 0) {
      void customAlert({ title: 'No data', description: 'No data to export' })
      return
    }

    const keys = Array.from(rows.reduce((acc, r) => {
      Object.keys(r || {}).forEach(k => acc.add(k))
      return acc
    }, new Set<string>()))

    const escape = (val: any) => {
      if (val === null || val === undefined) return ''
      const s = String(val)
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"'
      }
      return s
    }

  const keyList = keys as string[]
  const csvRows = rows.map((r: any) => keyList.map(k => escape((r as Record<string, any>)[k] ?? '')).join(','))
  const csv = [keys.join(',')].concat(csvRows).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const downloadCSVFromReport = (report: any) => {
    // Try to pick a useful array to export: report.data if array, or common properties like categories/items
    if (!report) return
    const data = report.data
    if (Array.isArray(data)) {
      return downloadCSV(data, `${report.reportType || 'report'}.csv`)
    }

    if (data && typeof data === 'object') {
      const preferredKeys = ['categories', 'items', 'expiringItems', 'aItems', 'bItems', 'cItems']
      for (const k of preferredKeys) {
        if (Array.isArray(data[k])) {
          return downloadCSV(data[k], `${report.reportType || 'report'}-${k}.csv`)
        }
      }

      // fallback: export top-level key/value pairs
      const rows = Object.entries(data).map(([k, v]) => ({ key: k, value: typeof v === 'object' ? JSON.stringify(v) : v }))
      return downloadCSV(rows, `${report.reportType || 'report'}-summary.csv`)
    }

    void customAlert({ title: 'Export not supported', description: 'Report format not supported for CSV export' })
  }

  const filteredTools = tools.filter(tool => {
    const categoryMatch = activeCategory === 'all' || tool.category === activeCategory
    const typeMatch = viewMode === 'all' ||
                     viewMode === 'sale' && (tool.type === 'sale' || tool.type === 'both') ||
                     viewMode === 'rental' && (tool.type === 'rental' || tool.type === 'both')
    return categoryMatch && typeMatch
  })

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tools', value: '156', icon: '🔧', color: 'text-blue-600' },
          { label: 'Available for Rent', value: '42', icon: '📅', color: 'text-green-600' },
          { label: 'Currently Rented', value: '18', icon: '🔄', color: 'text-orange-600' },
          { label: 'Tools for Sale', value: '89', icon: '💰', color: 'text-purple-600' }
        ].map((stat, index) => (
          <div key={index} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
              <div className="text-2xl">{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tools & Equipment Management Features */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-orange-900 mb-3">
          🔧 Tools & Equipment Management Features
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-3 border border-orange-200 dark:border-orange-800">
            <div className="text-orange-700 font-medium text-sm">📅 Rental Calendar</div>
            <div className="text-xs text-orange-600">Track availability and bookings</div>
          </div>
          <div className="card p-3 border border-orange-200 dark:border-orange-800">
            <div className="text-orange-700 font-medium text-sm">🔧 Maintenance Log</div>
            <div className="text-xs text-orange-600">Service history and schedules</div>
          </div>
          <div className="card p-3 border border-orange-200 dark:border-orange-800">
            <div className="text-orange-700 font-medium text-sm">💰 Dynamic Pricing</div>
            <div className="text-xs text-orange-600">Daily, weekly, monthly rates</div>
          </div>
          <div className="card p-3 border border-orange-200 dark:border-orange-800">
            <div className="text-orange-700 font-medium text-sm">📋 Asset Tracking</div>
            <div className="text-xs text-orange-600">Serial numbers and condition reports</div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-primary">Tools & Equipment</h2>
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {[
                { id: 'all', label: 'All Items', icon: '🔧' },
                { id: 'sale', label: 'For Sale', icon: '💰' },
                { id: 'rental', label: 'Rentals', icon: '📅' }
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id as any)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === mode.id
                      ? 'card text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  <span className="mr-2">{mode.icon}</span>
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

            <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedTool(null)
                setShowAddTool(true)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <span>➕</span>
              Add Tool
            </button>
            <button
              onClick={async () => {
                try {
                  setReportLoading(true)
                  setReportError(null)
                  const res = await fetch(`/api/inventory/${businessId}/reports?reportType=inventory_value`)
                  if (!res.ok) {
                      const err = await res.json().catch(() => ({}))
                      setReportError(err.error || 'Failed to generate report')
                      return
                  }
                  const json = await res.json()
                  setReportData(json.report)
                  setShowReportModal(true)
                } catch (e) {
                  console.error('Report error', e)
                    setReportError('Error generating report')
                } finally {
                  setReportLoading(false)
                }
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <span>📊</span>
              {reportLoading ? 'Generating...' : 'Generate Report'}
            </button>
            {reportError && <div className="text-sm text-red-600 mt-2">{reportError}</div>}
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              activeCategory === 'all'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                : 'bg-gray-100 dark:bg-gray-800 text-secondary hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All Categories
          </button>
          {toolCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm transition-colors flex items-center gap-2 ${
                activeCategory === category.id
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                  : 'bg-gray-100 dark:bg-gray-800 text-secondary hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <span>{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool) => (
            <div
              key={tool.id}
              onClick={() => {
                setSelectedTool(tool)
                setShowAddTool(true)
              }}
              role="button"
              tabIndex={0}
              className={`cursor-pointer border rounded-lg overflow-hidden transition-all hover:shadow-md ${
                tool.available ? 'border-gray-200 dark:border-gray-700' : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{tool.image}</div>
                    <div>
                      <h3 className="font-semibold text-primary">{tool.name}</h3>
                      <p className="text-sm text-secondary">{tool.brand} {tool.model}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    {tool.type === 'sale' || tool.type === 'both' ? (
                      <div className="text-right">
                        <span className="text-lg font-bold text-green-600">${tool.price}</span>
                        <div className="text-xs text-secondary">Sale Price</div>
                      </div>
                    ) : null}
                    {tool.type === 'rental' || tool.type === 'both' ? (
                      <div className="text-right mt-1">
                        <span className="text-sm font-semibold text-blue-600">${tool.rentalPrice}/day</span>
                        <div className="text-xs text-secondary">Rental Rate</div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-secondary mb-3">
                  <span>Stock: {tool.stock}</span>
                  <span className="capitalize">Condition: {tool.condition}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {tool.type === 'sale' || tool.type === 'both' ? (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                        💰 For Sale
                      </span>
                    ) : null}
                    {tool.type === 'rental' || tool.type === 'both' ? (
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                        📅 Rental
                      </span>
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    {tool.available ? (
                      <>
                        {tool.type === 'sale' || tool.type === 'both' ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); /* placeholder action */ }}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          >
                            Sell
                          </button>
                        ) : null}
                        {tool.type === 'rental' || tool.type === 'both' ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); /* placeholder action */ }}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                          >
                            Rent
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded">
                        Unavailable
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTools.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔧</div>
            <h3 className="text-lg font-semibold text-primary mb-2">No tools found</h3>
            <p className="text-secondary">Try adjusting your filters or add some tools to get started.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Tool Form Modal (uses universal inventory form) */}
      <UniversalInventoryForm
        businessId={businessId}
        businessType="hardware"
        item={selectedTool}
        onSubmit={async (saved: any) => {
            // Use returned saved item to update local tools state (upsert)
            try {
              const item = saved?.item || saved || null
              if (item) {
                setTools(prev => {
                  const exists = prev.find(t => String(t.id) === String(item.id))
                  if (exists) {
                    return prev.map(t => String(t.id) === String(item.id) ? { ...t, ...item } : t)
                  }
                  return [{ ...item }, ...prev]
                })
              }
            } catch (e) {
              console.error('Error updating tools state', e)
            } finally {
              setShowAddTool(false)
              setSelectedTool(null)
            }
          }}
        onCancel={() => {
          setShowAddTool(false)
          setSelectedTool(null)
        }}
        isOpen={showAddTool}
        mode={selectedTool ? 'edit' : 'create'}
      />

      {/* Simple Report Modal */}
      {showReportModal && reportData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-2xl p-6 overflow-auto max-h-[80vh]">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{reportData.summary?.title || 'Inventory Report'}</h3>
                <p className="text-sm text-secondary">{reportData.summary?.description}</p>
              </div>
              <div className="flex items-center gap-2">
                {reportError && <div className="text-sm text-red-600 mr-2">{reportError}</div>}
                <button
                  onClick={() => {
                    // download JSON
                    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${reportData.reportType || 'report'}.json`
                    document.body.appendChild(a)
                    a.click()
                    a.remove()
                    URL.revokeObjectURL(url)
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                >
                  Download JSON
                </button>
                <button
                  onClick={() => downloadCSVFromReport(reportData)}
                  className="px-3 py-1 bg-indigo-600 text-white rounded"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-3 py-1 border rounded"
                >
                  Close
                </button>
              </div>
            </div>

            <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-auto">
              {JSON.stringify(reportData, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card p-6">
        <h3 className="font-semibold text-primary mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left transition-all">
            <div className="flex items-center gap-3">
              <div className="text-2xl">📅</div>
              <div>
                <div className="font-semibold text-primary">Rental Calendar</div>
                <div className="text-sm text-secondary">View bookings and availability</div>
              </div>
            </div>
          </button>

          <button className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 text-left transition-all">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🔧</div>
              <div>
                <div className="font-semibold text-primary">Maintenance Schedule</div>
                <div className="text-sm text-secondary">Schedule tool maintenance</div>
              </div>
            </div>
          </button>

          <button className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-left transition-all">
            <div className="flex items-center gap-3">
              <div className="text-2xl">📊</div>
              <div>
                <div className="font-semibold text-primary">Revenue Report</div>
                <div className="text-sm text-secondary">Track rental and sales revenue</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HardwareToolsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Use the business permissions context for proper business management
  const {
    currentBusiness,
    currentBusinessId,
    isAuthenticated,
    loading: businessLoading,
    businesses
  } = useBusinessPermissionsContext()

  // Check if current business is a hardware business
  const isHardwareBusiness = currentBusiness?.businessType === 'hardware'

  // Redirect to signin if not authenticated
  React.useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  // Show loading while session or business context is loading
  if (status === 'loading' || businessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Don't render if no session or no business access
  if (!session || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need to be logged in to use the tools and equipment management.</p>
        </div>
      </div>
    )
  }

  // Check if user has any hardware businesses
  const hardwareBusinesses = businesses.filter(b => b.businessType === 'hardware' && b.isActive)
  const hasHardwareBusinesses = hardwareBusinesses.length > 0

  // If no current business selected and user has hardware businesses, show selection prompt
  if (!currentBusiness && hasHardwareBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Hardware Business</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You have access to {hardwareBusinesses.length} hardware business{hardwareBusinesses.length > 1 ? 'es' : ''}.
            Please select one from the sidebar to use the tools and equipment management.
          </p>
          <div className="space-y-2">
            {hardwareBusinesses.slice(0, 3).map(business => (
              <div key={business.businessId} className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{business.businessName}</p>
                <p className="text-sm text-gray-600">Role: {business.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // If current business is not hardware, show error
  if (currentBusiness && !isHardwareBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Wrong Business Type</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The Tools & Equipment Management is only available for hardware businesses. Your current business "{currentBusiness.businessName}" is a {currentBusiness.businessType} business.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Please select a hardware business from the sidebar to use this system.
          </p>
        </div>
      </div>
    )
  }

  // If no hardware businesses at all, show message
  if (!hasHardwareBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Hardware Businesses</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You don't have access to any hardware businesses. The Tools & Equipment Management requires access to at least one hardware business.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Contact your administrator if you need access to hardware businesses.
          </p>
        </div>
      </div>
    )
  }

  // At this point, we have a valid hardware business selected
  const businessId = currentBusinessId!

  return (
    <BusinessProvider businessId={businessId}>
      <BusinessTypeRoute requiredBusinessType="hardware">
        <ContentLayout
          title="Tools & Equipment"
          subtitle="Manage tool rentals, sales, and equipment inventory"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Hardware Store', href: '/hardware' },
            { label: 'Tools & Equipment', isActive: true }
          ]}
        >
          <ToolsContent />
        </ContentLayout>
      </BusinessTypeRoute>
    </BusinessProvider>
  )
}