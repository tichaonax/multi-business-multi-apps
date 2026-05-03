import { ContentLayout } from '@/components/layout/content-layout'
import { ComboRequestForm } from '@/components/expense-account/combo-request-form'

export default async function EditComboRequestPage({
  params,
}: {
  params: Promise<{ accountId: string; requestId: string }>
}) {
  const { accountId, requestId } = await params
  return (
    <ContentLayout title="Edit Combo Payment Request">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <ComboRequestForm accountId={accountId} requestId={requestId} />
      </div>
    </ContentLayout>
  )
}
