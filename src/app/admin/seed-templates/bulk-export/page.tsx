'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { BulkExportResult } from '@/app/api/admin/seed-templates/bulk-export/route'

interface Business {
  id: string
  name: string
  type: string
}

export default function BulkExportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([])
  const [baseVersion, setBaseVersion] = useState('1.0.0')
  const [nameTemplate, setNameTemplate] = useState('{businessName} Template v{version}')
  const [zeroPrices, setZeroPrices] = useState(false)
  const [onlyActive, setOnlyActive] = useState(true)
  
  const [isExporting, setIsExporting] = useState(false)
  const [exportResult, setExportResult] = useState<BulkExportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated') {
      loadBusinesses()
    }
  }, [status])

  async function loadBusinesses() {
    try {
      const res = await fetch('/api/businesses')
      if (res.ok) {
        const data = await res.json()
        // API returns { businesses, isAdmin }
        if (data.businesses && Array.isArray(data.businesses)) {
          setBusinesses(data.businesses)
        } else {
          console.error('Businesses API returned invalid format:', data)
          setBusinesses([])
        }
      } else {
        console.error('Failed to fetch businesses:', res.status, res.statusText)
        setBusinesses([])
      }
    } catch (err) {
      console.error('Failed to load businesses:', err)
      setBusinesses([])
    }
  }

  function toggleBusiness(businessId: string) {
    setSelectedBusinessIds(prev =>
      prev.includes(businessId)
        ? prev.filter(id => id !== businessId)
        : [...prev, businessId]
    )
  }

  function selectAll() {
    if (Array.isArray(businesses)) {
      setSelectedBusinessIds(businesses.map(b => b.id))
    }
  }

  function deselectAll() {
    setSelectedBusinessIds([])
  }

  async function handleBulkExport() {
    if (selectedBusinessIds.length === 0) {
      setError('Please select at least one business')
      return
    }
    if (!baseVersion) {
      setError('Please enter a base version')
      return
    }

    setIsExporting(true)
    setError(null)
    setExportResult(null)

    try {
      const res = await fetch('/api/admin/seed-templates/bulk-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessIds: selectedBusinessIds,
          baseVersion,
          nameTemplate: nameTemplate || undefined,
          zeroPrices,
          onlyActive
        })
      })

      const result: BulkExportResult = await res.json()

      if (result.success || result.summary.successful > 0) {
        setExportResult(result)
      } else {
        setError(result.error || 'Bulk export failed')
      }
    } catch (err: any) {
      setError(err.message || 'Bulk export failed')
    } finally {
      setIsExporting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Bulk Export Templates
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Export seed templates from multiple businesses at once
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {exportResult && (
        <div className="mb-6 p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <h2 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-3">
            ✓ Bulk Export Complete
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-green-700 dark:text-green-300 text-sm">Total</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {exportResult.summary.total}
              </p>
            </div>
            <div>
              <p className="text-green-700 dark:text-green-300 text-sm">Successful</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {exportResult.summary.successful}
              </p>
            </div>
            <div>
              <p className="text-red-700 dark:text-red-300 text-sm">Failed</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                {exportResult.summary.failed}
              </p>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {exportResult.results.map((result, idx) => (
              <div
                key={idx}
                className={`p-3 rounded ${
                  result.success
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-red-100 dark:bg-red-900/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${
                      result.success
                        ? 'text-green-900 dark:text-green-100'
                        : 'text-red-900 dark:text-red-100'
                    }`}>
                      {result.businessName}
                    </p>
                    {result.success && result.stats && (
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {result.stats.products} products, {result.stats.categories} categories
                      </p>
                    )}
                    {!result.success && result.error && (
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Error: {result.error}
                      </p>
                    )}
                  </div>
                  <span className={`text-xl ${
                    result.success ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {result.success ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
        {/* Business Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Businesses ({selectedBusinessIds.length} selected)
            </label>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 rounded"
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded"
              >
                Deselect All
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            {businesses.map(business => (
              <label
                key={business.id}
                className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedBusinessIds.includes(business.id)}
                  onChange={() => toggleBusiness(business.id)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {business.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {business.type}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Export Settings */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Base Version *
          </label>
          <input
            type="text"
            value={baseVersion}
            onChange={(e) => setBaseVersion(e.target.value)}
            placeholder="1.0.0"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isExporting}
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            All templates will use this version
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Name Template
          </label>
          <input
            type="text"
            value={nameTemplate}
            onChange={(e) => setNameTemplate(e.target.value)}
            placeholder="{businessName} Template v{version}"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isExporting}
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Use {'{businessName}'} and {'{version}'} as placeholders
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={zeroPrices}
              onChange={(e) => setZeroPrices(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              disabled={isExporting}
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Zero out all prices (useful for demo templates)
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              disabled={isExporting}
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Only export active products
            </span>
          </label>
        </div>

        {/* Export Button */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleBulkExport}
            disabled={isExporting || selectedBusinessIds.length === 0 || !baseVersion}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isExporting ? `Exporting ${selectedBusinessIds.length} businesses...` : `Export ${selectedBusinessIds.length} Templates`}
          </button>
        </div>
      </div>
    </div>
  )
}
