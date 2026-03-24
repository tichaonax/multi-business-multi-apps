'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { ContentLayout } from '@/components/layout/content-layout'
import { useToastContext } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-modal'
import Link from 'next/link'

interface Draft {
  id: string
  title: string | null
  status: string
  isStockTakeMode: boolean
  createdAt: string
  business: { id: string; name: string }
  createdBy: { id: string; name: string; email: string }
}

export default function StockTakeDraftsAdminPage() {
  const { push: toast, error: toastError } = useToastContext()
  const confirm = useConfirm()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchDrafts = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/stock-take-drafts')
      .then(r => r.json())
      .then(d => setDrafts(d.data ?? []))
      .catch(() => toastError('Failed to load drafts'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchDrafts() }, [fetchDrafts])

  const handleDelete = async (draft: Draft) => {
    const ok = await confirm({
      title: 'Delete blocking draft?',
      description: `This will delete the stock take draft "${draft.title || 'Untitled'}" for ${draft.business.name}. Sales will be unblocked immediately.`,
      confirmText: 'Delete Draft',
      cancelText: 'Cancel'
    })
    if (!ok) return

    setDeletingId(draft.id)
    try {
      const res = await fetch('/api/admin/stock-take-drafts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draft.id })
      })
      const d = await res.json()
      if (d.success) {
        setDrafts(prev => prev.filter(dr => dr.id !== draft.id))
        toast(`Draft deleted — ${draft.business.name} sales unblocked`, { type: 'success' })
      } else {
        toastError(d.error || 'Delete failed')
      }
    } catch {
      toastError('Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <ContentLayout title="Blocking Stock Take Drafts">
      <div className="max-w-4xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Blocking Stock Take Drafts</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Drafts with stock take mode enabled block all sales for that business until deleted or submitted.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchDrafts} className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              Refresh
            </button>
            <Link href="/admin" className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              ← Admin
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-sm font-medium">No blocking drafts</p>
            <p className="text-xs mt-1">All businesses can process sales normally</p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-800 dark:text-amber-300">
              ⚠️ <span><strong>{drafts.length} business{drafts.length > 1 ? 'es' : ''}</strong> currently blocked from processing sales</span>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Business</th>
                    <th className="px-4 py-2.5 text-left">Draft Title</th>
                    <th className="px-4 py-2.5 text-left">Created By</th>
                    <th className="px-4 py-2.5 text-left">Created At</th>
                    <th className="px-4 py-2.5 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map(d => (
                    <tr key={d.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{d.business.name}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{d.title || <span className="text-gray-400 italic">Untitled</span>}</td>
                      <td className="px-4 py-3 text-gray-500">
                        <div>{d.createdBy.name}</div>
                        <div className="text-xs text-gray-400">{d.createdBy.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(d.createdAt).toLocaleDateString()}
                        <div className="text-xs text-gray-400">{new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDelete(d)}
                          disabled={deletingId === d.id}
                          className="text-xs font-semibold text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-40"
                        >
                          {deletingId === d.id ? '…' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </ContentLayout>
  )
}
