'use client'

export const dynamic = 'force-dynamic'

import { GenericAddInventoryPage } from '@/components/inventory/generic-add-inventory-page'

export default function AddConstructionInventoryPage() {
  return <GenericAddInventoryPage businessType="construction" businessLabel="Construction" icon="🏗️" />
}
