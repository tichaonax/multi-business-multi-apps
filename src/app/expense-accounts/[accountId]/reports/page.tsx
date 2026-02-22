'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { ExpenseAccountReports } from '@/components/expense-account/expense-account-reports'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import Link from 'next/link'

interface ExpenseAccount {
  id: string
  accountNumber: string
  accountName: string
}

export default function ExpenseAccountReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const accountId = params.accountId as string

  const { hasPermission, loading: permissionsLoading } = useBusinessPermissionsContext()
  const canViewExpenseReports = hasPermission('canViewExpenseReports')

  const [account, setAccount] = useState<ExpenseAccount | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (!permissionsLoading && !canViewExpenseReports) {
      router.push(`/expense-accounts/${accountId}`)
    }
  }, [permissionsLoading, canViewExpenseReports, accountId, router])

  useEffect(() => {
    if (session?.user && accountId) {
      loadAccount()
    }
  }, [session, accountId])

  const loadAccount = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/expense-account/${accountId}`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setAccount(data.data.account)
      } else {
        router.push('/expense-accounts')
      }
    } catch (error) {
      console.error('Error loading account:', error)
      router.push('/expense-accounts')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading || permissionsLoading) {
    return (
      <ContentLayout title="Expense Reports">
        <div className="flex items-center justify-center h-64">
          <div className="text-secondary">Loading...</div>
        </div>
      </ContentLayout>
    )
  }

  if (!account) {
    return (
      <ContentLayout title="Expense Reports">
        <div className="flex items-center justify-center h-64">
          <div className="text-secondary">Account not found</div>
        </div>
      </ContentLayout>
    )
  }

  if (!canViewExpenseReports) {
    return (
      <ContentLayout title="Expense Reports">
        <div className="flex items-center justify-center h-64">
          <div className="text-secondary">You do not have permission to view expense reports</div>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title={`Reports: ${account.accountName}`}
      description={`Analytics and reporting for account #${account.accountNumber}`}
    >
      <div className="space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href={`/expense-accounts/${accountId}`}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Account Detail
          </Link>
        </div>

        {/* Reports Component */}
        <ExpenseAccountReports accountId={accountId} />
      </div>
    </ContentLayout>
  )
}
