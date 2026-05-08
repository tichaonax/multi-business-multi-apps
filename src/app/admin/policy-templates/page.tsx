'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { useAlert } from '@/components/ui/confirm-modal'

const POLICY_CATEGORIES = ['HR', 'SAFETY', 'IT', 'FINANCE', 'CODE_OF_CONDUCT', 'OTHER']

interface PolicyTemplate {
  id: string
  title: string
  category: string
  description: string | null
  content: string
  isActive: boolean
  createdAt: string
}

interface FormData {
  title: string
  category: string
  description: string
  content: string
  isActive: boolean
}

const emptyForm: FormData = {
  title: '',
  category: 'HR',
  description: '',
  content: '',
  isActive: true,
}

export default function PolicyTemplatesAdminPage() {
  const { data: session } = useSession()
  const customAlert = useAlert()
  const [templates, setTemplates] = useState<PolicyTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalTab, setModalTab] = useState<'edit' | 'preview'>('edit')
  const [editing, setEditing] = useState<PolicyTemplate | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const user = session?.user as { role?: string } | undefined

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    setLoading(true)
    try {
      const res = await fetch('/api/policy-templates')
      if (res.ok) {
        const data = await res.json()
        setTemplates(data)
      }
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setModalTab('edit')
    setShowModal(true)
  }

  function openEdit(t: PolicyTemplate) {
    setEditing(t)
    setForm({
      title: t.title,
      category: t.category,
      description: t.description ?? '',
      content: t.content,
      isActive: t.isActive,
    })
    setModalTab('edit')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.content.trim()) {
      customAlert({ title: 'Validation', message: 'Title and content are required.' })
      return
    }
    setSaving(true)
    try {
      const url = editing ? `/api/policy-templates/${editing.id}` : '/api/policy-templates'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        customAlert({ title: 'Error', message: err.error ?? 'Failed to save template.' })
        return
      }
      setShowModal(false)
      fetchTemplates()
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(t: PolicyTemplate) {
    const confirmed = await customAlert({
      title: 'Deactivate Template',
      message: `Deactivate "${t.title}"? It will no longer appear in the template picker.`,
      confirmText: 'Deactivate',
      confirmVariant: 'danger',
    })
    if (!confirmed) return
    await fetch(`/api/policy-templates/${t.id}`, { method: 'DELETE' })
    fetchTemplates()
  }

  async function handleRestore(t: PolicyTemplate) {
    await fetch(`/api/policy-templates/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: true }),
    })
    fetchTemplates()
  }

  const filtered = templates.filter(t => {
    if (!showInactive && !t.isActive) return false
    if (categoryFilter && t.category !== categoryFilter) return false
    if (searchTerm && !t.title.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  // Render preview content: substitute {{BUSINESS_NAME}} with a placeholder
  const previewHtml = form.content.replace(/\{\{BUSINESS_NAME\}\}/g, '[Your Business Name]')

  if (user?.role !== 'admin') {
    return (
      <ContentLayout title="Policy Templates">
        <div className="p-6 text-red-600 dark:text-red-400">Admin access required.</div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout title="Policy Templates">
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage global policy templates available to all businesses.</p>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + New Template
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search by title..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm w-56 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Categories</option>
            {POLICY_CATEGORIES.map(c => (
              <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
            />
            Show inactive
          </label>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400 dark:text-gray-500">No templates found.</div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{t.title}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 text-xs font-medium">
                        {t.category.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">{t.description ?? '—'}</td>
                    <td className="px-4 py-3">
                      {t.isActive ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">Active</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => openEdit(t)}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                      >
                        Edit
                      </button>
                      {t.isActive ? (
                        <button
                          onClick={() => handleDeactivate(t)}
                          className="text-red-500 dark:text-red-400 hover:underline text-xs"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestore(t)}
                          className="text-green-600 dark:text-green-400 hover:underline text-xs"
                        >
                          Restore
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">

            {/* Modal header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editing ? 'Edit Template' : 'New Template'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Edit / Preview tabs */}
            <div className="flex border-b border-gray-100 dark:border-gray-700 px-6">
              <button
                onClick={() => setModalTab('edit')}
                className={`py-2.5 px-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  modalTab === 'edit'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => setModalTab('preview')}
                className={`py-2.5 px-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  modalTab === 'preview'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                👁️ Preview
              </button>
            </div>

            {/* Edit pane */}
            {modalTab === 'edit' && (
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    placeholder="e.g. Employee Code of Conduct"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {POLICY_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    placeholder="Short description (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Content *{' '}
                    <span className="text-gray-400 dark:text-gray-500 font-normal">
                      (HTML supported — use {`{{BUSINESS_NAME}}`} for business name substitution)
                    </span>
                  </label>
                  <textarea
                    value={form.content}
                    onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    rows={14}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    placeholder="<p>This policy applies to all employees of {{BUSINESS_NAME}}...</p>"
                  />
                </div>

                {editing && (
                  <div>
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                      />
                      Active (visible in template picker)
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Preview pane */}
            {modalTab === 'preview' && (
              <div className="p-6 overflow-y-auto flex-1">
                {/* Header info */}
                <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {form.title || <span className="text-gray-400 italic">Untitled</span>}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 text-xs font-medium">
                      {form.category.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {form.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{form.description}</p>
                  )}
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    ℹ️ {`{{BUSINESS_NAME}}`} shown as <strong>[Your Business Name]</strong>
                  </p>
                </div>

                {/* Rendered HTML content */}
                {form.content ? (
                  <div
                    className="prose prose-sm max-w-none text-gray-800 dark:text-gray-200
                      prose-headings:text-gray-900 dark:prose-headings:text-gray-100
                      prose-p:text-gray-700 dark:prose-p:text-gray-300
                      prose-li:text-gray-700 dark:prose-li:text-gray-300
                      prose-strong:text-gray-900 dark:prose-strong:text-gray-100
                      prose-a:text-blue-600 dark:prose-a:text-blue-400"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                ) : (
                  <div className="py-12 text-center text-gray-400 dark:text-gray-500 italic">No content to preview yet.</div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center gap-3">
              <div className="text-xs text-gray-400 dark:text-gray-500">
                {modalTab === 'preview' && 'Switch to Edit tab to make changes.'}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                {modalTab === 'preview' ? (
                  <button
                    onClick={() => setModalTab('edit')}
                    className="px-4 py-2 border border-blue-500 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30"
                  >
                    ← Back to Edit
                  </button>
                ) : null}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ContentLayout>
  )
}
