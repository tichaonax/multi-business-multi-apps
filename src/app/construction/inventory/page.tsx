'use client'

export const dynamic = 'force-dynamic'

import { GenericInventoryListPage } from '@/components/inventory/generic-inventory-list-page'

export default function ConstructionInventoryPage() {
  return <GenericInventoryListPage businessType="construction" businessLabel="Construction" icon="🏗️" />
}
