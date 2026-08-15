'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

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

  const [categories, setCategories] = useState<LabourCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

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

            {!loading && !error && (
              <div className="space-y-4">
                {categories.map(cat => (
                  <div key={cat.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-5">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      {cat.emoji} {cat.name}
                    </h4>
                    <div className="space-y-2">
                      {cat.services.map(svc => {
                        const isEditing = svc.id in editing
                        return (
                          <div key={svc.id} className="flex items-center justify-between gap-3 py-1.5 border-t border-gray-100 dark:border-gray-700 first:border-t-0">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {svc.emoji} {svc.name}
                            </span>
                            {isEditing ? (
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
      </div>
    </ContentLayout>
  )
}
