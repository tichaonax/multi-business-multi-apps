'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ContentLayout } from '@/components/layout/content-layout'
import { WifiTokenMenuManager } from '@/components/business/wifi-token-menu-manager'

export default function GroceryWifiTokensPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { currentBusinessId, currentBusiness, loading: businessLoading, hasPermission } = useBusinessPermissionsContext()

  const [loading, setLoading] = useState(true)
  const [hasIntegration, setHasIntegration] = useState(false)
  const [integrationError, setIntegrationError] = useState<string | null>(null)

  const canManage = hasPermission('canConfigureWifiTokens')

  useEffect(() => {
    if (businessLoading || !currentBusinessId) return

    // Check business type
    if (currentBusiness?.businessType !== 'grocery') {
      router.push('/dashboard')
      return
    }

    if (!canManage) {
      router.push('/dashboard')
      return
    }

    checkIntegration()
  }, [currentBusinessId, businessLoading])

  const checkIntegration = async () => {
    if (!currentBusinessId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/wifi-portal/integration?businessId=${currentBusinessId}`)

      if (response.ok) {
        const data = await response.json()
        setHasIntegration(!!data.integration)
      } else if (response.status === 404) {
        setIntegrationError('WiFi portal integration not setup yet')
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
      <ContentLayout title="WiFi Token Menu">
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
      <ContentLayout title="WiFi Token Menu">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-medium text-yellow-900 mb-2">⚠️ WiFi Portal Not Setup</h3>
          <p className="text-yellow-800 mb-4">
            {integrationError || 'Please setup your WiFi portal integration first before managing token menu.'}
          </p>
          <button
            onClick={() => router.push('/wifi-portal/setup')}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Go to WiFi Portal Setup
          </button>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="WiFi Token Menu"
      description="Manage WiFi access tokens for your grocery POS"
    >
      <WifiTokenMenuManager
        businessId={currentBusinessId!}
        businessType="grocery"
      />
    </ContentLayout>
  )
}
