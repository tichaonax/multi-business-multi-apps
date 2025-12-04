'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { 
  ImportTemplateOptions, 
  ImportTemplateResult,
  SeedDataTemplate 
} from '@/types/seed-templates'
import type { PreviewResult, PreviewItem } from '@/app/api/admin/seed-templates/preview/route'
import type { DiffResult } from '@/app/api/admin/seed-templates/diff/route'
import { DiffViewer } from '@/components/admin/diff-viewer'

interface Business {
  id: string
  name: string
  type: string
}

export default function ImportSeedTemplatePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState('')
  const [importMode, setImportMode] = useState<'skip' | 'update' | 'new-only'>('skip')
  const [saveToDatabase, setSaveToDatabase] = useState(true)
  const [templateFile, setTemplateFile] = useState<File | null>(null)
  const [template, setTemplate] = useState<SeedDataTemplate | null>(null)
  
  const [isImporting, setIsImporting] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null)
  const [importResult, setImportResult] = useState<ImportTemplateResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [isComparing, setIsComparing] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null)

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setTemplateFile(file)
    setError(null)
    setTemplate(null)
    setImportResult(null)

    // Read and parse file
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        setTemplate(json as SeedDataTemplate)
      } catch (err) {
        setError('Invalid JSON file')
      }
    }
    reader.readAsText(file)
  }

  async function handlePreview() {
    if (!template) {
      setError('Please select a template file')
      return
    }
    if (!selectedBusinessId) {
      setError('Please select a target business')
      return
    }

    setIsPreviewing(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/seed-templates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template,
          targetBusinessId: selectedBusinessId,
          mode: importMode
        })
      })

      const result: PreviewResult = await res.json()

      if (result.success) {
        setPreviewResult(result)
        setShowPreview(true)
      } else {
        setError(result.error || 'Preview failed')
      }
    } catch (err: any) {
      setError(err.message || 'Preview failed')
    } finally {
      setIsPreviewing(false)
    }
  }

  async function handleCompare() {
    if (!template) {
      setError('Please select a template file')
      return
    }
    if (!selectedBusinessId) {
      setError('Please select a target business')
      return
    }

    setIsComparing(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/seed-templates/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template,
          targetBusinessId: selectedBusinessId
        })
      })

      const result: DiffResult = await res.json()

      if (result.success) {
        setDiffResult(result)
        setShowDiff(true)
      } else {
        setError(result.error || 'Comparison failed')
      }
    } catch (err: any) {
      setError(err.message || 'Comparison failed')
    } finally {
      setIsComparing(false)
    }
  }

  async function handleImport() {
    if (!template) {
      setError('Please select a template file')
      return
    }
    if (!selectedBusinessId) {
      setError('Please select a target business')
      return
    }

    const selectedBusiness = businesses.find(b => b.id === selectedBusinessId)
    if (selectedBusiness && selectedBusiness.type !== template.businessType) {
      setError(`Business type mismatch: business is ${selectedBusiness.type}, template is ${template.businessType}`)
      return
    }

    setIsImporting(true)
    setError(null)
    setImportResult(null)

    try {
      const options: ImportTemplateOptions = {
        template,
        targetBusinessId: selectedBusinessId,
        mode: importMode,
        saveToDatabase
      }

      const res = await fetch('/api/admin/seed-templates/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      })

      const result: ImportTemplateResult = await res.json()

      if (result.success) {
        setImportResult(result)
      } else {
        setError(result.error || 'Import failed')
        if (result.stats.errors) {
          if (Array.isArray(result.stats.errors) && result.stats.errors.length > 0) {
            console.error('Import errors:', result.stats.errors)
          } else if (typeof result.stats.errors === 'number' && result.stats.errors > 0) {
            console.error('Import had', result.stats.errors, 'errors')
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Import failed')
    } finally {
      setIsImporting(false)
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
          Import Seed Template
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Import products, categories, and subcategories from a seed template JSON file
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {importResult && (
        <div className="mb-6 p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <h2 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-3">
            ✓ Import Complete
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-green-800 dark:text-green-200">
                <strong>Categories:</strong> {importResult.stats.categoriesCreated} created
                {importResult.stats.categoriesSkipped !== undefined && `, ${importResult.stats.categoriesSkipped} skipped`}
              </p>
              <p className="text-green-800 dark:text-green-200">
                <strong>Subcategories:</strong> {importResult.stats.subcategoriesCreated} created
                {importResult.stats.subcategoriesSkipped !== undefined && `, ${importResult.stats.subcategoriesSkipped} skipped`}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-green-800 dark:text-green-200">
                <strong>Products:</strong> {importResult.stats.productsCreated} created
              </p>
              <p className="text-green-800 dark:text-green-200">
                <strong>Updated:</strong> {importResult.stats.productsUpdated} products
              </p>
              <p className="text-green-800 dark:text-green-200">
                <strong>Skipped:</strong> {importResult.stats.productsSkipped} products
              </p>
            </div>
          </div>
          {importResult.stats.errors && (
            Array.isArray(importResult.stats.errors) && importResult.stats.errors.length > 0 ? (
              <div className="mt-4">
                <p className="text-red-800 dark:text-red-200 font-semibold mb-2">
                  Errors ({importResult.stats.errors.length}):
                </p>
                <ul className="list-disc list-inside text-red-700 dark:text-red-300 text-sm space-y-1 max-h-40 overflow-y-auto">
                  {importResult.stats.errors.map((err: string, idx: number) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            ) : typeof importResult.stats.errors === 'number' && importResult.stats.errors > 0 ? (
              <div className="mt-4">
                <p className="text-red-800 dark:text-red-200">
                  {importResult.stats.errors} error(s) occurred during import
                </p>
              </div>
            ) : null
          )}
          {importResult.message && (
            <p className="mt-3 text-green-800 dark:text-green-200 font-medium">
              {importResult.message}
            </p>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Template File (JSON) *
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isImporting}
          />
          {templateFile && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Selected: {templateFile.name}
            </p>
          )}
        </div>

        {/* Template Preview */}
        {template && (
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Template Preview
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Name:</p>
                <p className="font-medium text-gray-900 dark:text-white">{template.metadata.name}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Version:</p>
                <p className="font-medium text-gray-900 dark:text-white">{template.version}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Business Type:</p>
                <p className="font-medium text-gray-900 dark:text-white">{template.businessType}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Products:</p>
                <p className="font-medium text-gray-900 dark:text-white">{template.products.length}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Categories:</p>
                <p className="font-medium text-gray-900 dark:text-white">{template.categories.length}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Subcategories:</p>
                <p className="font-medium text-gray-900 dark:text-white">{template.subcategories.length}</p>
              </div>
            </div>
            {template.metadata.description && (
              <div className="mt-3">
                <p className="text-gray-600 dark:text-gray-400 text-sm">Description:</p>
                <p className="text-gray-900 dark:text-white text-sm">{template.metadata.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Business Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target Business *
          </label>
          <select
            value={selectedBusinessId}
            onChange={(e) => setSelectedBusinessId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isImporting}
          >
            <option value="">Select a business...</option>
            {businesses
              .filter(b => !template || b.type === template.businessType)
              .map(business => (
                <option key={business.id} value={business.id}>
                  {business.name} ({business.type})
                </option>
              ))}
          </select>
          {selectedBusiness && template && selectedBusiness.type !== template.businessType && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              ⚠️ Business type mismatch: business is {selectedBusiness.type}, template is {template.businessType}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <div className="flex gap-3">
            <button
              onClick={handlePreview}
              disabled={isPreviewing || !template || !selectedBusinessId}
              className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isPreviewing ? 'Previewing...' : '👁️ Preview Changes'}
            </button>
            <button
              onClick={handleCompare}
              disabled={isComparing || !template || !selectedBusinessId}
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isComparing ? 'Comparing...' : '🔍 Compare with Existing'}
            </button>
          </div>
          <button
            onClick={handleImport}
            disabled={isImporting || !template || !selectedBusinessId}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isImporting ? 'Importing...' : 'Import Template'}
          </button>
        </div>
      </div>

      {/* Diff Viewer Modal */}
      {showDiff && diffResult && (
        <DiffViewer
          items={diffResult.items}
          onClose={() => setShowDiff(false)}
        />
      )}

      {/* Preview Modal */}
      {showPreview && previewResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Import Preview
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Review what will happen when you import this template
              </p>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Stats Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400">Will Create</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {previewResult.stats.categoriesCreate + previewResult.stats.subcategoriesCreate + previewResult.stats.productsCreate}
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    {previewResult.stats.categoriesCreate} cats, {previewResult.stats.productsCreate} products
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">Will Update</p>
                  <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                    {previewResult.stats.categoriesUpdate + previewResult.stats.subcategoriesUpdate + previewResult.stats.productsUpdate}
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    {previewResult.stats.productsUpdate} products
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Will Skip</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {previewResult.stats.categoriesSkip + previewResult.stats.subcategoriesSkip + previewResult.stats.productsSkip}
                  </p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                    {previewResult.stats.productsSkip} products
                  </p>
                </div>
              </div>

              {/* Preview Items (first 50) */}
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Changes ({previewResult.items.length} items)
                </h3>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {previewResult.items.slice(0, 50).map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded text-sm flex items-center justify-between ${
                        item.action === 'create'
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100'
                          : item.action === 'update'
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100'
                          : 'bg-gray-50 dark:bg-gray-900/20 text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <div>
                        <span className="font-medium">
                          {item.type === 'category' && '📁'}
                          {item.type === 'subcategory' && '📂'}
                          {item.type === 'product' && '📦'}
                          {' '}{item.name}
                        </span>
                      </div>
                      <span className="text-xs uppercase font-semibold">
                        {item.action}
                      </span>
                    </div>
                  ))}
                  {previewResult.items.length > 50 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                      ... and {previewResult.items.length - 50} more items
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  setShowPreview(false)
                  handleImport()
                }}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Proceed with Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
