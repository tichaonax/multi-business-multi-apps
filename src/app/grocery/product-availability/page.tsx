'use client'

export const dynamic = 'force-dynamic'

import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ItemAvailabilityPanel } from '@/components/customer-display/item-availability-panel'

export default function GroceryProductAvailabilityPage() {
  return (
    <BusinessTypeRoute requiredBusinessType="grocery">
      <ContentLayout
        title="Product Availability"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Grocery', href: '/grocery' },
          { label: 'Product Availability', isActive: true }
        ]}
      >
        <ItemAvailabilityPanel businessType="grocery" />
      </ContentLayout>
    </BusinessTypeRoute>
  )
}
