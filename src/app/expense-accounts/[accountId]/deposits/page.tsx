"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { TransactionHistory } from '@/components/expense-account/transaction-history'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { useSession } from 'next-auth/react'

export default function ExpenseDepositsReportPage() {
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

  if (loading) return <ContentLayout title="Deposits">Loading...</ContentLayout>

  if (!canAccess) return <ContentLayout title="Deposits">Unauthorized</ContentLayout>

  return (
    <ContentLayout title={`Deposits • ${accountName}`} description={`List of deposits for ${accountName}`}>
      <TransactionHistory accountId={accountId} defaultType="DEPOSIT" defaultSortOrder="desc" pageLimit={50} />
    </ContentLayout>
  )
}

export const runtime = 'edge'
