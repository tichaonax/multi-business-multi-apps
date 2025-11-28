'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { AccountList } from '@/components/expense-account/account-list'
import { getEffectivePermissions } from '@/lib/permission-utils'

export default function ExpenseAccountsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [canCreateAccount, setCanCreateAccount] = useState(false)
  const [canAccessExpenseAccount, setCanAccessExpenseAccount] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      checkPermissions()
    }
  }, [session])

  const checkPermissions = async () => {
    try {
      const permissions = getEffectivePermissions(session?.user)

      setCanAccessExpenseAccount(permissions.canAccessExpenseAccount || false)
      setCanCreateAccount(permissions.canCreateExpenseAccount || false)

      // Redirect if no access permission
      if (!permissions.canAccessExpenseAccount) {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error checking permissions:', error)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <ContentLayout title="Expense Accounts">
        <div className="flex items-center justify-center h-64">
          <div className="text-secondary">Loading...</div>
        </div>
      </ContentLayout>
    )
  }

  if (!canAccessExpenseAccount) {
    return (
      <ContentLayout title="Expense Accounts">
        <div className="flex items-center justify-center h-64">
          <div className="text-secondary">You do not have permission to access expense accounts</div>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="Expense Accounts"
      description="Manage expense accounts, make deposits and payments"
    >
      <div className="space-y-6">
        <AccountList canCreateAccount={canCreateAccount} />
      </div>
    </ContentLayout>
  )
}
