'use client'

import { useState, useEffect, useMemo } from 'react'

interface SCCategory { id: string; name: string; emoji: string }
interface SCGroup    { id: string; name: string; emoji: string; categories: SCCategory[] }

interface ServiceCategoryPickerProps {
  apiEndpoint: string        // e.g. '/api/payee-categories' or '/api/contractor-categories'
  value: string | null       // current serviceType (category name)
  onChange: (name: string, emoji: string) => void
}

export function ServiceCategoryPicker({ apiEndpoint, value, onChange }: ServiceCategoryPickerProps) {
  const [groups, setGroups] = useState<SCGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [selectedCatId, setSelectedCatId] = useState<string>('')
  const [suggestText, setSuggestText] = useState('')
  const [suggestOpen, setSuggestOpen] = useState(false)

  useEffect(() => {
    fetch(apiEndpoint, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data) setGroups(d.data) })
      .catch(() => {})
  }, [apiEndpoint])

  // Sync dropdowns when value set externally (edit mode)
  useEffect(() => {
    if (!value || groups.length === 0) {
      if (!value) { setSelectedGroupId(''); setSelectedCatId('') }
      return
    }
    for (const g of groups) {
      const cat = g.categories.find(c => c.name === value)
      if (cat) { setSelectedGroupId(g.id); setSelectedCatId(cat.id); return }
    }
  }, [value, groups])

  const selectedGroup = groups.find(g => g.id === selectedGroupId)

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId)
    setSelectedCatId('')
    onChange('', '')
  }

  const handleCategoryChange = (catId: string) => {
    setSelectedCatId(catId)
    const cat = selectedGroup?.categories.find(c => c.id === catId)
    if (cat) onChange(cat.name, cat.emoji)
    else onChange('', '')
  }

  const suggestResults = useMemo(() => {
    const q = suggestText.toLowerCase().trim()
    if (q.length < 2) return []
    const results: Array<{ group: SCGroup; cat: SCCategory }> = []
    for (const g of groups) {
      for (const c of g.categories) {
        if (c.name.toLowerCase().includes(q) || g.name.toLowerCase().includes(q)) {
          results.push({ group: g, cat: c })
        }
      }
    }
    return results.slice(0, 20)
  }, [groups, suggestText])

  const applySuggestion = (group: SCGroup, cat: SCCategory) => {
    setSelectedGroupId(group.id)
    setSelectedCatId(cat.id)
    onChange(cat.name, cat.emoji)
    setSuggestOpen(false)
    setSuggestText('')
  }

  return (
    <>
      {/* Suggest row */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">💡 Suggest:</span>
        <input
          type="text"
          value={suggestText}
          onChange={e => setSuggestText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (suggestText.trim().length >= 2) setSuggestOpen(true) } }}
          placeholder="Type to find matching categories..."
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="button"
          disabled={suggestText.trim().length < 2}
          onClick={() => setSuggestOpen(true)}
          className="px-3 py-1.5 text-xs font-medium border border-blue-400 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          Suggest 💡
        </button>
      </div>

      {/* Domain + Category dropdowns */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Domain</label>
          <select
            value={selectedGroupId}
            onChange={e => handleGroupChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
          >
            <option value="">— Select domain —</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
          <select
            value={selectedCatId}
            onChange={e => handleCategoryChange(e.target.value)}
            disabled={!selectedGroup}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm disabled:bg-gray-50 dark:disabled:bg-gray-800/50 disabled:cursor-not-allowed"
          >
            <option value="">— Select category —</option>
            {selectedGroup?.categories.map(c => (
              <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Suggest modal */}
      {suggestOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">💡 Suggested Categories</h3>
              <button
                type="button"
                onClick={() => setSuggestOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Based on: <span className="font-medium text-gray-700 dark:text-gray-300">&ldquo;{suggestText}&rdquo;</span>
              </p>
              {suggestResults.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No matching categories found</p>
              ) : (
                <ul className="space-y-1.5 max-h-80 overflow-y-auto">
                  {suggestResults.map(({ group, cat }) => (
                    <li key={cat.id}>
                      <button
                        type="button"
                        onClick={() => applySuggestion(group, cat)}
                        className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                          {group.emoji} {group.name}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {cat.emoji} {cat.name}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                type="button"
                onClick={() => setSuggestOpen(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
