'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { BusinessTypeRedirect } from '@/components/business-type-redirect'
import { ContentLayout } from '@/components/layout/content-layout'
import { UniversalInventoryGrid, UniversalInventoryForm } from '@/components/universal/inventory'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'

interface GenericInventoryListPageProps {
  businessType: string
  businessLabel: string
  icon?: string
}

// Minimal but fully functional inventory list — list/edit/delete on the
// generic UniversalInventoryGrid + UniversalInventoryForm, for business
// types that don't need the richer tabs (movements, alerts, bulk stock,
// merge) that clothing/hardware/grocery/restaurant have grown over time.
export function GenericInventoryListPage({ businessType, businessLabel, icon = '📦' }: GenericInventoryListPageProps) {
  const { currentBusiness, currentBusinessId, isAuthenticated, isSystemAdmin, hasPermission } = useBusinessPermissionsContext()
  const alert = useAlert()
  const confirm = useConfirm()
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const canManageInventory = isSystemAdmin || hasPermission('canManageInventory')
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

  const handleItemEdit = (item: any) => {
    setSelectedItem(item)
    setShowEditForm(true)
  }

  const handleItemDelete = async (item: any) => {
    const ok = await confirm({ title: 'Delete item', description: `Are you sure you want to delete ${item.name}?`, confirmText: 'Delete', cancelText: 'Cancel' })
    if (!ok) return
    try {
      const response = await fetch(`/api/inventory/${businessId}/items/${item.id}`, { method: 'DELETE' })
      if (response.ok) {
        setRefreshKey(prev => prev + 1)
      } else {
        await alert({ title: 'Delete failed', description: 'Failed to delete item' })
      }
    } catch {
      await alert({ title: 'Delete failed', description: 'Error deleting item' })
    }
  }

  const handleFormSubmit = async (formData: any) => {
    const url = selectedItem
      ? `/api/inventory/${businessId}/items/${selectedItem.id}`
      : `/api/inventory/${businessId}/items`
    const method = selectedItem ? 'PUT' : 'POST'
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || errorData.error || 'Failed to save item')
    }
    setShowEditForm(false)
    setSelectedItem(null)
    setRefreshKey(prev => prev + 1)
  }

  return (
    <BusinessTypeRoute requiredBusinessType={businessType}>
      <ContentLayout
        title={`${icon} ${businessLabel} Inventory`}
        subtitle={`Manage your ${businessLabel.toLowerCase()} inventory`}
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: businessLabel, href: `/${businessType}` },
          { label: 'Inventory', isActive: true },
        ]}
      >
        <div className="flex justify-end gap-2 mb-4">
          <Link
            href={`/${businessType}/inventory/receive`}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
          >
            Receive Stock
          </Link>
          <Link
            href={`/${businessType}/inventory/add`}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            Add Item
          </Link>
        </div>

        <UniversalInventoryGrid
          businessId={businessId}
          businessType={businessType}
          refreshTrigger={refreshKey}
          onItemEdit={handleItemEdit}
          onItemView={handleItemEdit}
          onItemDelete={canManageInventory ? handleItemDelete : undefined}
          layout="table"
        />

        {showEditForm && selectedItem && (
          <UniversalInventoryForm
            businessId={businessId}
            businessType={businessType}
            item={selectedItem}
            mode="edit"
            isOpen={showEditForm}
            onSubmit={handleFormSubmit}
            onCancel={() => { setShowEditForm(false); setSelectedItem(null) }}
            onSilentUpdate={() => setRefreshKey(prev => prev + 1)}
          />
        )}
      </ContentLayout>
    </BusinessTypeRoute>
  )
}
