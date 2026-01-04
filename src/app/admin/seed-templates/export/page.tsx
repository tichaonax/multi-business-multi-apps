'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { 
  ExportTemplateOptions, 
  ExportTemplateResult,
  SeedDataTemplate 
} from '@/types/seed-templates'

interface Business {
  id: string
  name: string
  type: string
}

export default function ExportSeedTemplatePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [version, setVersion] = useState('1.0.0')
  const [description, setDescription] = useState('')
  const [exportNotes, setExportNotes] = useState('')
  
  // Export options
  const [zeroPrices, setZeroPrices] = useState(false)
  const [onlyActive, setOnlyActive] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [excludeSkuPattern, setExcludeSkuPattern] = useState('')
  const [updatedAfter, setUpdatedAfter] = useState('')
  
  const [isExporting, setIsExporting] = useState(false)
  const [exportResult, setExportResult] = useState<ExportTemplateResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load businesses on mount
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

  async function handleExport() {
    if (!selectedBusinessId) {
      setError('Please select a business')
      return
    }
    if (!templateName) {
      setError('Please enter a template name')
      return
    }
    if (!version) {
      setError('Please enter a version')
      return
    }

    setIsExporting(true)
    setError(null)
    setExportResult(null)

    try {
      const options: ExportTemplateOptions = {
        sourceBusinessId: selectedBusinessId,
        name: templateName,
        version,
        description: description || undefined,
        exportNotes: exportNotes || undefined,
        zeroPrices,
        onlyActive,
        categoryFilter: categoryFilter.length > 0 ? categoryFilter : undefined,
        excludeSkuPattern: excludeSkuPattern || undefined,
        updatedAfter: updatedAfter ? new Date(updatedAfter) : undefined
      }

      const res = await fetch('/api/admin/seed-templates/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      })

      const result: ExportTemplateResult = await res.json()

      if (result.success) {
        setExportResult(result)
      } else {
        setError(result.error || 'Export failed')
      }
    } catch (err: any) {
      setError(err.message || 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  async function handleDownload() {
    if (!exportResult?.templateId || !exportResult?.template) return

    try {
      const res = await fetch(`/api/admin/seed-templates/download?id=${exportResult.templateId}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const businessType = exportResult.template?.businessType || 'unknown'
        a.download = `seed-template-${businessType}-${version.replace(/\./g, '-')}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        setError('Download failed')
      }
    } catch (err) {
      setError('Download failed')
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

  const selectedBusiness = Array.isArray(businesses) 
    ? businesses.find(b => b.id === selectedBusinessId)
    : undefined

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Export Seed Template
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Export products, categories, and subcategories from a business to create a reusable seed template
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
            ✓ Export Successful
          </h2>
          <div className="space-y-2 text-green-800 dark:text-green-200 mb-4">
            <p><strong>Template ID:</strong> {exportResult.templateId}</p>
            <p><strong>Products:</strong> {exportResult.stats.products}</p>
            <p><strong>Categories:</strong> {exportResult.stats.categories}</p>
            <p><strong>Subcategories:</strong> {exportResult.stats.subcategories}</p>
            {exportResult.stats.fileSize !== undefined && exportResult.stats.fileSize > 0 && (
              <p><strong>File Size:</strong> {(exportResult.stats.fileSize / 1024).toFixed(2)} KB</p>
            )}
          </div>
          <button
            onClick={handleDownload}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            Download JSON File
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
        {/* Business Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Source Business *
          </label>
          <select
            value={selectedBusinessId}
            onChange={(e) => setSelectedBusinessId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isExporting}
          >
            <option value="">Select a business...</option>
            {businesses.map(business => (
              <option key={business.id} value={business.id}>
                {business.name} ({business.type})
              </option>
            ))}
          </select>
          {selectedBusiness && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Business Type: <strong>{selectedBusiness.type}</strong>
            </p>
          )}
        </div>

        {/* Template Info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Template Name *
          </label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="e.g., Clothing Store Starter Pack"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isExporting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Version *
          </label>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.0.0"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isExporting}
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Use semantic versioning (e.g., 1.0.0, 2.1.3)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what's included in this template..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isExporting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Export Notes
          </label>
          <textarea
            value={exportNotes}
            onChange={(e) => setExportNotes(e.target.value)}
            placeholder="Internal notes about this export..."
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isExporting}
          />
        </div>

        {/* Export Options */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Export Options
          </h3>
          
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

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Exclude SKU Pattern (regex)
            </label>
            <input
              type="text"
              value={excludeSkuPattern}
              onChange={(e) => setExcludeSkuPattern(e.target.value)}
              placeholder="^TEST-.*"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isExporting}
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Exclude products with SKUs matching this pattern
            </p>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Only products updated after
            </label>
            <input
              type="date"
              value={updatedAfter}
              onChange={(e) => setUpdatedAfter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isExporting}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleExport}
            disabled={isExporting || !selectedBusinessId || !templateName || !version}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isExporting ? 'Exporting...' : 'Export Template'}
          </button>
        </div>
      </div>
    </div>
  )
}
