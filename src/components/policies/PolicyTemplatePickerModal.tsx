'use client'

import { useState, useEffect } from 'react'

interface Template {
  id: string
  title: string
  category: string
  description: string | null
  content: string
}

interface Props {
  businessId: string
  onClose: () => void
  onSuccess: (policy: any) => void
  onError: (msg: string) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  HR: 'HR', SAFETY: 'Safety', IT: 'IT', FINANCE: 'Finance', CODE_OF_CONDUCT: 'Code of Conduct', OTHER: 'Other',
}

const CATEGORY_COLORS: Record<string, string> = {
  HR: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  SAFETY: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  IT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  FINANCE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  CODE_OF_CONDUCT: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  OTHER: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

export default function PolicyTemplatePickerModal({ businessId, onClose, onSuccess, onError }: Props) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [using, setUsing] = useState<string | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('ALL')

  useEffect(() => {
    fetch('/api/policy-templates')
      .then(r => r.json())
      .then(setTemplates)
      .catch(() => onError('Failed to load templates'))
      .finally(() => setLoading(false))
  }, [])

  const handleUse = async (template: Template) => {
    setUsing(template.id)
    try {
      const res = await fetch(`/api/policy-templates/${template.id}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const data = await res.json()
      onSuccess(data.policy)
    } catch (e: any) {
      onError(e.message)
    } finally {
      setUsing(null)
    }
  }

  const categories = ['ALL', ...Array.from(new Set(templates.map(t => t.category)))]
  const filtered = categoryFilter === 'ALL' ? templates : templates.filter(t => t.category === categoryFilter)

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      {previewTemplate ? (
        // Template content preview
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{previewTemplate.title}</h2>
              <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[previewTemplate.category]}`}>
                {CATEGORY_LABELS[previewTemplate.category]}
              </span>
            </div>
            <button onClick={() => setPreviewTemplate(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
          </div>
          <div className="overflow-y-auto flex-1 p-6">
            <div
              className="prose dark:prose-invert max-w-none text-sm"
              dangerouslySetInnerHTML={{ __html: previewTemplate.content }}
            />
          </div>
          <div className="flex justify-between p-5 border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => setPreviewTemplate(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900">
              Back to Templates
            </button>
            <button
              onClick={() => handleUse(previewTemplate)}
              disabled={using === previewTemplate.id}
              className="px-5 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {using === previewTemplate.id ? 'Copying…' : 'Use This Template'}
            </button>
          </div>
        </div>
      ) : (
        // Template grid
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Choose a Policy Template</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
          </div>

          {/* Category filter */}
          <div className="px-5 py-3 flex gap-2 flex-wrap border-b border-gray-100 dark:border-gray-800">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                  categoryFilter === c
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {c === 'ALL' ? 'All' : CATEGORY_LABELS[c] ?? c}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto flex-1 p-5">
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading templates…</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filtered.map(t => (
                  <div key={t.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm leading-snug">{t.title}</h3>
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[t.category]}`}>
                        {CATEGORY_LABELS[t.category]}
                      </span>
                    </div>
                    {t.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">{t.description}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setPreviewTemplate(t)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Preview
                      </button>
                      <span className="text-gray-300 dark:text-gray-600">|</span>
                      <button
                        onClick={() => handleUse(t)}
                        disabled={!!using}
                        className="text-xs font-medium text-blue-700 dark:text-blue-300 hover:underline disabled:opacity-60"
                      >
                        {using === t.id ? 'Copying…' : 'Use Template'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Templates are pre-filled with your business name. You can edit all content before publishing.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
