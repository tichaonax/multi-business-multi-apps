'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ContentLayout } from '@/components/layout/content-layout'
import { R710AdminIssuedReport } from '@/components/business/r710-admin-issued-report'

export default function AdminIssuedTokensReportPage() {
  const router = useRouter()
  const { currentBusinessId, loading: businessLoading, isSystemAdmin, isBusinessOwner } = useBusinessPermissionsContext()
  const isBusinessAdmin = isSystemAdmin || isBusinessOwner

  useEffect(() => {
    if (businessLoading || !currentBusinessId) return
    if (!isBusinessAdmin) {
      router.push('/dashboard')
    }
  }, [businessLoading, currentBusinessId, isBusinessAdmin])

  if (businessLoading || !currentBusinessId || !isBusinessAdmin) {
    return (
      <ContentLayout title="Admin-Issued Long-Term Tokens">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="Admin-Issued Long-Term Tokens"
      description="Long-term, zero-fee WiFi tokens issued to workstations, classified by redemption status"
    >
      <R710AdminIssuedReport businessId={currentBusinessId} />
    </ContentLayout>
  )
}
