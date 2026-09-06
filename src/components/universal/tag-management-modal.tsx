'use client'

import { useState, useEffect, useMemo } from 'react'
import { useToastContext } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-modal'
import { EmojiPickerEnhanced } from '@/components/business/emoji-picker-enhanced'

interface TagRow {
  id: string
  name: string
  emoji: string
  groupLabel: string | null
  isSystem: boolean
  imageCount: number
  productCount: number
}

interface Props {
  businessId: string
  /** Called on close; `changed` is true if any tag was renamed, merged,
   * deleted, or created — worth refreshing the gallery's own tag
   * filter/autocomplete. */
  onClose: (changed: boolean) => void
}

const CUSTOM_GROUP = 'Your Tags'

/**
 * Standalone Tag management surface (MBM-294 §9.3, MBM-295 emoji/system-tag
 * expansion) — rename, merge, and delete a business's own tags; browse the
 * shared vocabulary (system tags, read-only here — see MBM-295 plan §3.3)
 * grouped the same way the source vocabulary itself is organized (Fabric,
 * Pattern, Occasion, etc.); create new business-owned tags with an emoji.
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
  const [filterQuery, setFilterQuery] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set([CUSTOM_GROUP]))
  const [showNewTagForm, setShowNewTagForm] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagEmoji, setNewTagEmoji] = useState('')
  const [creatingTag, setCreatingTag] = useState(false)

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

  const filtered = useMemo(() => {
    const q = filterQuery.trim().toLowerCase()
    return q ? tags.filter(t => t.name.toLowerCase().includes(q)) : tags
  }, [tags, filterQuery])

  const groups = useMemo(() => {
    const byGroup = new Map<string, TagRow[]>()
    for (const t of filtered) {
      const key = t.groupLabel ?? CUSTOM_GROUP
      if (!byGroup.has(key)) byGroup.set(key, [])
      byGroup.get(key)!.push(t)
    }
    // Custom tags last, predefined groups alphabetical before that.
    const keys = Array.from(byGroup.keys()).sort((a, b) => {
      if (a === CUSTOM_GROUP) return 1
      if (b === CUSTOM_GROUP) return -1
      return a.localeCompare(b)
    })
    return keys.map(key => ({ key, items: byGroup.get(key)! }))
  }, [filtered])

  function toggleGroup(key: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

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
      description: `Everything tagged "${tag.name}" (${tag.imageCount} image${tag.imageCount === 1 ? '' : 's'}, ${tag.productCount} product${tag.productCount === 1 ? '' : 's'}) will be tagged "${target.name}" instead, and "${tag.name}" will be deleted. This cannot be undone.`,
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
      description: (tag.imageCount > 0 || tag.productCount > 0)
        ? `"${tag.name}" is used on ${tag.imageCount} image${tag.imageCount === 1 ? '' : 's'} and ${tag.productCount} product${tag.productCount === 1 ? '' : 's'}. Deleting it removes the tag from all of them (the images/products themselves are not affected). This cannot be undone.`
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

  async function handleCreateTag() {
    const name = newTagName.trim()
    if (!name) return
    setCreatingTag(true)
    try {
      const res = await fetch(`/api/business/${businessId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, emoji: newTagEmoji || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to create tag')
      toast.push(`Created "${name}"`)
      setChanged(true)
      setShowNewTagForm(false)
      setNewTagName('')
      setNewTagEmoji('')
      await load()
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to create tag')
    } finally {
      setCreatingTag(false)
    }
  }

  function renderTagRow(tag: TagRow) {
    return (
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
            <p className="text-xs text-secondary">Merge <strong>{tag.emoji} {tag.name}</strong> into:</p>
            <div className="flex items-center gap-2">
              <select
                value={mergeTargetId}
                onChange={e => setMergeTargetId(e.target.value)}
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-primary text-xs"
              >
                <option value="">Select a tag…</option>
                {tags.filter(t => t.id !== tag.id).map(t => (
                  <option key={t.id} value={t.id}>{t.emoji} {t.name} ({t.imageCount + t.productCount})</option>
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
            <div className="min-w-0">
              <span className="font-medium text-primary">{tag.emoji} {tag.name}</span>
              {tag.isSystem && (
                <span title="Shared system tag — not editable from here" className="ml-1.5 text-xs text-secondary">🔒</span>
              )}
              <span className="ml-2 text-xs text-secondary">
                {tag.imageCount} image{tag.imageCount === 1 ? '' : 's'} · {tag.productCount} product{tag.productCount === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                onClick={() => startRename(tag)}
                disabled={busyId === tag.id || tag.isSystem}
                title={tag.isSystem ? 'System tags cannot be renamed here' : undefined}
                className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40"
              >
                Rename
              </button>
              {tags.length > 1 && (
                <button
                  onClick={() => startMerge(tag)}
                  disabled={busyId === tag.id || tag.isSystem}
                  title={tag.isSystem ? 'System tags cannot be merged away here' : undefined}
                  className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40"
                >
                  Merge
                </button>
              )}
              <button
                onClick={() => handleDelete(tag)}
                disabled={busyId === tag.id || tag.isSystem}
                title={tag.isSystem ? 'System tags cannot be deleted here' : undefined}
                className="text-xs px-2 py-1 rounded border border-red-300 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => onClose(changed)}>
      <div className="card w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-primary">🏷️ Manage Tags</h3>
          <button onClick={() => onClose(changed)} className="text-secondary hover:text-primary text-lg leading-none">✕</button>
        </div>

        <input
          type="text"
          value={filterQuery}
          onChange={e => setFilterQuery(e.target.value)}
          placeholder="Search tags…"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-primary"
        />

        {!showNewTagForm ? (
          <button
            onClick={() => setShowNewTagForm(true)}
            className="w-full text-center py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
          >
            + New Tag
          </button>
        ) : (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
            <input
              autoFocus
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              placeholder="Tag name"
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-primary"
            />
            <EmojiPickerEnhanced
              onSelect={setNewTagEmoji}
              selectedEmoji={newTagEmoji}
              searchPlaceholder="Search for an emoji, or leave blank for 🏷️…"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || creatingTag}
                className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
              >
                {creatingTag ? 'Creating…' : 'Create'}
              </button>
              <button
                onClick={() => { setShowNewTagForm(false); setNewTagName(''); setNewTagEmoji('') }}
                className="flex-1 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-secondary">Loading…</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-secondary">No tags match "{filterQuery}".</p>
        ) : (
          <div className="space-y-3">
            {groups.map(g => {
              const isExpanded = expandedGroups.has(g.key) || !!filterQuery.trim()
              return (
                <div key={g.key}>
                  <button
                    onClick={() => toggleGroup(g.key)}
                    className="w-full flex items-center justify-between text-left text-xs font-semibold text-secondary uppercase tracking-wide py-1"
                  >
                    <span>{g.key} ({g.items.length})</span>
                    <span>{isExpanded ? '▲' : '▼'}</span>
                  </button>
                  {isExpanded && (
                    <div className="space-y-2 mt-1">
                      {g.items.map(renderTagRow)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <button onClick={() => onClose(changed)} className="w-full text-center py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
          Close
        </button>
      </div>
    </div>
  )
}
