'use client'

import { useState } from 'react'
import { PolicyViewer } from './PolicyViewer'

interface PendingPolicy {
  assignmentId: string
  policyId: string
  policyVersion: number
  dueDate: string | null
  isOverdue: boolean
  policy: { id: string; title: string; category: string; contentType: string; currentVersion: number }
  content: string | null
  fileId: string | null
}

interface Props {
  pending: PendingPolicy[]
  onAllDone: () => void
  onError: (msg: string) => void
}

const DISCLAIMER = (title: string, version: number) =>
  `By clicking Acknowledge, I confirm that I have read and understood the ${title} (Version ${version}). I agree to comply with the policies set out in this document. I understand that failure to comply may result in disciplinary action up to and including termination of my employment. I acknowledge that I may end my employment if I disagree with the terms of this policy.`

const CATEGORY_LABELS: Record<string, string> = {
  HR: 'HR', SAFETY: 'Safety', IT: 'IT', FINANCE: 'Finance', CODE_OF_CONDUCT: 'Code of Conduct', OTHER: 'Other',
}

export function PolicyAcknowledgmentModal({ pending, onAllDone, onError }: Props) {
  const [index, setIndex] = useState(0)
  const [scrolledToEnd, setScrolledToEnd] = useState(false)
  const [saving, setSaving] = useState(false)

  const current = pending[index]
  if (!current) return null

  const total = pending.length
  const isLast = index === total - 1

  const handleAcknowledge = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/policies/${current.policyId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: current.assignmentId, scrolledToEnd }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }

      if (isLast) {
        onAllDone()
      } else {
        setIndex(i => i + 1)
        setScrolledToEnd(false)
      }
    } catch (e: any) {
      onError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const overdueDays = current.dueDate
    ? Math.floor((new Date().getTime() - new Date(current.dueDate).getTime()) / 86400000)
    : null

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          {/* Progress */}
          {total > 1 && (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex gap-1 flex-1">
                {pending.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${i < index ? 'bg-green-500' : i === index ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                Policy {index + 1} of {total}
              </span>
            </div>
          )}

          {current.isOverdue && overdueDays !== null && overdueDays > 0 && (
            <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
              This policy is {overdueDays} day{overdueDays !== 1 ? 's' : ''} overdue. You must acknowledge it before continuing.
            </div>
          )}

          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{current.policy.title}</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {CATEGORY_LABELS[current.policy.category]} · Version {current.policyVersion}
            </span>
            {current.dueDate && !current.isOverdue && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                Due by {new Date(current.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Please scroll through the entire document before you can acknowledge.
          </p>
        </div>

        {/* Policy content */}
        <PolicyViewer
          content={current.content}
          fileId={current.fileId}
          contentType={current.policy.contentType as any}
          onScrolledToEnd={() => setScrolledToEnd(true)}
          hasScrolledToEnd={scrolledToEnd}
        />

        {/* Disclaimer + Acknowledge */}
        <div className="p-5 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 italic leading-relaxed">
            {DISCLAIMER(current.policy.title, current.policyVersion)}
          </div>

          {!scrolledToEnd && (
            <p className="text-xs text-center text-amber-600 dark:text-amber-400">
              Scroll through the entire document to enable the Acknowledge button.
            </p>
          )}

          <button
            onClick={handleAcknowledge}
            disabled={!scrolledToEnd || saving}
            className={`w-full py-3 rounded-lg font-semibold text-sm transition-colors ${
              scrolledToEnd && !saving
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            {saving
              ? 'Recording acknowledgment…'
              : scrolledToEnd
                ? isLast ? 'Acknowledge & Continue' : `Acknowledge & Next (${total - index - 1} remaining)`
                : 'Scroll to bottom to acknowledge'}
          </button>
        </div>
      </div>
    </div>
  )
}
