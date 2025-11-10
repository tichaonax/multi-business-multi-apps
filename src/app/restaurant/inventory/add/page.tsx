'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { UniversalInventoryForm } from '@/components/universal/inventory'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

export default function AddRestaurantInventoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    currentBusiness,
    currentBusinessId,
    isAuthenticated
  } = useBusinessPermissionsContext()

  // Check if current business is a restaurant business
  const isRestaurantBusiness = currentBusiness?.businessType === 'restaurant'

  if (!isAuthenticated || !currentBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Please select a restaurant business to continue.</p>
        </div>
      </div>
    )
  }

  if (!isRestaurantBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Wrong Business Type</h2>
          <p className="text-gray-600 dark:text-gray-400">
            This page is only available for restaurant businesses.
          </p>
        </div>
      </div>
    )
  }

  const businessId = currentBusinessId!

  const handleFormSubmit = async (formData: any) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/inventory/${businessId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Failed to create item')
      }

      // Redirect back to inventory page
      router.push('/restaurant/inventory')
    } catch (err) {
      console.error('Error creating item:', err)
      setError(err instanceof Error ? err.message : 'Failed to create item')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/restaurant/inventory')
  }

  return (
    <BusinessTypeRoute requiredBusinessType="restaurant">
      <ContentLayout
        title="Add New Ingredient"
        subtitle="Add a new ingredient or supply item to your restaurant inventory"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Restaurant', href: '/restaurant' },
          { label: 'Inventory', href: '/restaurant/inventory' },
          { label: 'Add Item', isActive: true }
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
              businessType="restaurant"
              onSubmit={handleFormSubmit}
              onCancel={handleCancel}
              renderMode="inline"
              customFields={[
                {
                  name: 'ingredientType',
                  label: 'Ingredient Type',
                  type: 'select',
                  options: [
                    { value: 'Proteins', label: '🥩 Proteins' },
                    { value: 'Vegetables', label: '🥬 Vegetables' },
                    { value: 'Dairy', label: '🥛 Dairy' },
                    { value: 'Pantry', label: '🏺 Pantry' },
                    { value: 'Beverages', label: '🥤 Beverages' },
                    { value: 'Supplies', label: '📦 Supplies' }
                  ],
                  section: 'restaurant',
                  required: true
                },
                {
                  name: 'storageTemp',
                  label: 'Storage Temperature',
                  type: 'select',
                  options: [
                    { value: 'room', label: 'Room Temperature' },
                    { value: 'refrigerated', label: 'Refrigerated (32°F - 40°F)' },
                    { value: 'frozen', label: 'Frozen (-10°F - 0°F)' }
                  ],
                  section: 'restaurant'
                },
                {
                  name: 'expirationDays',
                  label: 'Shelf Life (Days)',
                  type: 'number',
                  placeholder: 'Average days until expiration',
                  section: 'restaurant'
                },
                {
                  name: 'allergens',
                  label: 'Allergens',
                  type: 'multiselect',
                  options: [
                    { value: 'gluten', label: 'Gluten' },
                    { value: 'dairy', label: 'Dairy' },
                    { value: 'eggs', label: 'Eggs' },
                    { value: 'nuts', label: 'Tree Nuts' },
                    { value: 'peanuts', label: 'Peanuts' },
                    { value: 'shellfish', label: 'Shellfish' },
                    { value: 'fish', label: 'Fish' },
                    { value: 'soy', label: 'Soy' }
                  ],
                  section: 'restaurant'
                },
                {
                  name: 'preparationTime',
                  label: 'Preparation Time (minutes)',
                  type: 'number',
                  placeholder: 'Time to prepare/cook this ingredient',
                  section: 'restaurant'
                },
                {
                  name: 'yield',
                  label: 'Yield/Portion Size',
                  type: 'text',
                  placeholder: 'e.g., 100g, 1 cup, 2 pieces',
                  section: 'restaurant'
                },
                {
                  name: 'supplier',
                  label: 'Primary Supplier',
                  type: 'text',
                  placeholder: 'Supplier name or contact',
                  section: 'restaurant'
                }
              ]}
            />
          </div>
        </div>
      </ContentLayout>
    </BusinessTypeRoute>
  )
}
