'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { SessionUser } from '@/lib/permission-utils'
import { useToastContext } from '@/components/ui/toast'

interface AvailabilityItem {
  id: string
  itemType: 'menu_item' | 'ayli_combo'
  name: string
  category: string | null
  menuNumber: string
  isHidden: boolean
  imageUrl: string | null
}

/**
 * Lightweight, salesperson-friendly screen: shows only items that already have a
 * menu number assigned (i.e. are configured to appear on the customer display) and
 * lets anyone with display access quickly hide one — "86 the fish" — without
 * touching its menu number, pricing, image, or anything else. Deliberately does
 * NOT expose Menu Numbers' full admin toolset (assigning numbers, pricing gates,
 * image upload) — this screen only flips the one isHidden switch.
 */
export default function MenuAvailabilityPage() {
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
      const res = await fetch(`/api/business/${currentBusinessId}/display-smart-ads?businessType=restaurant&all=true`)
      if (!res.ok) return
      const data = await res.json()
      // Today's Special is deliberately not added separately here — its product
      // is already present in data.items (with its real isHidden value); adding
      // it again from data.dailySpecial would duplicate the row with a guessed
      // (possibly wrong) hidden state, since that payload doesn't carry isHidden.
      const all: AvailabilityItem[] = data.items ?? []
      // Only items actually configured to appear on the display — nothing to
      // toggle for an item with no menu number, since it never shows anyway.
      const numbered = all.filter(i => !!i.menuNumber)
      numbered.sort((a, b) => {
        const aNum = parseInt(a.menuNumber)
        const bNum = parseInt(b.menuNumber)
        if (aNum !== bNum) return aNum - bNum
        return a.menuNumber.localeCompare(b.menuNumber)
      })
      setItems(numbered)
    } catch {
      toast.error('Failed to load menu items')
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId])

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

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.menuNumber.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <BusinessTypeRoute requiredBusinessType="restaurant">
      <ContentLayout
        title="Menu Availability"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Restaurant', href: '/restaurant' },
          { label: 'Menu Availability', isActive: true }
        ]}
      >
        {!canView ? (
          <div className="card p-8 text-center text-secondary">
            You don&apos;t have permission to view this page.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-300">
              Ran out of an item? Hide it here and it disappears from the customer display right away —
              its menu number stays exactly as it is, so when it&apos;s back in stock just switch it back on.
              This doesn&apos;t change pricing, images, or numbers — for that, use Menu Numbers.
            </div>

            <input
              type="text"
              placeholder="Search by name or number…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="card overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
              ) : filtered.length === 0 ? (
                <div className="py-8 text-center text-sm text-secondary">
                  {items.length === 0 ? 'No numbered menu items yet — assign menu numbers first in Menu Numbers.' : 'No items found'}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filtered.map(item => (
                    <div
                      key={`${item.itemType}-${item.id}`}
                      className={`flex items-center gap-3 px-4 py-3 ${item.isHidden ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}
                    >
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-black text-xs leading-none flex-shrink-0">
                        {item.menuNumber.toUpperCase()}
                      </span>
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0 bg-gray-100 dark:bg-gray-800" />
                      ) : (
                        <span className="w-10 h-10 rounded flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-[9px] text-secondary flex-shrink-0">No image</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-primary truncate">{item.name}</div>
                        <div className="text-xs text-secondary flex items-center gap-2">
                          <span>{item.category ?? 'Uncategorized'}</span>
                          {item.itemType === 'ayli_combo' && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">AYLI</span>
                          )}
                        </div>
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
            </div>
          </div>
        )}
      </ContentLayout>
    </BusinessTypeRoute>
  )
}
