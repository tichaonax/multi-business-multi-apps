'use client'

export const dynamic = 'force-dynamic'

import { GenericReceiveStockPage } from '@/components/inventory/generic-receive-stock-page'

export default function ReceiveClothingInventoryPage() {
  return <GenericReceiveStockPage businessType="clothing" businessLabel="Clothing" icon="👕" />
}
