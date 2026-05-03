import { ComboRequestForm } from '@/components/expense-account/combo-request-form'

export default async function EditComboRequestPage({
  params,
}: {
  params: Promise<{ accountId: string; requestId: string }>
}) {
  const { accountId, requestId } = await params
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <ComboRequestForm accountId={accountId} requestId={requestId} />
      </div>
    </div>
  )
}
