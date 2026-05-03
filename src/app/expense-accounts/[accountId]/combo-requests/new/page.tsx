import { ContentLayout } from '@/components/layout/content-layout'
import { ComboRequestForm } from '@/components/expense-account/combo-request-form'

export default async function NewComboRequestPage({
  params,
}: {
  params: Promise<{ accountId: string }>
}) {
  const { accountId } = await params

  return (
    <ContentLayout title="New Combo Payment Request">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <ComboRequestForm accountId={accountId} />
      </div>
    </ContentLayout>
  )
}
