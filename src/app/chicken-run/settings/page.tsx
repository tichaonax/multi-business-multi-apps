'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useAlert } from '@/components/ui/confirm-modal'

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
const LABEL_CLS = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
const SUBMIT_CLS = 'px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50'
const CARD_CLS = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5'

export default function ChickenRunSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const alert = useAlert()
  const { currentBusinessId, currentBusiness, isAuthenticated, loading: bizLoading } = useBusinessPermissionsContext()

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    lowInventoryThreshold: '10',
    highMortalityThreshold: '5',
  })

  const fetchSettings = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/chicken-run/settings?businessId=${currentBusinessId}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load settings')
      const d = json.data
      setForm({
        lowInventoryThreshold: String(d.lowInventoryThreshold ?? 10),
        highMortalityThreshold: String(d.highMortalityThreshold ?? 5),
      })
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, alert])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
    fetchSettings()
  }, [session, status, router, fetchSettings])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentBusinessId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/chicken-run/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusinessId,
          lowInventoryThreshold: parseInt(form.lowInventoryThreshold),
          highMortalityThreshold: parseFloat(form.highMortalityThreshold),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save settings')
      await alert({ title: 'Saved', description: 'Settings have been updated successfully.' })
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading' || bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    )
  }
  if (!session || !isAuthenticated) return null

  return (
    <ContentLayout title="Chicken Run - Settings">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 dark:text-gray-400">
          <Link href="/chicken-run" className="hover:underline">Chicken Run</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 dark:text-gray-100 font-medium">Settings</span>
        </nav>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">⚙️ Settings</h1>
          {currentBusiness && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currentBusiness.businessName}</p>
          )}
        </div>

        {/* Settings Form */}
        <div className={CARD_CLS}>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-6">Alert Thresholds</h2>
          {loading ? (
            <p className="text-center py-8 text-gray-400">Loading settings...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className={LABEL_CLS}>Low Inventory Threshold (birds)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={INPUT_CLS}
                  value={form.lowInventoryThreshold}
                  onChange={e => setForm(f => ({ ...f, lowInventoryThreshold: e.target.value }))}
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Alert when total birds in freezer drops below this number.
                </p>
              </div>

              <div>
                <label className={LABEL_CLS}>High Mortality Threshold (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className={INPUT_CLS}
                  value={form.highMortalityThreshold}
                  onChange={e => setForm(f => ({ ...f, highMortalityThreshold: e.target.value }))}
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Alert when batch mortality rate exceeds this percentage.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" className={SUBMIT_CLS} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </ContentLayout>
  )
}
