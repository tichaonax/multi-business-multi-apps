'use client'

export const dynamic = 'force-dynamic'

import { useSearchParams } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { PromotionsPanel } from '@/components/promotions/promotions-panel'

export default function GroceryPromotionsPage() {
  const searchParams = useSearchParams()
  return (
    <BusinessTypeRoute requiredBusinessType="grocery">
      <ContentLayout
        title="Promotional Sales"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Grocery', href: '/grocery' },
          { label: 'Promotional Sales', isActive: true }
        ]}
      >
        <PromotionsPanel
          businessType="grocery"
          initialItemId={searchParams?.get('productId')}
          initialItemName={searchParams?.get('productName')}
        />
      </ContentLayout>
    </BusinessTypeRoute>
  )
}
