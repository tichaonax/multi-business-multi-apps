'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'

// MBM-296: superseded by the Pricing, Cost & Value Exceptions report, which
// covers missing cost price (this report's whole scope) plus missing/zero
// selling price, below-cost sales, zero/low margin, suspicious values,
// price-change anomalies, category benchmarking, and a review/approval
// workflow — for the business currently selected in the business switcher.
// Kept as a redirect notice (not a hard redirect) so a bookmarked link still
// resolves to something useful, and because the new report is scoped to one
// business at a time while this one showed missing-cost items across every
// business at once — that "all businesses" overview has no direct
// replacement here, only per-business drill-down.
export default function MissingCostPricePage() {
  return (
    <ContentLayout title="Missing Cost Price" subtitle="This report has moved">
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-lg text-primary font-medium">This report has been superseded.</p>
        <p className="text-sm text-secondary">
          Missing cost price is now one exception type inside the broader{' '}
          <strong>Pricing, Cost &amp; Value Exceptions</strong> report, which also covers missing/zero
          selling prices, below-cost sales, suspicious values, price-change anomalies, and a
          review/approval workflow — for the business currently selected in the switcher.
        </p>
        <Link
          href="/inventory/reports/pricing-exceptions"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          Go to Pricing, Cost &amp; Value Exceptions →
        </Link>
      </div>
    </ContentLayout>
  )
}
