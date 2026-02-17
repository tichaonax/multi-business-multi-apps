'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { AccountList } from '@/components/expense-account/account-list'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

export default function ExpenseAccountsPage() {
  const { status } = useSession()
  const router = useRouter()
  const { hasPermission, loading: permissionsLoading, isSystemAdmin, isBusinessOwner, currentBusiness } = useBusinessPermissionsContext()

  const canAccessExpenseAccount = hasPermission('canAccessExpenseAccount')
  const canCreateAccount = hasPermission('canCreateExpenseAccount')
  const canMakeExpenseDeposits = hasPermission('canMakeExpenseDeposits')
  const canCreateSiblingAccounts = hasPermission('canCreateSiblingAccounts')
  const canMergeSiblingAccounts = hasPermission('canMergeSiblingAccounts')
  const canViewExpenseReports = hasPermission('canViewExpenseReports')
  const canChangeCategory = isSystemAdmin || isBusinessOwner || currentBusiness?.role === 'business-manager'
  const canCreatePayees = canChangeCategory // Only owners, managers, and admins can create payees

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (!permissionsLoading && !canAccessExpenseAccount) {
      router.push('/dashboard')
    }
  }, [permissionsLoading, canAccessExpenseAccount, router])

  if (status === 'loading' || permissionsLoading) {
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
        <AccountList
          canCreateAccount={canCreateAccount}
          canMakeExpenseDeposits={canMakeExpenseDeposits}
          canCreateSiblingAccounts={canCreateSiblingAccounts}
          canMergeSiblingAccounts={canMergeSiblingAccounts}
          canViewExpenseReports={canViewExpenseReports}
          canCreatePayees={canCreatePayees}
          canChangeCategory={canChangeCategory}
          businessType={currentBusiness?.businessType}
          currentBusinessId={currentBusiness?.businessId}
        />
      </div>
    </ContentLayout>
  )
}
