'use client'

export const dynamic = 'force-dynamic'

import { GenericAddInventoryPage } from '@/components/inventory/generic-add-inventory-page'

export default function AddHardwareInventoryPage() {
  return <GenericAddInventoryPage businessType="hardware" businessLabel="Hardware" icon="🔧" />
}
