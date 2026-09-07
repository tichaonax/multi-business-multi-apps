'use client'

export const dynamic = 'force-dynamic'

import { GenericAddInventoryPage } from '@/components/inventory/generic-add-inventory-page'

export default function AddClothingInventoryPage() {
  return <GenericAddInventoryPage businessType="clothing" businessLabel="Clothing" icon="👕" />
}
