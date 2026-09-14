'use client'

export const dynamic = 'force-dynamic'

import { useSearchParams } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { PromotionsPanel } from '@/components/promotions/promotions-panel'

export default function ClothingPromotionsPage() {
  const searchParams = useSearchParams()
  return (
    <BusinessTypeRoute requiredBusinessType="clothing">
      <ContentLayout
        title="Promotional Sales"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clothing', href: '/clothing' },
          { label: 'Promotional Sales', isActive: true }
        ]}
      >
        <PromotionsPanel
          businessType="clothing"
          initialItemId={searchParams?.get('productId')}
          initialItemName={searchParams?.get('productName')}
        />
      </ContentLayout>
    </BusinessTypeRoute>
  )
}
