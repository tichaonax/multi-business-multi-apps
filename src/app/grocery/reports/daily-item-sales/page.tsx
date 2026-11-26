'use client'

// MBM-344: the item sales report — shared by every
// business type (re-exported from clothing, hardware, restaurant and
// vehicle-service, as the reorder page). The same table is a closed section
// in the EOD report. MBM-345: one day or a range of days (the standard date
// range popup), with item thumbnails.
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { DailyItemSales } from '@/components/reports/daily-item-sales'
import { getLocalDateString } from '@/lib/utils'
import { YmdRangePicker } from '@/components/ui/date-range-picker'
import '@/styles/print-report.css'

export default function DailyItemSalesPage() {
  const { currentBusiness, currentBusinessId } = useBusinessPermissionsContext()
  const [range, setRange] = useState(() => ({ from: getLocalDateString(), to: getLocalDateString() }))
  const oneDay = range.from === range.to
  const [label, setLabel] = useState('Today')
  const businessType = currentBusiness?.businessType || 'grocery'
  const reportsHref = `/${businessType === 'vehicle_service' ? 'vehicle-service' : businessType}/reports`

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4 print:hidden">
        <div>
          <Link href={reportsHref} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">← Reports</Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Item Sales</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">{currentBusiness?.businessName}: what sold {oneDay ? 'on the day' : 'in the period'}, what&apos;s left, and what to restock</p>
        </div>
        <div className="flex items-end gap-2">
          <YmdRangePicker from={range.from} to={range.to} title="Items sold"
            onChange={(f, t, change) => { if (f && t) { setRange({ from: f, to: t }); setLabel(change.label) } }} />
          <button onClick={() => window.print()} className="px-3 py-1.5 rounded bg-gray-700 text-white text-sm hover:bg-gray-800">🖨 Print</button>
        </div>
      </div>
      <h2 className="hidden print:block text-xl font-bold mb-2">
        {currentBusiness?.businessName}: items sold {oneDay ? `on ${range.from}` : `${range.from} to ${range.to}`} ({label})
      </h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 print:hidden">Remaining stock is the stock now, not at the end of {oneDay ? 'that day' : 'the period'}.</p>
      {currentBusinessId
        ? <DailyItemSales businessId={currentBusinessId} start={range.from} end={range.to} />
        : <p className="text-gray-500">Select a business.</p>}
    </div>
  )
}
