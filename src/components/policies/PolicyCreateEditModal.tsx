'use client'

import { useState, useEffect } from 'react'

interface Policy {
  id: string
  title: string
  description: string | null
  category: string
  contentType: string
  status: string
  currentVersion: number
  versions?: Array<{ id: string; version: number; status: string; content?: string | null }>
}

interface Props {
  businessId: string
  policy?: Policy | null
  onClose: () => void
  onSuccess: (policy?: any) => void
  onError: (msg: string) => void
}

const CATEGORIES = [
  { value: 'HR', label: 'HR' },
  { value: 'SAFETY', label: 'Safety' },
  { value: 'IT', label: 'IT' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'CODE_OF_CONDUCT', label: 'Code of Conduct' },
  { value: 'OTHER', label: 'Other' },
]

export default function PolicyCreateEditModal({ businessId, policy, onClose, onSuccess, onError }: Props) {
  const [title, setTitle] = useState(policy?.title ?? '')
  const [description, setDescription] = useState(policy?.description ?? '')
  const [category, setCategory] = useState(policy?.category ?? 'HR')
  const [contentType, setContentType] = useState<'RICH_TEXT' | 'PDF'>(
    (policy?.contentType as any) ?? 'RICH_TEXT'
  )
  const [content, setContent] = useState<string>('')
  const [fileId, setFileId] = useState<string | null>(null)
  const [pdfFileName, setPdfFileName] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [changeNote, setChangeNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingContent, setLoadingContent] = useState(false)

  const isEditing = !!policy
  const isPublished = policy?.status === 'PUBLISHED'
  const draftVersion = policy?.versions?.find(v => v.status === 'DRAFT')

  // Load existing draft content if editing
  useEffect(() => {
    if (!policy) return
    setLoadingContent(true)
    fetch(`/api/policies/${policy.id}`)
      .then(r => r.json())
      .then(data => {
        const draft = data.versions?.find((v: any) => v.status === 'DRAFT')
        const published = data.versions?.find((v: any) => v.status === 'PUBLISHED')
        const source = draft ?? published
        setContent(source?.content ?? '')
        if (source?.fileId) {
          setFileId(source.fileId)
          setPdfFileName('Existing PDF')
        }
      })
      .catch(() => {})
      .finally(() => setLoadingContent(false))
  }, [policy?.id])

  const handleSave = async () => {
    if (!title.trim()) { onError('Title is required'); return }
    setSaving(true)
    try {
      if (!isEditing) {
        // Create new draft policy
        const res = await fetch('/api/policies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId, title, description, category, contentType }),
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
        const newPolicy = await res.json()

        // Save content/fileId to a draft version
        if (content || fileId) {
          await fetch(`/api/policies/${newPolicy.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, fileId }),
          })
          // Create the draft version row
          await fetch(`/api/policies/${newPolicy.id}/new-version`, { method: 'POST' })
        }
        onSuccess(newPolicy)
      } else {
        // Update existing policy fields (title, description, category only)
        await fetch(`/api/policies/${policy.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description, category }),
        })
        // If PUBLISHED and no draft version exists yet, create one first
        if (isPublished && !draftVersion) {
          await fetch(`/api/policies/${policy.id}/new-version`, { method: 'POST' })
        }
        // Now save content/fileId to draft version
        await fetch(`/api/policies/${policy.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, fileId }),
        })
        onSuccess()
      }
    } catch (e: any) {
      onError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!title.trim()) { onError('Title is required'); return }
    setSaving(true)
    try {
      if (!isEditing) {
        // Create then publish
        const res = await fetch('/api/policies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId, title, description, category, contentType }),
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
        const newPolicy = await res.json()
        const pubRes = await fetch(`/api/policies/${newPolicy.id}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, fileId, changeNote }),
        })
        if (!pubRes.ok) { const d = await pubRes.json(); throw new Error(d.error) }
        onSuccess(newPolicy)
      } else {
        // Save title/description/category changes before publishing
        await fetch(`/api/policies/${policy.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description, category }),
        })
        const pubRes = await fetch(`/api/policies/${policy.id}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, fileId, changeNote }),
        })
        if (!pubRes.ok) { const d = await pubRes.json(); throw new Error(d.error) }
        onSuccess()
      }
    } catch (e: any) {
      onError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isEditing
                ? isPublished
                  ? `Editing Draft of v${(policy.currentVersion ?? 0) + 1} — v${policy.currentVersion} is still live`
                  : `Edit Draft — ${policy.title}`
                : 'New Policy'}
            </h2>
            {isPublished && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                The current published version remains live until you publish this draft.
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold">×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="e.g. Employee Code of Conduct"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                disabled={isPublished}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-60"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content Type</label>
              <select
                value={contentType}
                onChange={e => setContentType(e.target.value as any)}
                disabled={isEditing}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-60"
              >
                <option value="RICH_TEXT">Rich Text (write in editor)</option>
                <option value="PDF">PDF Upload</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Short summary shown in the policy list"
            />
          </div>

          {contentType === 'RICH_TEXT' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Policy Content</label>
              {loadingContent ? (
                <div className="text-sm text-gray-400 py-4 text-center">Loading content…</div>
              ) : (
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={18}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y"
                  placeholder="Write your policy content here. HTML formatting is supported (e.g. <h2>, <p>, <ul>)."
                />
              )}
            </div>
          )}

          {contentType === 'PDF' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PDF File</label>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                {fileId && pdfFileName ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="text-red-500">📄</span>
                      <span className="truncate max-w-xs">{pdfFileName}</span>
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Uploaded</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setFileId(null); setPdfFileName(null) }}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center gap-2 cursor-pointer">
                    <span className="text-2xl">📄</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {uploading ? 'Uploading…' : 'Click to select a PDF file (max 20 MB)'}
                    </span>
                    <input
                      type="file"
                      accept="application/pdf"
                      disabled={uploading || !policy?.id}
                      className="sr-only"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (!policy?.id) { onError('Save the draft first before uploading a PDF'); return }
                        setUploading(true)
                        try {
                          const form = new FormData()
                          form.append('file', file)
                          const res = await fetch(`/api/policies/${policy.id}/upload`, { method: 'POST', body: form })
                          if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
                          const { fileId: newFileId } = await res.json()
                          setFileId(newFileId)
                          setPdfFileName(file.name)
                        } catch (err: any) {
                          onError(err.message)
                        } finally {
                          setUploading(false)
                          e.target.value = ''
                        }
                      }}
                    />
                  </label>
                )}
                {!policy?.id && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 text-center">
                    Save as draft first, then re-open to upload the PDF.
                  </p>
                )}
              </div>
            </div>
          )}

          {isEditing && isPublished && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Change Note (optional)</label>
              <input
                type="text"
                value={changeNote}
                onChange={e => setChangeNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="e.g. Updated disciplinary section to reflect new legislation"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-5 border-t border-gray-200 dark:border-gray-700 gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            Cancel
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button
              onClick={handlePublish}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              {saving ? 'Publishing…' : isPublished ? 'Publish New Version' : 'Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
