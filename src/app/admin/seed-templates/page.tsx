'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { TemplateListItem } from '@/types/seed-templates'

export default function SeedTemplatesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [templates, setTemplates] = useState<TemplateListItem[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<TemplateListItem[]>([])
  const [businessTypeFilter, setBusinessTypeFilter] = useState<string>('all')
  const [activeOnlyFilter, setActiveOnlyFilter] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated') {
      loadTemplates()
    }
  }, [status])

  useEffect(() => {
    filterTemplates()
  }, [templates, businessTypeFilter, activeOnlyFilter])

  async function loadTemplates() {
    try {
      setIsLoading(true)
      const res = await fetch('/api/admin/seed-templates')
      if (res.ok) {
        const data = await res.json()
        setTemplates(data)
      } else {
        setError('Failed to load templates')
      }
    } catch (err) {
      setError('Failed to load templates')
    } finally {
      setIsLoading(false)
    }
  }

  function filterTemplates() {
    let filtered = templates

    if (businessTypeFilter !== 'all') {
      filtered = filtered.filter(t => t.businessType === businessTypeFilter)
    }

    if (activeOnlyFilter) {
      filtered = filtered.filter(t => t.isActive)
    }

    setFilteredTemplates(filtered)
  }

  async function handleToggleActive(templateId: string, currentState: boolean) {
    try {
      const res = await fetch('/api/admin/seed-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: templateId, isActive: !currentState })
      })

      if (res.ok) {
        await loadTemplates()
      } else {
        setError('Failed to update template')
      }
    } catch (err) {
      setError('Failed to update template')
    }
  }

  async function handleSetDefault(templateId: string) {
    if (!confirm('Set this template as the default for its business type?')) return

    try {
      const res = await fetch('/api/admin/seed-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: templateId, isSystemDefault: true })
      })

      if (res.ok) {
        await loadTemplates()
      } else {
        setError('Failed to set default template')
      }
    } catch (err) {
      setError('Failed to set default template')
    }
  }

  async function handleDelete(templateId: string, templateName: string) {
    if (!confirm(`Delete template "${templateName}"? This cannot be undone.`)) return

    try {
      const res = await fetch(`/api/admin/seed-templates?id=${templateId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        await loadTemplates()
      } else {
        setError('Failed to delete template')
      }
    } catch (err) {
      setError('Failed to delete template')
    }
  }

  async function handleDownload(templateId: string, businessType: string, version: string) {
    try {
      const res = await fetch(`/api/admin/seed-templates/download?id=${templateId}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `seed-template-${businessType}-${version.replace(/\./g, '-')}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        setError('Failed to download template')
      }
    } catch (err) {
      setError('Failed to download template')
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

  const businessTypes = Array.from(new Set(templates.map(t => t.businessType)))

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Seed Templates
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage seed data templates for business initialization
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/seed-templates/bulk-export"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            Bulk Export
          </Link>
          <Link
            href="/admin/seed-templates/export"
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            Export New Template
          </Link>
          <Link
            href="/admin/seed-templates/import"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Import Template
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
            Business Type:
          </label>
          <select
            value={businessTypeFilter}
            onChange={(e) => setBusinessTypeFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            {businessTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={activeOnlyFilter}
            onChange={(e) => setActiveOnlyFilter(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Active only
          </span>
        </label>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {filteredTemplates.length} of {templates.length} templates
        </div>
      </div>

      {/* Templates List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-600 dark:text-gray-400">
          Loading templates...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No templates found
          </p>
          <Link
            href="/admin/seed-templates/export"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Create First Template
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTemplates.map(template => (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {template.name}
                    </h3>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded">
                      {template.businessType}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-medium rounded">
                      v{template.version}
                    </span>
                    {template.isSystemDefault && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium rounded">
                        ⭐ Default
                      </span>
                    )}
                    {!template.isActive && (
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs font-medium rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      {template.description}
                    </p>
                  )}
                  <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                    <span>{template.productCount} products</span>
                    <span>{template.categoryCount} categories</span>
                    <span>by {template.createdByName}</span>
                    {template.sourceBusinessName && (
                      <span>from {template.sourceBusinessName}</span>
                    )}
                    <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleDownload(template.id, template.businessType, template.version)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                    title="Download JSON"
                  >
                    📥 Download
                  </button>
                  <button
                    onClick={() => handleToggleActive(template.id, template.isActive)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      template.isActive
                        ? 'bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900 dark:hover:bg-yellow-800 text-yellow-800 dark:text-yellow-200'
                        : 'bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-800 dark:text-green-200'
                    }`}
                  >
                    {template.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  {!template.isSystemDefault && (
                    <button
                      onClick={() => handleSetDefault(template.id)}
                      className="px-3 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-lg text-sm font-medium transition-colors"
                      title="Set as default for this business type"
                    >
                      ⭐ Set Default
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(template.id, template.name)}
                    className="px-3 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-800 dark:text-red-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
