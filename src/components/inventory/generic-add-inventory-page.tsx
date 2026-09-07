'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { BusinessTypeRedirect } from '@/components/business-type-redirect'
import { ContentLayout } from '@/components/layout/content-layout'
import { UniversalInventoryForm } from '@/components/universal/inventory'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'

interface GenericAddInventoryPageProps {
  businessType: string
  businessLabel: string
  icon?: string
}

// Business-agnostic "Add Item" page — the grocery/restaurant inventory/add
// pages all follow this exact shape already; this just parameterizes it so
// business types without their own custom fields (clothing, hardware,
// construction) don't each need a near-duplicate page.
export function GenericAddInventoryPage({ businessType, businessLabel, icon = '📦' }: GenericAddInventoryPageProps) {
  const router = useRouter()
  const { currentBusiness, currentBusinessId, isAuthenticated } = useBusinessPermissionsContext()
  const { push: showToast } = useToastContext()
  const [error, setError] = useState<string | null>(null)
  // Once set, the form switches into edit mode for the just-created item —
  // the image-upload and tag-picker options only appear once an item has a
  // real id, so closing/navigating away right after POST meant there was
  // never a chance to attach a photo or tags.
  const [createdItem, setCreatedItem] = useState<any>(null)

  const isCorrectBusinessType = currentBusiness?.businessType === businessType

  if (!isAuthenticated || !currentBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Please select a {businessLabel.toLowerCase()} business to continue.</p>
        </div>
      </div>
    )
  }

  if (!isCorrectBusinessType) {
    return <BusinessTypeRedirect />
  }

  const businessId = currentBusinessId!

  const handleFormSubmit = async (formData: any) => {
    try {
      setError(null)
      const url = createdItem
        ? `/api/inventory/${businessId}/items/${createdItem.id}`
        : `/api/inventory/${businessId}/items`
      const method = createdItem ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Failed to save item')
      }
      if (!createdItem) {
        const data = await response.json()
        setCreatedItem(data.item)
        showToast('Item created — add a photo or tags now, or go back to inventory when done', { type: 'success' })
      } else {
        router.replace(`/${businessType}/inventory`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item')
      throw err
    }
  }

  return (
    <BusinessTypeRoute requiredBusinessType={businessType}>
      <ContentLayout
        title={`${icon} ${createdItem ? 'Edit' : 'Add'} ${businessLabel} Inventory Item`}
        subtitle={createdItem ? 'Add a photo or tags, or head back to inventory when done' : `Add a new product to your ${businessLabel.toLowerCase()} inventory`}
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: businessLabel, href: `/${businessType}` },
          { label: 'Inventory', href: `/${businessType}/inventory` },
          { label: 'Add Item', isActive: true },
        ]}
      >
        <div className="max-w-7xl mx-auto">
          <div className="card p-6">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <UniversalInventoryForm
              businessId={businessId}
              businessType={businessType}
              item={createdItem ?? undefined}
              mode={createdItem ? 'edit' : 'create'}
              onSubmit={handleFormSubmit}
              onCancel={() => router.push(`/${businessType}/inventory`)}
              renderMode="inline"
            />
          </div>
        </div>
      </ContentLayout>
    </BusinessTypeRoute>
  )
}
