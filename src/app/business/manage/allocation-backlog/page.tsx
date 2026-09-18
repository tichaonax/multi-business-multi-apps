'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { BusinessProtectedRoute } from '@/components/auth/business-protected-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'

interface BacklogGroup {
  allocationType: 'RENT' | 'AUTO_DEPOSIT' | 'PAYROLL'
  configKey: string
  accountName: string
  totalOwed: number
  daysCount: number
  oldestDate: string
  newestDate: string
}

function typeLabel(t: BacklogGroup['allocationType']) {
  return t === 'RENT' ? 'Rent' : t === 'PAYROLL' ? 'Payroll' : 'Auto-deposit'
}

function AllocationBacklogPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { businesses } = useBusinessPermissionsContext()
  const { push: toast, error: toastError } = useToastContext()

  const businessOptions = businesses.filter(b => !b.isUmbrellaBusiness)
  const [businessId, setBusinessId] = useState(searchParams.get('businessId') || businessOptions[0]?.businessId || '')

  const [loading, setLoading] = useState(true)
  const [availableCashNow, setAvailableCashNow] = useState(0)
  const [backlog, setBacklog] = useState<BacklogGroup[]>([])
  const [catchingUpKey, setCatchingUpKey] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/business/${businessId}/allocation-backlog`)
      const data = await res.json()
      if (res.ok) {
        setAvailableCashNow(data.availableCashNow ?? 0)
        setBacklog(data.backlog ?? [])
      } else {
        toastError(data.error || 'Failed to load backlog')
      }
    } catch {
      toastError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }, [businessId, toastError])

  useEffect(() => { load() }, [load])

  const handleBusinessChange = (id: string) => {
    setBusinessId(id)
    router.replace(`/business/manage/allocation-backlog?businessId=${id}`)
  }

  const totalOwed = backlog.reduce((sum, g) => sum + g.totalOwed, 0)

  const handleCatchUp = async (group: BacklogGroup, amount?: number) => {
    const key = `${group.allocationType}:${group.configKey}`
    setCatchingUpKey(key)
    try {
      const res = await fetch(`/api/business/${businessId}/allocation-backlog/catch-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocationType: group.allocationType, configKey: group.configKey, ...(amount != null ? { amount } : {}) }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast(data.message, { type: 'success' })
        await load()
      } else {
        toastError(data.error || 'Catch-up failed')
      }
    } catch {
      toastError('Network error — please try again')
    } finally {
      setCatchingUpKey(null)
    }
  }

  return (
    <BusinessProtectedRoute requiredPermission="canAccessFinancialData">
      <ContentLayout
        title="⏳ Allocation Backlog"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Business Management', href: '/business/manage' },
          { label: 'Allocation Backlog', isActive: true },
        ]}
      >
        <div className="p-4 sm:p-6 space-y-4">
          <p className="text-sm text-secondary max-w-2xl">
            Rent, auto-deposit, and payroll amounts that a daily close couldn&apos;t pay out because
            there wasn&apos;t enough real cash on hand — recorded here instead of silently disappearing, so
            they can be caught up once cash is available.
          </p>

          {businessOptions.length > 1 && (
            <div className="max-w-xs">
              <label className="block text-xs font-medium text-secondary mb-1">Business</label>
              <select
                value={businessId}
                onChange={e => handleBusinessChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
              >
                {businessOptions.map(b => (
                  <option key={b.businessId} value={b.businessId}>{b.businessName}</option>
                ))}
              </select>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-400 border-t-transparent" /></div>
          ) : (
            <>
              <div className="flex flex-wrap gap-4 p-4 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700">
                <div>
                  <p className="text-xs text-secondary">Real cash available now</p>
                  <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">${availableCashNow.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary">Total backlog owed</p>
                  <p className={`text-lg font-semibold ${totalOwed > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>${totalOwed.toFixed(2)}</p>
                </div>
              </div>

              {backlog.length === 0 ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 px-4 py-6 text-center text-sm text-emerald-700 dark:text-emerald-300">
                  ✓ No outstanding backlog — every rent, auto-deposit, and payroll allocation is caught up.
                </div>
              ) : (
                <div className="space-y-2">
                  {backlog.map(group => {
                    const key = `${group.allocationType}:${group.configKey}`
                    return (
                      <div key={key} className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            <span className="inline-block px-1.5 py-0.5 mr-2 text-xs rounded bg-gray-100 dark:bg-gray-700 text-secondary">{typeLabel(group.allocationType)}</span>
                            {group.accountName}
                          </p>
                          <p className="text-xs text-secondary mt-0.5">
                            {group.daysCount} day{group.daysCount === 1 ? '' : 's'} outstanding
                            {group.oldestDate === group.newestDate ? ` (${group.oldestDate})` : ` (${group.oldestDate} → ${group.newestDate})`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-semibold text-red-600 dark:text-red-400">${group.totalOwed.toFixed(2)}</span>
                          <button
                            onClick={() => handleCatchUp(group)}
                            disabled={catchingUpKey === key || availableCashNow <= 0.009}
                            title={availableCashNow <= 0.009 ? 'No cash available to catch up right now' : undefined}
                            className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg font-medium whitespace-nowrap"
                          >
                            {catchingUpKey === key ? '…' : 'Catch Up'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </ContentLayout>
    </BusinessProtectedRoute>
  )
}

export default function AllocationBacklogPage() {
  return (
    <Suspense fallback={null}>
      <AllocationBacklogPageInner />
    </Suspense>
  )
}
