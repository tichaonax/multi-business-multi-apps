'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

interface AccountSummary {
  businessId: string
  businessName: string
  businessType: string
  hasAccount: boolean
  balance: number
  totalCredits: number
  totalDebits: number
  lastTransactionAt: string | null
  loading: boolean
  error: boolean
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const typeLabel = (t: string) => {
  const map: Record<string, string> = {
    retail: 'Retail',
    restaurant: 'Restaurant',
    clothing: 'Clothing',
    construction: 'Construction',
    salon: 'Salon',
    grocery: 'Grocery',
  }
  return map[t] ?? t.charAt(0).toUpperCase() + t.slice(1)
}

export default function BusinessAccountsPage() {
  const { status } = useSession()
  const router = useRouter()
  const { loading: permissionsLoading, isSystemAdmin, businesses, hasPermission } = useBusinessPermissionsContext()

  const canAccessFinancialData = isSystemAdmin || hasPermission('canAccessFinancialData')

  const [accounts, setAccounts] = useState<AccountSummary[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (!permissionsLoading && !canAccessFinancialData) router.push('/dashboard')
  }, [permissionsLoading, canAccessFinancialData, router])

  useEffect(() => {
    if (permissionsLoading || !businesses.length) return

    // Initialise placeholders immediately
    const initial: AccountSummary[] = businesses
      .filter((b) => b.isActive)
      .map((b) => ({
        businessId: b.businessId,
        businessName: b.businessName,
        businessType: b.businessType,
        hasAccount: false,
        balance: 0,
        totalCredits: 0,
        totalDebits: 0,
        lastTransactionAt: null,
        loading: true,
        error: false,
      }))
    setAccounts(initial)

    // Fetch each account
    initial.forEach((item) => {
      fetch(`/api/business/${item.businessId}/account`)
        .then((r) => r.json())
        .then((res) => {
          if (res.success) {
            const d = res.data
            setAccounts((prev) =>
              prev.map((a) =>
                a.businessId === item.businessId
                  ? {
                      ...a,
                      hasAccount: d.hasAccount,
                      balance: d.account?.balance ?? 0,
                      totalCredits: d.account?.totalCredits ?? 0,
                      totalDebits: d.account?.totalDebits ?? 0,
                      lastTransactionAt: d.account?.lastTransactionAt ?? null,
                      loading: false,
                      error: false,
                    }
                  : a
              )
            )
          } else {
            setAccounts((prev) =>
              prev.map((a) =>
                a.businessId === item.businessId ? { ...a, loading: false, error: true } : a
              )
            )
          }
        })
        .catch(() => {
          setAccounts((prev) =>
            prev.map((a) =>
              a.businessId === item.businessId ? { ...a, loading: false, error: true } : a
            )
          )
        })
    })
  }, [permissionsLoading, businesses])

  if (status === 'loading' || permissionsLoading) {
    return (
      <ContentLayout title="Business Accounts">
        <div className="flex items-center justify-center h-64">
          <div className="text-secondary">Loading…</div>
        </div>
      </ContentLayout>
    )
  }

  if (!canAccessFinancialData) return null

  return (
    <ContentLayout
      title="Business Accounts"
      description="View balances and transactions for each business"
    >
      <div className="space-y-3">
        {accounts.length === 0 ? (
          <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-12">
            No active businesses found.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {accounts.map((a) => (
              <Link
                key={a.businessId}
                href={`/business-accounts/${a.businessId}`}
                className="group block border border-border rounded-lg overflow-hidden hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
              >
                {/* Header strip */}
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">🏦</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-primary truncate">{a.businessName}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">{typeLabel(a.businessType)}</p>
                    </div>
                  </div>
                  {a.loading ? (
                    <span className="text-xs text-gray-400 animate-pulse">Loading…</span>
                  ) : a.error ? (
                    <span className="text-xs text-red-500">Error</span>
                  ) : !a.hasAccount ? (
                    <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                      No account
                    </span>
                  ) : (
                    <span
                      className={`text-sm font-bold ${
                        a.balance >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {fmt(a.balance)}
                    </span>
                  )}
                </div>

                {/* Body */}
                {!a.loading && !a.error && a.hasAccount && (
                  <div className="px-3 py-2 flex items-center justify-between gap-4">
                    <div className="text-xs">
                      <p className="text-gray-400 dark:text-gray-500">Credits</p>
                      <p className="font-medium text-green-600 dark:text-green-400">{fmt(a.totalCredits)}</p>
                    </div>
                    <div className="text-xs">
                      <p className="text-gray-400 dark:text-gray-500">Debits</p>
                      <p className="font-medium text-red-600 dark:text-red-400">{fmt(a.totalDebits)}</p>
                    </div>
                    <div className="text-xs text-right">
                      <p className="text-gray-400 dark:text-gray-500">Last Activity</p>
                      <p className="font-medium text-primary">{fmtDate(a.lastTransactionAt)}</p>
                    </div>
                  </div>
                )}

                {!a.loading && !a.error && !a.hasAccount && (
                  <div className="px-3 py-3 text-xs text-gray-400 dark:text-gray-500 text-center">
                    No account initialized
                  </div>
                )}

                {!a.loading && a.error && (
                  <div className="px-3 py-3 text-xs text-red-500 text-center">
                    Could not load account
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </ContentLayout>
  )
}
