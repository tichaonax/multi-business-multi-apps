'use client'

export const dynamic = 'force-dynamic'

import { GenericReceiveStockPage } from '@/components/inventory/generic-receive-stock-page'

export default function ReceiveConstructionInventoryPage() {
  return <GenericReceiveStockPage businessType="construction" businessLabel="Construction" icon="🏗️" />
}
