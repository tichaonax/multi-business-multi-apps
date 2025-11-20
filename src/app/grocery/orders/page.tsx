import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { UniversalOrdersPage } from '../../../components/universal/orders'

export default function GroceryOrdersPage() {
  return (
    <BusinessTypeRoute requiredBusinessType="grocery">
      <UniversalOrdersPage businessType="grocery" />
    </BusinessTypeRoute>
  )
}