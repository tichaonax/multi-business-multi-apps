'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { SessionUser } from '@/lib/permission-utils'
import { useToastContext } from '@/components/ui/toast'

interface MenuItem {
  id: string
  name: string
  category: string
  menuNumber: string | null
  type: 'menu_item' | 'ayli_combo'
}

function NumberCircle({ num, size = 'md' }: { num: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-6 h-6 text-[9px]' : size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs'
  return (
    <span className={`inline-flex items-center justify-center ${sizeClass} rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-black leading-none flex-shrink-0`}>
      {num.toUpperCase()}
    </span>
  )
}

export default function MenuNumbersPage() {
  const { data: session } = useSession()
  const { currentBusinessId, hasPermission } = useBusinessPermissionsContext()
  const toast = useToastContext()

  const sessionUser = session?.user as SessionUser
  const isAdmin = sessionUser?.role === 'admin'
  const canManage = isAdmin || hasPermission('canManageMenu')

  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<MenuItem | null>(null)
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const [productsRes, combosRes] = await Promise.all([
        fetch(`/api/universal/products?businessId=${currentBusinessId}&businessType=restaurant&isActive=true&limit=500`),
        fetch(`/api/restaurant/ayc-combos?businessId=${currentBusinessId}`)
      ])
      const productsData = await productsRes.json()
      const combosData = await combosRes.json()

      const productItems: MenuItem[] = (productsData.products ?? productsData.data ?? productsData ?? [])
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category?.name ?? 'Uncategorized',
          menuNumber: p.menuNumber ?? null,
          type: 'menu_item' as const,
        }))

      const comboItems: MenuItem[] = (Array.isArray(combosData) ? combosData : [])
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          category: 'AYLI Combo',
          menuNumber: c.menuNumber ?? null,
          type: 'ayli_combo' as const,
        }))

      const all = [...productItems, ...comboItems]
      all.sort((a, b) => {
        const aNum = a.menuNumber ? parseInt(a.menuNumber) : Infinity
        const bNum = b.menuNumber ? parseInt(b.menuNumber) : Infinity
        if (aNum !== bNum) return aNum - bNum
        if (a.menuNumber && b.menuNumber) return a.menuNumber.localeCompare(b.menuNumber)
        if (a.menuNumber) return -1
        if (b.menuNumber) return 1
        return a.name.localeCompare(b.name)
      })
      setItems(all)
    } catch {
      toast.error('Failed to load menu items')
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId])

  useEffect(() => { load() }, [load])

  const selectItem = (item: MenuItem) => {
    setSelected(item)
    setInput(item.menuNumber ?? '')
    setError('')
  }

  const assign = async () => {
    if (!selected || !currentBusinessId) return
    const trimmed = input.trim().toLowerCase()
    if (trimmed && !/^[1-9][0-9]*[a-z]?$/.test(trimmed)) {
      setError('Invalid format — use a positive number with an optional letter suffix, e.g. 4 or 4a')
      return
    }
    setSaving(true)
    setError('')
    try {
      const endpoint = selected.type === 'ayli_combo'
        ? `/api/restaurant/ayc-combos/${selected.id}`
        : `/api/universal/products/${selected.id}`
      const body = selected.type === 'ayli_combo'
        ? { menuNumber: trimmed || null }
        : { menuNumber: trimmed || null }
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to save')
        return
      }
      toast.push(trimmed ? `Number ${trimmed} assigned to "${selected.name}"` : `Number removed from "${selected.name}"`)
      await load()
      // Update selected state with new number
      setSelected(prev => prev ? { ...prev, menuNumber: trimmed || null } : null)
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setInput('')
    await assign()
  }

  const numbered = items.filter(i => i.menuNumber)

  // Find the lowest positive integer not yet assigned (ignores suffix variants)
  const nextAvailable = useMemo(() => {
    const used = new Set(
      numbered.map(i => parseInt(i.menuNumber!)).filter(n => !isNaN(n))
    )
    let n = 1
    while (used.has(n)) n++
    return String(n)
  }, [numbered])

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.menuNumber && i.menuNumber.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <BusinessTypeRoute requiredBusinessType="restaurant">
      <ContentLayout
        title="Menu Numbers"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Restaurant', href: '/restaurant' },
          { label: 'Menu Numbers', isActive: true }
        ]}
      >
        {/* Status banner */}
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
          numbered.length === 0
            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
            : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
        }`}>
          {numbered.length === 0 ? (
            <>ℹ️ No menu numbers assigned yet. The customer display is showing all items. Assign at least one number to begin filtering.</>
          ) : (
            <>{numbered.length} item{numbered.length !== 1 ? 's' : ''} numbered — customer display is showing numbered items only.</>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: item list */}
          <div className="card overflow-hidden flex flex-col" style={{ maxHeight: '75vh' }}>
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name or number…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pr-8 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
              ) : filtered.length === 0 ? (
                <div className="py-8 text-center text-sm text-secondary">No items found</div>
              ) : filtered.map(item => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => selectItem(item)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    selected?.id === item.id && selected?.type === item.type ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex-shrink-0 w-8 flex justify-center">
                    {item.menuNumber
                      ? <NumberCircle num={item.menuNumber} size="sm" />
                      : <span className="text-xs text-gray-400">–</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-primary truncate">{item.name}</div>
                    <div className="text-xs text-secondary">{item.category}</div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      item.type === 'ayli_combo'
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {item.type === 'ayli_combo' ? 'AYLI' : 'Item'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: edit panel + assigned numbers reference */}
          <div className="flex flex-col gap-4">
            {/* Edit panel */}
            {selected ? (
              <div className="card p-6 space-y-5">
                <div className="flex items-start gap-3">
                  {selected.menuNumber && <NumberCircle num={selected.menuNumber} size="lg" />}
                  <div>
                    <h2 className="text-lg font-semibold text-primary">{selected.name}</h2>
                    <p className="text-sm text-secondary">{selected.category}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1 inline-block ${
                      selected.type === 'ayli_combo'
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {selected.type === 'ayli_combo' ? 'AYLI Combo' : 'Menu Item'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Menu Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 4 or 4a"
                    value={input}
                    onChange={e => { setInput(e.target.value); setError('') }}
                    disabled={!canManage || saving}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    onKeyDown={e => { if (e.key === 'Enter') assign() }}
                  />
                  {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-xs text-secondary">Next available:</span>
                    <button
                      type="button"
                      onClick={() => { setInput(nextAvailable); setError('') }}
                      className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      title="Click to use this number"
                    >
                      {nextAvailable}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-secondary">Positive integer with optional letter suffix (e.g. 4, 4a, 4b). Must be unique across all menu items and AYLI combos.</p>
                </div>

                {canManage && (
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={assign}
                      disabled={saving}
                      className="btn-primary text-sm disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Assign'}
                    </button>
                    <button
                      onClick={() => { setInput(selected.menuNumber ?? ''); setError('') }}
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                      title="Reset the input to the current saved value"
                    >
                      Reset
                    </button>
                    {selected.menuNumber && (
                      <button
                        onClick={remove}
                        disabled={saving}
                        className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="card p-8 flex flex-col items-center justify-center text-center gap-3 text-secondary min-h-[200px]">
                <span className="text-4xl">🔢</span>
                <p className="text-sm">Select an item from the list to assign or remove its menu number.</p>
              </div>
            )}

            {/* Assigned numbers reference — always visible */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-primary">Assigned Numbers</h3>
                <span className="text-xs text-secondary">{numbered.length} total</span>
              </div>
              {numbered.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-secondary">No numbers assigned yet</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto">
                  {numbered.map(item => (
                    <button
                      key={`ref-${item.type}-${item.id}`}
                      onClick={() => selectItem(item)}
                      className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                        selected?.id === item.id && selected?.type === item.type ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <NumberCircle num={item.menuNumber!} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-primary truncate">{item.name}</div>
                        <div className="text-xs text-secondary">{item.category}</div>
                      </div>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${
                        item.type === 'ayli_combo'
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {item.type === 'ayli_combo' ? 'AYLI' : 'Item'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </ContentLayout>
    </BusinessTypeRoute>
  )
}
