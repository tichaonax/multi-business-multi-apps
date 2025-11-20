'use client'

import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { UniversalOrdersPage } from '../../../components/universal/orders'

export default function RestaurantOrdersPage() {
  return (
    <BusinessTypeRoute requiredBusinessType="restaurant">
      <UniversalOrdersPage businessType="restaurant" />
    </BusinessTypeRoute>
  )
}