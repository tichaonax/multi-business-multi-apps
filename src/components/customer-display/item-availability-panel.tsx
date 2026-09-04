'use client'

import { useState, useEffect, useCallback } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useSession } from 'next-auth/react'
import { SessionUser } from '@/lib/permission-utils'
import { useToastContext } from '@/components/ui/toast'

interface AvailabilityItem {
  id: string
  itemType: 'product' | 'category'
  name: string
  category: string | null
  isHidden: boolean
}

interface Props {
  businessType: 'grocery' | 'clothing'
}

// Shown when no search term is entered — grocery/clothing have no menu-number
// concept, so (unlike restaurant) there's no small curated subset to list in
// full. Defaulting to the top N by display score covers what's actually likely
// showing right now; search reaches everything else.
const DEFAULT_VISIBLE = 40

/**
 * Same idea as the restaurant Menu Availability screen, adapted for grocery/
 * clothing: no menu numbers exist here, so every in-stock, priced product or
 * (for clothing) bale category is already eligible for the ad rotation.
 * Lets anyone with display access quickly hide one — out of stock, wrong price
 * showing, whatever — without touching anything else about how it's configured.
 */
export function ItemAvailabilityPanel({ businessType }: Props) {
  const { data: session } = useSession()
  const { currentBusinessId, hasPermission } = useBusinessPermissionsContext()
  const toast = useToastContext()

  const sessionUser = session?.user as SessionUser
  const isAdmin = sessionUser?.role === 'admin'
  const canView = isAdmin || hasPermission('canViewCustomerDisplay') || hasPermission('canManageCustomerDisplay')

  const [items, setItems] = useState<AvailabilityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/business/${currentBusinessId}/display-smart-ads?businessType=${businessType}&all=true`)
      if (!res.ok) return
      const data = await res.json()
      // Server already returns candidates sorted by display score (most relevant first).
      setItems(data.items ?? [])
    } catch {
      toast.error('Failed to load items')
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, businessType])

  useEffect(() => { load() }, [load])

  const toggleHidden = async (item: AvailabilityItem) => {
    if (!currentBusinessId) return
    setTogglingId(item.id)
    const nextHidden = !item.isHidden
    try {
      const res = await fetch(`/api/business/${currentBusinessId}/display-smart-ads/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType: item.itemType, itemId: item.id, isHidden: nextHidden }),
      })
      if (!res.ok) throw new Error()
      setItems(prev => prev.map(i => (i.id === item.id && i.itemType === item.itemType) ? { ...i, isHidden: nextHidden } : i))
      toast.push(nextHidden ? `${item.name} hidden from customer display` : `${item.name} showing on customer display again`)
    } catch {
      toast.error('Failed to update — try again')
    } finally {
      setTogglingId(null)
    }
  }

  const term = search.trim().toLowerCase()
  const filtered = term
    ? items.filter(i => i.name.toLowerCase().includes(term) || (i.category ?? '').toLowerCase().includes(term))
    : items
  // Hidden items always show (so they can be found and un-hidden), plus either
  // every search match or, with no search, the top DEFAULT_VISIBLE by score.
  const visible = term
    ? filtered
    : [
        ...filtered.filter(i => i.isHidden),
        ...filtered.filter(i => !i.isHidden).slice(0, DEFAULT_VISIBLE),
      ]
  const truncated = !term && filtered.filter(i => !i.isHidden).length > DEFAULT_VISIBLE

  const noun = businessType === 'clothing' ? 'category' : 'product'

  return (
    <div className="space-y-4">
      {!canView ? (
        <div className="card p-8 text-center text-secondary">
          You don&apos;t have permission to view this page.
        </div>
      ) : (
        <>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-300">
            Out of stock or need to pull something off the customer display? Hide it here and it disappears
            right away — nothing else about it changes, so switching it back on brings it right back.
          </div>

          <input
            type="text"
            placeholder={`Search by ${noun} or category name…`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="card overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
            ) : visible.length === 0 ? (
              <div className="py-8 text-center text-sm text-secondary">
                {items.length === 0 ? `No eligible ${noun}s found for the display.` : 'No items found'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[70vh] overflow-y-auto">
                {visible.map(item => (
                  <div
                    key={`${item.itemType}-${item.id}`}
                    className={`flex items-center gap-3 px-4 py-3 ${item.isHidden ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-primary truncate">{item.name}</div>
                      <div className="text-xs text-secondary">{item.category ?? 'Uncategorized'}</div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
                      item.isHidden
                        ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                        : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                    }`}>
                      {item.isHidden ? '🚫 Hidden' : '✅ Showing'}
                    </span>
                    <button
                      onClick={() => toggleHidden(item)}
                      disabled={togglingId === item.id}
                      className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                        item.isHidden
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      {togglingId === item.id ? 'Saving…' : item.isHidden ? 'Show Again' : 'Hide Now'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {truncated && (
              <div className="px-4 py-2 text-xs text-center text-secondary border-t border-gray-100 dark:border-gray-700">
                Showing the top {DEFAULT_VISIBLE} by popularity — search above to find anything else.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
