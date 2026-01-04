'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { checkPermission } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ContentLayout } from '@/components/layout/content-layout'
import { R710TokenMenuManager } from '@/components/business/r710-token-menu-manager'

export default function GroceryR710TokensPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { currentBusinessId, currentBusiness, loading: businessLoading } = useBusinessPermissionsContext()

  const [loading, setLoading] = useState(true)
  const [hasIntegration, setHasIntegration] = useState(false)
  const [integrationError, setIntegrationError] = useState<string | null>(null)

  const [canManage, setCanManage] = useState(false)

  useEffect(() => {
    if (businessLoading || !currentBusinessId) return

    // Check permission
    const hasPermission = session?.user ? checkPermission(session.user, 'canSellWifiTokens', currentBusinessId) : false
    setCanManage(hasPermission)

    // Check business type
    if (currentBusiness?.businessType !== 'grocery') {
      router.push('/dashboard')
      return
    }

    if (!hasPermission) {
      router.push('/dashboard')
      return
    }

    checkIntegration()
  }, [currentBusinessId, businessLoading, session?.user, currentBusiness])

  const checkIntegration = async () => {
    if (!currentBusinessId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/r710/integration?businessId=${currentBusinessId}`)

      if (response.ok) {
        const data = await response.json()
        setHasIntegration(!!data.integration)
      } else if (response.status === 404) {
        setIntegrationError('R710 integration not setup yet')
      } else {
        setIntegrationError('Failed to check integration status')
      }
    } catch (error) {
      console.error('Error checking integration:', error)
      setIntegrationError('Failed to check integration status')
    } finally {
      setLoading(false)
    }
  }

  if (businessLoading || loading) {
    return (
      <ContentLayout title="R710 WiFi Token Menu">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </ContentLayout>
    )
  }

  if (!hasIntegration) {
    return (
      <ContentLayout title="R710 WiFi Token Menu">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-medium text-yellow-900 mb-2">⚠️ R710 Integration Not Setup</h3>
          <p className="text-yellow-800 mb-4">
            {integrationError || 'Please setup your R710 integration first before managing token menu.'}
          </p>
          <button
            onClick={() => router.push('/r710-portal/setup')}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Go to R710 Setup
          </button>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="R710 WiFi Token Menu"
      description="Configure pricing and availability of R710 WiFi tokens for your grocery POS"
    >
      <R710TokenMenuManager businessId={currentBusinessId!} businessType="grocery" />
    </ContentLayout>
  )
}
