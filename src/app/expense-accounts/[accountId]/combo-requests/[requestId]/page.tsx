'use client'

export const dynamic = 'force-dynamic'

import { useParams } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { ComboRequestDetail } from '@/components/expense-account/combo-request-detail'

export default function ComboRequestDetailPage() {
  const params = useParams() as { accountId: string; requestId: string }
  return (
    <ContentLayout title="Combo Request">
      <ComboRequestDetail accountId={params.accountId} requestId={params.requestId} />
    </ContentLayout>
  )
}
