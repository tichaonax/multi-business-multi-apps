'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { SearchableSelect } from '@/components/ui/searchable-select'

interface LabourService { id: string; name: string; emoji: string | null; customerRate: number | null }
interface LabourCategory { id: string; name: string; emoji: string | null; services: LabourService[] }

// Central labour-cost configuration screen (MBM-265) — sets the default
// customer-facing charge per service, independent of what the contractor
// performing that service is paid (that lives on the Contractors page's
// Authorized Services & Fees, i.e. Contractor Payment Settings).
export default function VehicleServiceLabourRatesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { currentBusinessId, hasPermission, isSystemAdmin } = useBusinessPermissionsContext()

  const canManage = isSystemAdmin || hasPermission('canAccessFinancialData')
  // Adding/renaming definitions edits a GLOBAL catalog shared by every
  // vehicle-service business (categories have businessId: null), so it's
  // gated tighter than per-business rate-setting — system admins only.
  const canManageDefinitions = isSystemAdmin
  // Hidden by default even for admins — revealed only after the explicit
  // "Manage Definitions" action below, so the controls never show up
  // as visual clutter for the common "just look up/set a rate" case.
  const [showManageControls, setShowManageControls] = useState(false)

  const [categories, setCategories] = useState<LabourCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Renaming an existing definition (name/emoji) — separate from rate editing
  // above so the two controls never collide on the same row. The rename
  // pencil only shows at all while editMode is on, so the list stays clean
  // for the common case of just looking up/setting a rate.
  const [editMode, setEditMode] = useState(false)
  const [editingName, setEditingName] = useState<Record<string, { name: string; emoji: string }>>({})
  const [savingNameId, setSavingNameId] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  // Adding a brand new definition. There is deliberately no delete — a
  // definition can be added or renamed, never removed (it may already be
  // referenced by historical jobs/tasks).
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ categoryId: '', name: '', emoji: '', customerRate: '' })
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Search matches a category name (shows all its services) or an individual
  // service name (shows just the matching ones within that category) — this
  // list can run to hundreds of services across dozens of categories with no
  // other way to find one.
  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return categories
    return categories
      .map(cat => {
        if (cat.name.toLowerCase().includes(q)) return cat
        const services = cat.services.filter(svc => svc.name.toLowerCase().includes(q))
        return services.length > 0 ? { ...cat, services } : null
      })
      .filter((cat): cat is LabourCategory => cat !== null)
  }, [categories, search])

  const fetchRates = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/vehicle-service/labour-rates?businessId=${currentBusinessId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load labour rates')
      setCategories(data.categories || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId])

  useEffect(() => { fetchRates() }, [fetchRates])

  const handleSave = async (subcategoryId: string) => {
    const value = editing[subcategoryId]
    const rate = parseFloat(value)
    if (isNaN(rate) || rate < 0) { setSaveError('Enter a valid non-negative amount'); return }
    setSavingId(subcategoryId)
    setSaveError(null)
    try {
      const res = await fetch('/api/vehicle-service/labour-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: currentBusinessId, subcategoryId, customerRate: rate }),
      })
      const data = await res.json()
      if (!res.ok) { setSaveError(data.error || 'Failed to save rate'); return }
      setEditing(prev => { const next = { ...prev }; delete next[subcategoryId]; return next })
      fetchRates()
    } catch {
      setSaveError('Connection error — please try again')
    } finally {
      setSavingId(null)
    }
  }

  const handleSaveName = async (subcategoryId: string) => {
    const draft = editingName[subcategoryId]
    if (!draft || !draft.name.trim()) { setNameError('Enter a service name'); return }
    setSavingNameId(subcategoryId)
    setNameError(null)
    try {
      const res = await fetch('/api/vehicle-service/labour-rates/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: currentBusinessId, subcategoryId, name: draft.name.trim(), emoji: draft.emoji.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) { setNameError(data.error || 'Failed to rename service'); return }
      setEditingName(prev => { const next = { ...prev }; delete next[subcategoryId]; return next })
      fetchRates()
    } catch {
      setNameError('Connection error — please try again')
    } finally {
      setSavingNameId(null)
    }
  }

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addForm.categoryId) { setAddError('Choose a category'); return }
    if (!addForm.name.trim()) { setAddError('Enter a service name'); return }
    setAddSubmitting(true)
    setAddError(null)
    try {
      const res = await fetch('/api/vehicle-service/labour-rates/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusinessId,
          categoryId: addForm.categoryId,
          name: addForm.name.trim(),
          emoji: addForm.emoji.trim() || null,
          customerRate: addForm.customerRate.trim() ? Number(addForm.customerRate) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setAddError(data.error || 'Failed to add service'); return }
      setShowAddModal(false)
      setAddForm({ categoryId: '', name: '', emoji: '', customerRate: '' })
      fetchRates()
    } catch {
      setAddError('Connection error — please try again')
    } finally {
      setAddSubmitting(false)
    }
  }

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading...</div>
  }
  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <ContentLayout title="Labour Rates" subtitle="Default customer labour charges by service — separate from contractor pay">
      <div className="max-w-3xl mx-auto">
        {!canManage ? (
          <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-800 dark:text-yellow-300">
            You don't have permission to view or configure labour rates.
          </div>
        ) : (
          <>
            {loading && <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}
            {error && <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">{error}</div>}
            {saveError && <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">{saveError}</div>}
            {nameError && <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">{nameError}</div>}

            {!loading && !error && (
              <>
                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                  <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                    </svg>
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search services or categories..."
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {/* Hidden by default, even for admins — an explicit click
                      is required before Edit/Add Service ever appear. */}
                  {canManageDefinitions && !showManageControls && (
                    <button
                      onClick={() => setShowManageControls(true)}
                      className="px-4 py-2.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 whitespace-nowrap"
                    >
                      ⚙ Manage Definitions
                    </button>
                  )}
                </div>

                {canManageDefinitions && showManageControls && (
                  <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <button
                      onClick={() => {
                        setEditMode(v => !v)
                        setEditingName({})
                        setNameError(null)
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap border transition-colors ${
                        editMode
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {editMode ? '✓ Done Editing' : '✏️ Rename Services'}
                    </button>
                    <button
                      onClick={() => { setShowAddModal(true); setAddError(null) }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium whitespace-nowrap"
                    >
                      + Add Service
                    </button>
                    <button
                      onClick={() => { setShowManageControls(false); setEditMode(false); setEditingName({}); setNameError(null) }}
                      className="ml-auto px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      Hide
                    </button>
                  </div>
                )}

                {filteredCategories.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">No services match "{search}"</div>
                ) : (
                  <div className="space-y-4">
                    {filteredCategories.map(cat => (
                      <div key={cat.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-5">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                          {cat.emoji} {cat.name}
                        </h4>
                        <div className="space-y-2">
                          {cat.services.map(svc => {
                            const isEditingRate = svc.id in editing
                            const isEditingSvcName = svc.id in editingName
                            return (
                              <div key={svc.id} className="flex items-center justify-between gap-3 py-1.5 border-t border-gray-100 dark:border-gray-700 first:border-t-0">
                                {isEditingSvcName ? (
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <input
                                      type="text" autoFocus
                                      value={editingName[svc.id].emoji}
                                      onChange={e => setEditingName({ ...editingName, [svc.id]: { ...editingName[svc.id], emoji: e.target.value } })}
                                      placeholder="🔧"
                                      className="w-12 text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                                    />
                                    <input
                                      type="text"
                                      value={editingName[svc.id].name}
                                      onChange={e => setEditingName({ ...editingName, [svc.id]: { ...editingName[svc.id], name: e.target.value } })}
                                      className="flex-1 min-w-0 text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5 min-w-0">
                                    <span className="truncate">{svc.emoji} {svc.name}</span>
                                    {editMode && (
                                      <button
                                        onClick={() => setEditingName({ ...editingName, [svc.id]: { name: svc.name, emoji: svc.emoji ?? '' } })}
                                        className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 text-xs shrink-0"
                                        title="Rename this service"
                                      >
                                        ✏️
                                      </button>
                                    )}
                                  </span>
                                )}

                                {isEditingSvcName ? (
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      onClick={() => handleSaveName(svc.id)}
                                      disabled={savingNameId === svc.id}
                                      className="px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded"
                                    >
                                      {savingNameId === svc.id ? 'Saving…' : 'Save'}
                                    </button>
                                    <button
                                      onClick={() => setEditingName(prev => { const next = { ...prev }; delete next[svc.id]; return next })}
                                      className="px-2 py-1 text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : isEditingRate ? (
                                  <div className="flex items-center gap-2 shrink-0">
                                    <input
                                      type="number" min="0" step="0.01" autoFocus
                                      value={editing[svc.id]}
                                      onChange={e => setEditing({ ...editing, [svc.id]: e.target.value })}
                                      className="w-24 text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                    <button
                                      onClick={() => handleSave(svc.id)}
                                      disabled={savingId === svc.id}
                                      className="px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded"
                                    >
                                      {savingId === svc.id ? 'Saving…' : 'Save'}
                                    </button>
                                    <button
                                      onClick={() => setEditing(prev => { const next = { ...prev }; delete next[svc.id]; return next })}
                                      className="px-2 py-1 text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setEditing({ ...editing, [svc.id]: svc.customerRate != null ? String(svc.customerRate) : '' })}
                                    className="text-sm shrink-0"
                                  >
                                    {svc.customerRate != null ? (
                                      <span className="text-gray-900 dark:text-white font-medium hover:underline">{formatCurrency(svc.customerRate)}</span>
                                    ) : (
                                      <span className="text-gray-400 hover:underline">Not set</span>
                                    )}
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !addSubmitting && setShowAddModal(false)}>
          <form
            onSubmit={handleAddService}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-gray-50 dark:bg-gray-900 px-5 py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Add Service</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">New labour rate definitions can be renamed later but never deleted.</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category *</label>
                <SearchableSelect
                  options={categories.map(c => ({ value: c.id, name: c.name, emoji: c.emoji ?? undefined }))}
                  value={addForm.categoryId}
                  onChange={v => setAddForm({ ...addForm, categoryId: v })}
                  placeholder="Select a category..."
                  searchPlaceholder="Search categories..."
                  required
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="w-16">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Emoji</label>
                  <input
                    type="text"
                    value={addForm.emoji}
                    onChange={e => setAddForm({ ...addForm, emoji: e.target.value })}
                    placeholder="🔧"
                    className="w-full text-sm px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Service Name *</label>
                  <input
                    type="text" autoFocus
                    value={addForm.name}
                    onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="e.g. Wheel alignment"
                    className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Customer Rate (optional)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={addForm.customerRate}
                  onChange={e => setAddForm({ ...addForm, customerRate: e.target.value })}
                  placeholder="Leave blank to set later"
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              {addError && <p className="text-sm text-red-600 dark:text-red-400">{addError}</p>}
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 px-5 py-4 border-t border-gray-200 dark:border-gray-700 rounded-b-lg flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                disabled={addSubmitting}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addSubmitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium"
              >
                {addSubmitting ? 'Adding...' : 'Add Service'}
              </button>
            </div>
          </form>
        </div>
      )}
    </ContentLayout>
  )
}
