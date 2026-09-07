'use client'

export const dynamic = 'force-dynamic'

import { GenericReceiveStockPage } from '@/components/inventory/generic-receive-stock-page'

export default function ReceiveHardwareInventoryPage() {
  return <GenericReceiveStockPage businessType="hardware" businessLabel="Hardware" icon="🔧" />
}
