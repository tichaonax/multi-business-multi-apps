'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToast } from '@/components/ui/use-toast'

interface Category {
  id: string
  businessId: string | null
  name: string
  description: string | null
  defaultDepreciationMethod: string
  defaultUsefulLifeYears: number | null
  defaultSalvageValuePct: number | null
  icon: string | null
}

export default function AssetCategoriesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { push: showToast, error: showError } = useToast()
  const { currentBusinessId, isSystemAdmin, hasPermission, loading: bizLoading } = useBusinessPermissionsContext()

  const canManageAssets = isSystemAdmin || hasPermission('canManageAssets')

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', defaultDepreciationMethod: 'STRAIGHT_LINE', defaultUsefulLifeYears: '', defaultSalvageValuePct: '', icon: '' })
  const [saving, setSaving] = useState(false)

  const fetchCategories = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/assets/categories?businessId=${currentBusinessId}`, { credentials: 'include' })
      const json = await res.json()
      setCategories(json.data || [])
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
    if (!canManageAssets) { router.push('/dashboard'); return }
    if (currentBusinessId) fetchCategories()
  }, [session, status, router, canManageAssets, currentBusinessId, fetchCategories])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) return
    setSaving(true)
    try {
      const res = await fetch('/api/assets/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, businessId: currentBusinessId, defaultUsefulLifeYears: form.defaultUsefulLifeYears || null, defaultSalvageValuePct: form.defaultSalvageValuePct || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      showToast('Category created')
      setShowForm(false)
      setForm({ name: '', description: '', defaultDepreciationMethod: 'STRAIGHT_LINE', defaultUsefulLifeYears: '', defaultSalvageValuePct: '', icon: '' })
      fetchCategories()
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || bizLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" /></div>
  }

  const systemCategories = categories.filter(c => !c.businessId)
  const businessCategories = categories.filter(c => c.businessId)

  return (
    <ContentLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/assets" className="text-sm text-gray-500 dark:text-gray-400 hover:underline">← Asset Register</Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">Asset Categories</h1>
          </div>
          {canManageAssets && (
            <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              + New Category
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">New Custom Category</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Depreciation Method</label>
                <select value={form.defaultDepreciationMethod} onChange={e => setForm(p => ({ ...p, defaultDepreciationMethod: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <option value="STRAIGHT_LINE">Straight-Line</option>
                  <option value="DECLINING_BALANCE">Double-Declining</option>
                  <option value="NONE">None</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Useful Life (years)</label>
                <input type="number" min="1" value={form.defaultUsefulLifeYears} onChange={e => setForm(p => ({ ...p, defaultUsefulLifeYears: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Create'}</button>
            </div>
          </form>
        )}

        {/* System Categories */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">System Defaults</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Read-only defaults available to all businesses</p>
          </div>
          {loading ? <div className="p-6 text-center text-gray-400 dark:text-gray-500 text-sm">Loading...</div> : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {systemCategories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{cat.name}</p>
                    {cat.description && <p className="text-xs text-gray-400 dark:text-gray-500">{cat.description}</p>}
                  </div>
                  <div className="text-right text-xs text-gray-400 dark:text-gray-500">
                    <p>{cat.defaultDepreciationMethod.replace('_', ' ')}</p>
                    {cat.defaultUsefulLifeYears && <p>{cat.defaultUsefulLifeYears}yr life</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Business Categories */}
        {businessCategories.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Custom Categories</h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {businessCategories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{cat.name}</p>
                    {cat.description && <p className="text-xs text-gray-400 dark:text-gray-500">{cat.description}</p>}
                  </div>
                  <div className="text-right text-xs text-gray-400 dark:text-gray-500">
                    <p>{cat.defaultDepreciationMethod.replace('_', ' ')}</p>
                    {cat.defaultUsefulLifeYears && <p>{cat.defaultUsefulLifeYears}yr life</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ContentLayout>
  )
}
