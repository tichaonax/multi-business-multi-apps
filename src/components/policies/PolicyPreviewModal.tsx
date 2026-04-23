'use client'

import { useState, useEffect } from 'react'
import { PolicyViewer } from './PolicyViewer'
import { PolicyStatusBadge } from './PolicyStatusBadge'

interface Props {
  policy: { id: string; title: string; category: string; contentType: string; currentVersion: number; status: string }
  onClose: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  HR: 'HR', SAFETY: 'Safety', IT: 'IT', FINANCE: 'Finance', CODE_OF_CONDUCT: 'Code of Conduct', OTHER: 'Other',
}

export default function PolicyPreviewModal({ policy, onClose }: Props) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [scrolledToEnd, setScrolledToEnd] = useState(false)

  useEffect(() => {
    fetch(`/api/policies/${policy.id}`)
      .then(r => r.json())
      .then(data => {
        const draft = data.versions?.find((v: any) => v.status === 'DRAFT')
        const published = data.versions?.find((v: any) => v.status === 'PUBLISHED')
        const source = draft ?? published
        setContent(source?.content ?? null)
      })
      .catch(() => setContent(null))
      .finally(() => setLoading(false))
  }, [policy.id])

  const version = policy.status === 'DRAFT' ? 'Draft' : `v${policy.currentVersion}`

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Manager preview banner */}
        <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 px-5 py-2 rounded-t-xl">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 text-center">
            MANAGER PREVIEW — Not a real acknowledgment. No record will be saved.
          </p>
        </div>

        {/* Policy header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{policy.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <PolicyStatusBadge status={policy.status} />
                <span className="text-xs text-gray-500 dark:text-gray-400">{CATEGORY_LABELS[policy.category]} · {version}</span>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold flex-shrink-0">×</button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 py-12">Loading content…</div>
        ) : (
          <PolicyViewer
            content={content}
            fileId={null}
            contentType={policy.contentType as any}
            onScrolledToEnd={() => setScrolledToEnd(true)}
            hasScrolledToEnd={scrolledToEnd}
          />
        )}

        {/* Disclaimer preview */}
        <div className="p-4 mx-5 mb-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 italic">
          "By clicking Acknowledge, I confirm that I have read and understood the {policy.title} ({version}). I agree to comply with the policies set out in this document. I understand that failure to comply may result in disciplinary action up to and including termination of my employment. I acknowledge that I may end my employment if I disagree with the terms of this policy."
        </div>

        {/* Footer — preview close button only, no real acknowledgment */}
        <div className="flex justify-between items-center px-5 pb-5 gap-3">
          <div className="text-xs text-gray-400">
            {scrolledToEnd ? '✓ Scrolled to end' : 'Scroll through the document to test the scroll-gate'}
          </div>
          <button
            disabled={!scrolledToEnd}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              scrolledToEnd
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
            }`}
            onClick={onClose}
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  )
}
