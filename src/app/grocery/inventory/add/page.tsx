'use client'

export const dynamic = 'force-dynamic'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { BusinessTypeRedirect } from '@/components/business-type-redirect'
import { ContentLayout } from '@/components/layout/content-layout'
import { UniversalInventoryForm } from '@/components/universal/inventory'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

function AddGroceryInventoryPageContent() {
  const router = useRouter()
  const { currentBusiness, currentBusinessId, isAuthenticated } = useBusinessPermissionsContext()
  const [error, setError] = useState<string | null>(null)

  const isGroceryBusiness = currentBusiness?.businessType === 'grocery'

  if (!isAuthenticated || !currentBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Please select a grocery business to continue.</p>
        </div>
      </div>
    )
  }

  if (!isGroceryBusiness) {
    return <BusinessTypeRedirect />
  }

  const businessId = currentBusinessId!

  const handleFormSubmit = async (formData: any) => {
    try {
      setError(null)
      const response = await fetch(`/api/inventory/${businessId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Failed to create item')
      }
      router.replace('/grocery/inventory')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item')
      throw err
    }
  }

  return (
    <BusinessTypeRoute requiredBusinessType="grocery">
      <ContentLayout
        title="🛒 Add Grocery Inventory Item"
        subtitle="Add a new product to your grocery inventory"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Grocery', href: '/grocery' },
          { label: 'Inventory', href: '/grocery/inventory' },
          { label: 'Add Item', isActive: true },
        ]}
      >
        <div className="max-w-4xl mx-auto">
          <div className="card p-6">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <UniversalInventoryForm
              businessId={businessId}
              businessType="grocery"
              onSubmit={handleFormSubmit}
              onCancel={() => router.push('/grocery/inventory')}
              renderMode="inline"
            />
          </div>
        </div>
      </ContentLayout>
    </BusinessTypeRoute>
  )
}

export default function AddGroceryInventoryPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    }>
      <AddGroceryInventoryPageContent />
    </Suspense>
  )
}
