'use client'

export const dynamic = 'force-dynamic'

import { StockStatusReport } from '@/components/inventory/stock-status-report'

export default function LowStockReportPage() {
  return (
    <StockStatusReport
      status="low"
      title="Low Stock"
      description="Tracked items at or below the low-stock threshold. Click an item to restock it — you'll be brought straight back here with the change reflected."
      reportPath="/inventory/reports/low-stock"
    />
  )
}
