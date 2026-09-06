'use client'

import { useState, useEffect } from 'react'
import { useToastContext } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-modal'

interface TagRow {
  id: string
  name: string
  imageCount: number
}

interface Props {
  businessId: string
  /** Called on close; `changed` is true if any tag was renamed, merged, or
   * deleted — worth refreshing the gallery's own tag filter/autocomplete. */
  onClose: (changed: boolean) => void
}

/**
 * Standalone Tag management surface (MBM-294 §9.3, deferred Phase 9
 * follow-up) — rename, merge, and delete a business's own tags. The
 * gallery's per-image add/remove and filter-by-tag already work without
 * this; this is purely for tag hygiene (typos, duplicates like "denim" vs
 * "Denim Jeans").
 */
export function TagManagementModal({ businessId, onClose }: Props) {
  const toast = useToastContext()
  const confirm = useConfirm()
  const [tags, setTags] = useState<TagRow[]>([])
  const [loading, setLoading] = useState(true)
  const [changed, setChanged] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [mergingId, setMergingId] = useState<string | null>(null)
  const [mergeTargetId, setMergeTargetId] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/business/${businessId}/tags`)
      const data = await res.json().catch(() => ({}))
      setTags(data?.tags ?? [])
    } catch {
      toast.error('Failed to load tags')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [businessId])

  function startRename(tag: TagRow) {
    setRenamingId(tag.id)
    setRenameValue(tag.name)
    setMergingId(null)
  }

  async function saveRename(tagId: string) {
    const name = renameValue.trim()
    if (!name) return
    setBusyId(tagId)
    try {
      const res = await fetch(`/api/business/${businessId}/tags/${tagId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to rename tag')
      setChanged(true)
      setRenamingId(null)
      await load()
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to rename tag')
    } finally {
      setBusyId(null)
    }
  }

  function startMerge(tag: TagRow) {
    setMergingId(tag.id)
    setMergeTargetId('')
    setRenamingId(null)
  }

  async function confirmMerge(tag: TagRow) {
    const target = tags.find(t => t.id === mergeTargetId)
    if (!target) return
    const ok = await confirm({
      title: 'Merge tags',
      description: `Every image tagged "${tag.name}" (${tag.imageCount}) will be tagged "${target.name}" instead, and "${tag.name}" will be deleted. This cannot be undone.`,
      confirmText: 'Merge',
      cancelText: 'Cancel',
    })
    if (!ok) return
    setBusyId(tag.id)
    try {
      const res = await fetch(`/api/business/${businessId}/tags/${tag.id}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intoTagId: mergeTargetId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to merge tags')
      toast.push(`Merged into "${target.name}"`)
      setChanged(true)
      setMergingId(null)
      await load()
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to merge tags')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(tag: TagRow) {
    const ok = await confirm({
      title: 'Delete tag',
      description: tag.imageCount > 0
        ? `"${tag.name}" is used on ${tag.imageCount} image${tag.imageCount === 1 ? '' : 's'}. Deleting it removes the tag from all of them (the images themselves are not affected). This cannot be undone.`
        : `Delete the unused tag "${tag.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
    })
    if (!ok) return
    setBusyId(tag.id)
    try {
      const res = await fetch(`/api/business/${businessId}/tags/${tag.id}`, { method: 'DELETE' })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? 'Failed to delete tag') }
      setChanged(true)
      await load()
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to delete tag')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => onClose(changed)}>
      <div className="card w-full max-w-md max-h-[85vh] overflow-y-auto p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-primary">🏷️ Manage Tags</h3>
          <button onClick={() => onClose(changed)} className="text-secondary hover:text-primary text-lg leading-none">✕</button>
        </div>

        {loading ? (
          <p className="text-sm text-secondary">Loading…</p>
        ) : tags.length === 0 ? (
          <p className="text-sm text-secondary">No tags yet — add one from an image's detail panel.</p>
        ) : (
          <div className="space-y-2">
            {tags.map(tag => (
              <div key={tag.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 text-sm">
                {renamingId === tag.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveRename(tag.id) }}
                      className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-primary"
                    />
                    <button onClick={() => saveRename(tag.id)} disabled={busyId === tag.id} className="text-xs px-2 py-1 rounded bg-blue-600 text-white disabled:opacity-50">Save</button>
                    <button onClick={() => setRenamingId(null)} className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-secondary">Cancel</button>
                  </div>
                ) : mergingId === tag.id ? (
                  <div className="space-y-2">
                    <p className="text-xs text-secondary">Merge <strong>{tag.name}</strong> into:</p>
                    <div className="flex items-center gap-2">
                      <select
                        value={mergeTargetId}
                        onChange={e => setMergeTargetId(e.target.value)}
                        className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-primary text-xs"
                      >
                        <option value="">Select a tag…</option>
                        {tags.filter(t => t.id !== tag.id).map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.imageCount})</option>
                        ))}
                      </select>
                      <button
                        onClick={() => confirmMerge(tag)}
                        disabled={!mergeTargetId || busyId === tag.id}
                        className="text-xs px-2 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
                      >
                        Merge
                      </button>
                      <button onClick={() => setMergingId(null)} className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-secondary">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-medium text-primary">{tag.name}</span>
                      <span className="ml-2 text-xs text-secondary">{tag.imageCount} image{tag.imageCount === 1 ? '' : 's'}</span>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => startRename(tag)} disabled={busyId === tag.id} className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">Rename</button>
                      {tags.length > 1 && (
                        <button onClick={() => startMerge(tag)} disabled={busyId === tag.id} className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">Merge</button>
                      )}
                      <button onClick={() => handleDelete(tag)} disabled={busyId === tag.id} className="text-xs px-2 py-1 rounded border border-red-300 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <button onClick={() => onClose(changed)} className="w-full text-center py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
          Close
        </button>
      </div>
    </div>
  )
}
