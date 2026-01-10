'use client'

import { useState } from 'react'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider } from '@/components/universal'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { AdUploadForm } from '@/components/customer-display/ad-upload-form'
import { AdList } from '@/components/customer-display/ad-list'

interface Ad {
  id: string
  title: string
  imageUrl: string
  duration: number
  isActive: boolean
}

export default function RestaurantCustomerDisplayPage() {
  const { currentBusinessId, currentBusiness, isAuthenticated, loading } = useBusinessPermissionsContext()
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [editingAd, setEditingAd] = useState<Ad | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleSuccess = () => {
    setShowUploadForm(false)
    setEditingAd(null)
    setRefreshTrigger(prev => prev + 1)
  }

  const handleEdit = (ad: Ad) => {
    setEditingAd(ad)
    setShowUploadForm(true)
  }

  const handleCancel = () => {
    setShowUploadForm(false)
    setEditingAd(null)
  }

  const openPreview = () => {
    if (!currentBusinessId) return
    const url = `/customer-display?businessId=${currentBusinessId}&terminalId=preview`
    window.open(url, '_blank', 'width=1920,height=1080')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!isAuthenticated || !currentBusinessId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need to be logged in with admin access to manage customer displays.</p>
        </div>
      </div>
    )
  }

  return (
    <BusinessProvider businessId={currentBusinessId}>
      <BusinessTypeRoute requiredBusinessType="restaurant">
        <ContentLayout
          title="Customer Display Ads"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Restaurant', href: '/restaurant' },
            { label: 'Manage', href: '/restaurant/manage' },
            { label: 'Customer Display', isActive: true }
          ]}
        >
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Customer Display Advertisements
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Manage marketing ads shown on customer-facing displays during idle time
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={openPreview}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Preview Display
                </button>
                {!showUploadForm && (
                  <button
                    onClick={() => setShowUploadForm(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Upload New Ad
                  </button>
                )}
              </div>
            </div>

            {/* Help Text */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                About Customer Display Ads
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                When the POS system is idle (no items in cart), the customer-facing display shows a rotating slideshow of your uploaded advertisements. This is a great way to promote specials, new menu items, or seasonal offerings.
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>Recommended image size: 1920x1080px (16:9 aspect ratio)</li>
                <li>Supported formats: JPG, PNG, GIF</li>
                <li>Maximum file size: 5MB</li>
                <li>Drag and drop to reorder ads in the list below</li>
                <li>Toggle ads active/inactive without deleting them</li>
              </ul>
            </div>

            {/* Upload Form */}
            {showUploadForm && (
              <AdUploadForm
                businessId={currentBusinessId}
                ad={editingAd || undefined}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            )}

            {/* Ad List */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Your Advertisements {!showUploadForm && `(${refreshTrigger})`}
              </h2>
              <AdList
                businessId={currentBusinessId}
                onEdit={handleEdit}
                refreshTrigger={refreshTrigger}
              />
            </div>
          </div>
        </ContentLayout>
      </BusinessTypeRoute>
    </BusinessProvider>
  )
}
