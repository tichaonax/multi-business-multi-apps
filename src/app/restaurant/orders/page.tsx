'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { UniversalOrdersPage } from '../../../components/universal/orders'

export default function RestaurantOrdersPage() {
  return (
    <BusinessTypeRoute requiredBusinessType="restaurant">
      <UniversalOrdersPage businessType="restaurant" />
    </BusinessTypeRoute>
  )
}