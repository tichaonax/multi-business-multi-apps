'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { isSystemAdmin } from '@/lib/permission-utils'
import { LaybyForm } from '@/components/laybys/layby-form'
import { CreateLaybyPayload } from '@/types/layby'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useAlert } from '@/components/ui/confirm-modal'

export default function NewLaybyPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const customAlert = useAlert()

  const { currentBusiness, hasPermission } = useBusinessPermissionsContext()
  const currentUser = session?.user as any
  const businessId = currentBusiness?.businessId
  const canManageLaybys = isSystemAdmin(currentUser) || hasPermission('canManageLaybys')

  const handleSubmit = async (data: CreateLaybyPayload) => {
    if (!businessId) {
      setError('No business selected')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/laybys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'system'
        },
        body: JSON.stringify({
          ...data,
          businessId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create layby')
      }

      const result = await response.json()

      // Show success message and redirect after user acknowledges
      await customAlert({
        title: 'Layby Created Successfully!',
        description: `Layby Number: ${result.data.laybyNumber}\n\nClick OK to proceed to collect the initial deposit.`,
        confirmText: 'OK - Collect Deposit'
      })

      // Redirect to layby detail page
      router.push(`/business/laybys/${result.data.id}`)
    } catch (err) {
      console.error('Error creating layby:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/business/laybys')
  }

  if (!businessId) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="card p-12 text-center border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
              <div className="text-6xl mb-4">🏢</div>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">No Business Selected</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                To create a layby, you need to select a business first.
              </p>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg text-left max-w-md mx-auto border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">How to select a business:</h3>
                <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li className="flex items-start">
                    <span className="font-bold mr-2">1.</span>
                    <span>Look at the left sidebar under <strong>&quot;Business Types&quot;</strong></span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">2.</span>
                    <span>Click on a business type (e.g., Clothing, Hardware, Grocery)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">3.</span>
                    <span>Click on a specific business from the list</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">4.</span>
                    <span>Return here to create a layby for that business</span>
                  </li>
                </ol>
              </div>
              <div className="mt-6">
                <Button variant="outline" onClick={() => router.push('/business/laybys')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Layby List
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!canManageLaybys) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-8">
          <div className="card p-12 text-center">
            <p className="text-secondary">You don&apos;t have permission to create laybys</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/business/laybys')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Laybys
          </Button>

          <h1 className="text-3xl font-bold text-primary">Create New Layby</h1>
          <p className="text-secondary mt-1">
            Set up a new layby agreement for a customer
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="card p-6 mb-6 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
            <p className="text-red-600 dark:text-red-400 font-semibold">Error creating layby:</p>
            <p className="text-red-600 dark:text-red-400 mt-1">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="card p-6">
          <LaybyForm
            businessId={businessId}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
          />
        </div>

        {/* Help Text */}
        <div className="card p-6 mt-6 bg-blue-50 dark:bg-blue-950">
          <h3 className="font-semibold mb-2">Creating a Layby</h3>
          <ul className="text-sm text-secondary space-y-1 list-disc list-inside">
            <li>Enter the customer ID who is eligible for layby purchases</li>
            <li>Add all items the customer wants to put on layby</li>
            <li>Set the deposit percentage (typically 20-50%)</li>
            <li>Choose the installment frequency (weekly, fortnightly, monthly)</li>
            <li>Set payment and completion due dates</li>
            <li>Add any applicable fees (service, administration)</li>
            <li>Review the summary before creating</li>
          </ul>
        </div>
      </div>
    </ProtectedRoute>
  )
}
