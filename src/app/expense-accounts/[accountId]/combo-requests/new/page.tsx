import { ComboRequestForm } from '@/components/expense-account/combo-request-form'

export default async function NewComboRequestPage({
  params,
}: {
  params: Promise<{ accountId: string }>
}) {
  const { accountId } = await params

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <ComboRequestForm accountId={accountId} />
      </div>
    </div>
  )
}
