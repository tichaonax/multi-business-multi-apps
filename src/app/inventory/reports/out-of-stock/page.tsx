'use client'

export const dynamic = 'force-dynamic'

import { StockStatusReport } from '@/components/inventory/stock-status-report'

export default function OutOfStockReportPage() {
  return (
    <StockStatusReport
      status="out"
      title="Out of Stock"
      description="Tracked items with zero stock on hand. Click an item to restock it — you'll be brought straight back here with the change reflected."
      reportPath="/inventory/reports/out-of-stock"
    />
  )
}
