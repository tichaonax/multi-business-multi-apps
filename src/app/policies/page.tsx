'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import PolicyCreateEditModal from '@/components/policies/PolicyCreateEditModal'
import PolicyTemplatePickerModal from '@/components/policies/PolicyTemplatePickerModal'
import PolicyAssignModal from '@/components/policies/PolicyAssignModal'
import PolicyComplianceDrawer from '@/components/policies/PolicyComplianceDrawer'
import PolicyPreviewModal from '@/components/policies/PolicyPreviewModal'

interface Policy {
  id: string
  title: string
  description: string | null
  category: string
  contentType: string
  status: string
  currentVersion: number
  isPublic: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  createdBy: { id: string; name: string }
  versions: Array<{ id: string; version: number; status: string; publishedAt: string | null; changeNote: string | null }>
  assignedCount: number
  acknowledgedCount: number
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  PUBLISHED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  ARCHIVED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

const CATEGORY_LABELS: Record<string, string> = {
  HR: 'HR',
  SAFETY: 'Safety',
  IT: 'IT',
  FINANCE: 'Finance',
  CODE_OF_CONDUCT: 'Code of Conduct',
  OTHER: 'Other',
}

export default function PoliciesPage() {
  const { data: session } = useSession()
  const { currentBusinessId, hasPermission, isSystemAdmin } = useBusinessPermissionsContext()

  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null)
  const [previewPolicy, setPreviewPolicy] = useState<Policy | null>(null)
  const [assigningPolicy, setAssigningPolicy] = useState<Policy | null>(null)
  const [reportPolicy, setReportPolicy] = useState<Policy | null>(null)
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)

  const canManage = isSystemAdmin || hasPermission('canManagePolicies')

  const fetchPolicies = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ businessId: currentBusinessId })
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      const res = await fetch(`/api/policies?${params}`)
      if (!res.ok) throw new Error('Failed to load policies')
      setPolicies(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, statusFilter])

  useEffect(() => { fetchPolicies() }, [fetchPolicies])

  const handlePublish = async (policy: Policy) => {
    try {
      const res = await fetch(`/api/policies/${policy.id}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setSuccess(`"${policy.title}" published successfully.`)
      fetchPolicies()
    } catch (e: any) { setError(e.message) }
  }

  const handleNewVersion = async (policy: Policy) => {
    try {
      const res = await fetch(`/api/policies/${policy.id}/new-version`, { method: 'POST' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const data = await res.json()
      if (data.message) setSuccess(data.message)
      setEditingPolicy(policy)
      fetchPolicies()
    } catch (e: any) { setError(e.message) }
  }

  const handleArchive = async (policy: Policy) => {
    if (!confirm(`Archive "${policy.title}"? It can no longer be assigned but existing assignments remain active.`)) return
    try {
      const res = await fetch(`/api/policies/${policy.id}/archive`, { method: 'POST' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setSuccess(`"${policy.title}" archived.`)
      fetchPolicies()
    } catch (e: any) { setError(e.message) }
  }

  const handleDelete = async (policy: Policy) => {
    if (!confirm(`Delete draft "${policy.title}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/policies/${policy.id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setSuccess(`"${policy.title}" deleted.`)
      fetchPolicies()
    } catch (e: any) { setError(e.message) }
  }

  const filteredPolicies = policies

  if (!canManage) {
    return (
      <ContentLayout title="Policies">
        <p className="text-gray-500 dark:text-gray-400">You do not have permission to manage policies.</p>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout title="Policy Management">
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm flex justify-between">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-bold">×</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-green-700 dark:text-green-300 text-sm flex justify-between">
          {success}
          <button onClick={() => setSuccess(null)} className="ml-2 font-bold">×</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplatePicker(true)}
            className="px-4 py-2 text-sm rounded-lg border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            + From Template
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            + New Policy
          </button>
        </div>
      </div>

      {/* Policy Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading policies…</div>
      ) : filteredPolicies.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No policies found.</p>
          <button onClick={() => setShowCreate(true)} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
            Create your first policy
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Version</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Assigned</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Acknowledged</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Last Updated</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredPolicies.map(policy => (
                <tr key={policy.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{policy.title}</div>
                    {policy.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-xs">{policy.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-600 dark:text-gray-400">{CATEGORY_LABELS[policy.category] ?? policy.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[policy.status]}`}>
                      {policy.status.charAt(0) + policy.status.slice(1).toLowerCase()}
                    </span>
                    {policy.versions.some(v => v.status === 'DRAFT') && policy.status === 'PUBLISHED' && (
                      <span className="ml-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        Draft v{policy.currentVersion + 1} pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {policy.currentVersion > 0 ? `v${policy.currentVersion}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{policy.assignedCount}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{policy.acknowledgedCount}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                    {new Date(policy.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 relative">
                    <button
                      onClick={() => setActionMenuOpen(actionMenuOpen === policy.id ? null : policy.id)}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                    >
                      ⋯
                    </button>
                    {actionMenuOpen === policy.id && (
                      <div
                        className="absolute right-0 top-8 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[160px] py-1"
                        onClick={() => setActionMenuOpen(null)}
                      >
                        <button onClick={() => setPreviewPolicy(policy)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                          Preview
                        </button>
                        {policy.status === 'DRAFT' && (
                          <>
                            <button onClick={() => setEditingPolicy(policy)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                              Edit
                            </button>
                            <button onClick={() => handlePublish(policy)} className="w-full text-left px-4 py-2 text-sm text-green-700 dark:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                              Publish
                            </button>
                            <button onClick={() => handleDelete(policy)} className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                              Delete
                            </button>
                          </>
                        )}
                        {policy.status === 'PUBLISHED' && (
                          <>
                            <button onClick={() => handleNewVersion(policy)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                              New Version
                            </button>
                            <button onClick={() => setAssigningPolicy(policy)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                              Assign to Employees
                            </button>
                            <button onClick={() => setReportPolicy(policy)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                              View Report
                            </button>
                            <button onClick={() => handleArchive(policy)} className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700">
                              Archive
                            </button>
                          </>
                        )}
                        {policy.status === 'ARCHIVED' && (
                          <button onClick={() => setReportPolicy(policy)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                            View History
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Close action menus when clicking outside */}
      {actionMenuOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setActionMenuOpen(null)} />
      )}

      {/* Modals */}
      {showCreate && (
        <PolicyCreateEditModal
          businessId={currentBusinessId!}
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); fetchPolicies(); setSuccess('Policy saved as draft.') }}
          onError={setError}
        />
      )}

      {showTemplatePicker && (
        <PolicyTemplatePickerModal
          businessId={currentBusinessId!}
          onClose={() => setShowTemplatePicker(false)}
          onSuccess={(policy) => {
            setShowTemplatePicker(false)
            setEditingPolicy(policy)
            fetchPolicies()
            setSuccess(`Template copied to draft — edit and publish when ready.`)
          }}
          onError={setError}
        />
      )}

      {editingPolicy && (
        <PolicyCreateEditModal
          businessId={currentBusinessId!}
          policy={editingPolicy}
          onClose={() => setEditingPolicy(null)}
          onSuccess={() => { setEditingPolicy(null); fetchPolicies(); setSuccess('Policy draft saved.') }}
          onError={setError}
        />
      )}

      {previewPolicy && (
        <PolicyPreviewModal
          policy={previewPolicy}
          onClose={() => setPreviewPolicy(null)}
        />
      )}

      {assigningPolicy && (
        <PolicyAssignModal
          policy={assigningPolicy}
          businessId={currentBusinessId!}
          onClose={() => setAssigningPolicy(null)}
          onSuccess={() => { setAssigningPolicy(null); fetchPolicies(); setSuccess(`Policy assigned successfully.`) }}
          onError={setError}
        />
      )}

      {reportPolicy && (
        <PolicyComplianceDrawer
          policy={reportPolicy}
          businessId={currentBusinessId!}
          onClose={() => setReportPolicy(null)}
        />
      )}
    </ContentLayout>
  )
}
