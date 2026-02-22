'use client'

import { useState, useEffect } from 'react'

interface FundSource {
  id: string
  name: string
  emoji: string
  description: string | null
  usageCount: number
  isActive: boolean
}

interface FundSourceManagerProps {
  onUpdated?: () => void
}

export function FundSourceManager({ onUpdated }: FundSourceManagerProps) {
  const [sources, setSources] = useState<FundSource[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [newSource, setNewSource] = useState({ name: '', emoji: '👤', description: '' })
  const [editSource, setEditSource] = useState({ name: '', emoji: '👤', description: '' })
  const [saving, setSaving] = useState(false)

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/expense-account/fund-sources', { credentials: 'include' })
      const data = await res.json()
      setSources(data.data || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSources() }, [])

  const handleAdd = async () => {
    if (!newSource.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/expense-account/fund-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newSource.name.trim(),
          emoji: newSource.emoji || '👤',
          description: newSource.description.trim() || undefined,
        }),
      })
      if (res.ok) {
        setNewSource({ name: '', emoji: '👤', description: '' })
        setShowAddForm(false)
        fetchSources()
        onUpdated?.()
      }
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (source: FundSource) => {
    setEditingId(source.id)
    setEditSource({ name: source.name, emoji: source.emoji, description: source.description || '' })
  }

  const handleEdit = async (id: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/expense-account/fund-sources/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editSource.name.trim(),
          emoji: editSource.emoji || '👤',
          description: editSource.description.trim() || null,
        }),
      })
      if (res.ok) {
        setEditingId(null)
        fetchSources()
        onUpdated?.()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this fund source? It will no longer appear in deposit forms.')) return
    try {
      await fetch(`/api/expense-account/fund-sources/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      fetchSources()
      onUpdated?.()
    } catch {
      // ignore
    }
  }

  if (loading) {
    return <div className="animate-pulse h-10 bg-gray-100 dark:bg-gray-700 rounded" />
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Saved Fund Sources</h4>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            + Add new
          </button>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="p-3 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/10 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newSource.emoji}
              onChange={e => setNewSource({ ...newSource, emoji: e.target.value })}
              className="w-12 px-2 py-1.5 border border-border rounded text-center text-sm bg-background text-primary"
              maxLength={2}
              placeholder="👤"
            />
            <input
              type="text"
              value={newSource.name}
              onChange={e => setNewSource({ ...newSource, name: e.target.value })}
              placeholder="Name (e.g. Joe, Kurauone)"
              className="flex-1 px-3 py-1.5 border border-border rounded text-sm bg-background text-primary"
              maxLength={100}
            />
          </div>
          <input
            type="text"
            value={newSource.description}
            onChange={e => setNewSource({ ...newSource, description: e.target.value })}
            placeholder="Description (optional)"
            className="w-full px-3 py-1.5 border border-border rounded text-sm bg-background text-primary"
            maxLength={200}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !newSource.name.trim()}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setNewSource({ name: '', emoji: '👤', description: '' }) }}
              className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 border border-border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Source list */}
      {sources.length === 0 && !showAddForm && (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          No saved sources yet. Add sources like people or couriers who send you funds.
        </p>
      )}

      <div className="space-y-1">
        {sources.map(source => (
          <div key={source.id} className="flex items-center gap-2 p-2 border border-border rounded-lg bg-background">
            {editingId === source.id ? (
              <>
                <input
                  type="text"
                  value={editSource.emoji}
                  onChange={e => setEditSource({ ...editSource, emoji: e.target.value })}
                  className="w-10 px-1 py-1 border border-border rounded text-center text-sm bg-background text-primary"
                  maxLength={2}
                />
                <input
                  type="text"
                  value={editSource.name}
                  onChange={e => setEditSource({ ...editSource, name: e.target.value })}
                  className="flex-1 px-2 py-1 border border-border rounded text-sm bg-background text-primary"
                  maxLength={100}
                />
                <input
                  type="text"
                  value={editSource.description}
                  onChange={e => setEditSource({ ...editSource, description: e.target.value })}
                  placeholder="Description"
                  className="flex-1 px-2 py-1 border border-border rounded text-sm bg-background text-primary"
                  maxLength={200}
                />
                <button
                  type="button"
                  onClick={() => handleEdit(source.id)}
                  disabled={saving}
                  className="text-xs text-green-600 dark:text-green-400 hover:underline"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span className="text-lg">{source.emoji}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-primary truncate">{source.name}</span>
                  {source.description && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{source.description}</span>
                  )}
                </div>
                {source.usageCount > 0 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">{source.usageCount}x</span>
                )}
                <button
                  type="button"
                  onClick={() => startEdit(source)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(source.id)}
                  className="text-xs text-red-500 dark:text-red-400 hover:underline"
                >
                  Remove
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
