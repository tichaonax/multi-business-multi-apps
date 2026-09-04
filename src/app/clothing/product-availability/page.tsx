'use client'

export const dynamic = 'force-dynamic'

import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ItemAvailabilityPanel } from '@/components/customer-display/item-availability-panel'

export default function ClothingProductAvailabilityPage() {
  return (
    <BusinessTypeRoute requiredBusinessType="clothing">
      <ContentLayout
        title="Product Availability"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clothing', href: '/clothing' },
          { label: 'Product Availability', isActive: true }
        ]}
      >
        <ItemAvailabilityPanel businessType="clothing" />
      </ContentLayout>
    </BusinessTypeRoute>
  )
}
