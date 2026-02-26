"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { TransactionHistory } from '@/components/expense-account/transaction-history'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { useSession } from 'next-auth/react'

export default function ExpensePaymentsReportPage() {
  const params = useParams() as { accountId: string }
  const router = useRouter()
  const { data: session, status } = useSession()
  const accountId = params.accountId

  const [accountName, setAccountName] = useState('')
  const [canAccess, setCanAccess] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session?.user && accountId) {
      const permissions = getEffectivePermissions(session.user)
      setCanAccess(permissions.canAccessExpenseAccount || false)
      if (!permissions.canAccessExpenseAccount) {
        router.push('/dashboard')
        return
      }
      setLoading(true)
      fetch(`/api/expense-account/${accountId}`, { credentials: 'include' })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          setAccountName(data?.data?.account?.accountName || '')
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [session, accountId, router, status])

  if (loading) return <ContentLayout title="Payments">Loading...</ContentLayout>

  if (!canAccess) return <ContentLayout title="Payments">Unauthorized</ContentLayout>

  return (
    <ContentLayout title={`Payments • ${accountName}`} description={`List of payments for ${accountName}`}>
      <div className="mb-2">
        <button
          onClick={() => router.push(`/expense-accounts/${accountId}`)}
          className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Account
        </button>
      </div>
      <TransactionHistory accountId={accountId} defaultType="PAYMENT" defaultSortOrder="desc" pageLimit={50} />
    </ContentLayout>
  )
}
