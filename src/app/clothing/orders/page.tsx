import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { UniversalOrdersPage } from '../../../components/universal/orders'

export default function ClothingOrdersPage() {
  return (
    <BusinessTypeRoute requiredBusinessType="clothing">
      <UniversalOrdersPage businessType="clothing" />
    </BusinessTypeRoute>
  )
}