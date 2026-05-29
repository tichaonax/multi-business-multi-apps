'use client'

export const dynamic = 'force-dynamic'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useToastContext } from '@/components/ui/toast'

interface LockRecord {
  id: string
  referenceType: string
  referenceValue: string
  originalQty: number | null
  importedQty: number
  isLocked: boolean
  autoLocked: boolean
  lockedAt: string | null
  lockReason: string | null
  notes: string | null
  updatedAt: string
}

type FilterMode = 'all' | 'locked' | 'unlocked'

function StatusChip({ lock }: { lock: LockRecord }) {
  if (lock.isLocked) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
        🔒 {lock.autoLocked ? 'Auto-Locked' : 'Locked'}
      </span>
    )
  }
  if (lock.originalQty != null && lock.importedQty >= lock.originalQty) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
        ✅ Complete
      </span>
    )
  }
  if (lock.importedQty > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
        🔄 Partial
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
      ○ New
    </span>
  )
}

function OriginalQtyCell({ lock, onSave }: { lock: LockRecord; onSave: (id: string, qty: number | null) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setDraft(lock.originalQty != null ? String(lock.originalQty) : '')
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 10)
  }

  async function commit() {
    const v = draft === '' ? null : parseInt(draft, 10)
    const next = v === null || isNaN(v) ? null : v
    if (next === lock.originalQty) { setEditing(false); return }
    setSaving(true)
    await onSave(lock.id, next)
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min="0"
        step="1"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className="w-20 px-1 py-0.5 border border-blue-400 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none"
        disabled={saving}
        autoFocus
      />
    )
  }

  return (
    <span
      onClick={startEdit}
      className="cursor-pointer text-xs px-1.5 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-400 transition-colors group"
      title="Click to set expected total quantity"
    >
      {lock.originalQty != null ? lock.originalQty : (
        <span className="text-gray-300 dark:text-gray-600 group-hover:text-blue-400 italic">set qty</span>
      )}
    </span>
  )
}

export default function ReferenceLockPage() {
  const toast = useToastContext()
  const [locks, setLocks] = useState<LockRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'ORDER' | 'TRACKING'>('all')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => { setPage(1) }, [filter, typeFilter, search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' })
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (filter === 'locked') params.set('locked', 'true')
      if (filter === 'unlocked') params.set('locked', 'false')
      if (search) params.set('search', search)

      const res = await fetch(`/api/warehouse/reference-locks?${params}`, { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setLocks(data.locks || [])
        setTotalPages(data.pagination?.pages || 1)
        setTotal(data.pagination?.total || 0)
      } else {
        toast.error(data.error || 'Failed to load')
      }
    } catch {
      toast.error('Failed to load')
    } finally {
      setLoading(false)
    }
  }, [page, filter, typeFilter, search])

  useEffect(() => { load() }, [load])

  async function updateOriginalQty(id: string, qty: number | null) {
    try {
      const res = await fetch(`/api/warehouse/reference-locks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ originalQty: qty }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Save failed'); return }
      setLocks(prev => prev.map(l => l.id === id ? { ...l, originalQty: data.lock.originalQty } : l))
      toast.push('Quantity updated')
    } catch {
      toast.error('Save failed')
    }
  }

  async function toggleLock(lock: LockRecord) {
    const newLocked = !lock.isLocked
    const lockReason = newLocked ? prompt('Lock reason (optional):') ?? undefined : undefined

    try {
      const res = await fetch(`/api/warehouse/reference-locks/${lock.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isLocked: newLocked, lockReason }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed'); return }
      setLocks(prev => prev.map(l => l.id === lock.id ? { ...l, ...data.lock } : l))
      toast.push(newLocked ? `🔒 Locked ${lock.referenceValue}` : `🔓 Unlocked ${lock.referenceValue}`)
    } catch {
      toast.error('Failed')
    }
  }

  const FILTERS: { key: FilterMode; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'locked', label: 'Locked' },
    { key: 'unlocked', label: 'Unlocked' },
  ]

  return (
    <ProtectedRoute>
      <ContentLayout title="Reference Locks">
        <div className="space-y-4">
          {/* Back */}
          <Link href="/warehouse" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Warehouse
          </Link>

          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Warehouse Reference Locks
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Track order and tracking numbers across imports. Set the expected total quantity — the system auto-locks once that quantity is fully received.
              Locked references are blocked from future imports.
            </p>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search by reference value…"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => { setSearchInput(''); setSearch('') }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Type filter */}
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
              {(['all', 'ORDER', 'TRACKING'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 font-medium transition-colors ${typeFilter === t ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  {t === 'all' ? 'All Types' : t}
                </button>
              ))}
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${filter === f.key ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >
                {f.label}
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-400 pb-2">{total} record{total !== 1 ? 's' : ''}</span>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading…</div>
            ) : locks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No lock records found. Import a batch to create them automatically.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        <th className="px-4 py-3 text-left text-gray-500 uppercase tracking-wider w-24">Type</th>
                        <th className="px-4 py-3 text-left text-gray-500 uppercase tracking-wider">Reference</th>
                        <th className="px-4 py-3 text-left text-gray-500 uppercase tracking-wider w-28">Expected Qty</th>
                        <th className="px-4 py-3 text-left text-gray-500 uppercase tracking-wider w-28">Received Qty</th>
                        <th className="px-4 py-3 text-left text-gray-500 uppercase tracking-wider w-28">Progress</th>
                        <th className="px-4 py-3 text-left text-gray-500 uppercase tracking-wider w-32">Status</th>
                        <th className="px-4 py-3 text-left text-gray-500 uppercase tracking-wider w-36">Last Updated</th>
                        <th className="px-4 py-3 text-left text-gray-500 uppercase tracking-wider w-28">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {locks.map(lock => {
                        const progress = lock.originalQty != null && lock.originalQty > 0
                          ? Math.min(100, Math.round((lock.importedQty / lock.originalQty) * 100))
                          : null

                        return (
                          <tr key={lock.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${lock.isLocked ? 'bg-red-50/40 dark:bg-red-900/10' : ''}`}>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${lock.referenceType === 'ORDER' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'}`}>
                                {lock.referenceType}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-gray-800 dark:text-gray-200 max-w-[200px]">
                              <span className="truncate block" title={lock.referenceValue}>{lock.referenceValue}</span>
                              {lock.lockReason && (
                                <span className="text-gray-400 italic normal-case font-sans" title={lock.lockReason}>
                                  {lock.lockReason.slice(0, 40)}{lock.lockReason.length > 40 ? '…' : ''}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <OriginalQtyCell lock={lock} onSave={updateOriginalQty} />
                            </td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                              {lock.importedQty > 0 ? lock.importedQty : <span className="text-gray-400">0</span>}
                            </td>
                            <td className="px-4 py-3">
                              {progress != null ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden" style={{ minWidth: 48 }}>
                                    <div
                                      className={`h-full rounded-full ${progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                  <span className="text-gray-500 whitespace-nowrap">{progress}%</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <StatusChip lock={lock} />
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              {new Date(lock.updatedAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => toggleLock(lock)}
                                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${lock.isLocked
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                                }`}
                              >
                                {lock.isLocked ? '🔓 Unlock' : '🔒 Lock'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500">
                    <span>Showing {locks.length} of {total}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40">Prev</button>
                      <span>{page} / {totalPages}</span>
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40">Next</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </ContentLayout>
    </ProtectedRoute>
  )
}
