'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { TransferHistory } from '@/components/expense-account/transfer-history'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

export default function TransferReportPage() {
  const { status } = useSession()
  const router = useRouter()
  const { hasPermission, isSystemAdmin, loading: permissionsLoading } = useBusinessPermissionsContext()

  const canTransfer = isSystemAdmin || hasPermission('canTransferBetweenAccounts')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (!permissionsLoading && !canTransfer) router.push('/dashboard')
  }, [permissionsLoading, canTransfer, router])

  if (status === 'loading' || permissionsLoading) {
    return (
      <ContentLayout title="Transfer Report">
        <div className="flex items-center justify-center h-64">
          <div className="text-secondary">Loading...</div>
        </div>
      </ContentLayout>
    )
  }

  if (!canTransfer) return null

  return (
    <ContentLayout title="Transfer Report">
      <div className="max-w-5xl mx-auto">
        <div className="card p-5">
          <TransferHistory showFilters />
        </div>
      </div>
    </ContentLayout>
  )
}
