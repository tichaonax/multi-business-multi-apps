'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { useAlert } from '@/components/ui/confirm-modal'
import { useToastContext } from '@/components/ui/toast'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { getEffectivePermissions } from '@/lib/permission-utils'

export default function NewExpenseAccountPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const customAlert = useAlert()
  const toast = useToastContext()

  const [canCreateAccount, setCanCreateAccount] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    accountName: '',
    description: '',
    lowBalanceThreshold: 500
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      checkPermissions()
    }
  }, [session])

  const checkPermissions = async () => {
    try {
      const permissions = getEffectivePermissions(session?.user)

      setCanCreateAccount(permissions.canCreateExpenseAccount || false)

      // Redirect if no create permission
      if (!permissions.canCreateExpenseAccount) {
        router.push('/expense-accounts')
      }
    } catch (error) {
      console.error('Error checking permissions:', error)
      router.push('/expense-accounts')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate account name
    if (!formData.accountName.trim()) {
      customAlert('Please enter an account name')
      return
    }

    // Validate threshold
    if (formData.lowBalanceThreshold <= 0) {
      customAlert('Low balance threshold must be greater than $0')
      return
    }

    setSubmitting(true)

    try {
      const result = await fetchWithValidation('/api/expense-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountName: formData.accountName.trim(),
          description: formData.description.trim() || null,
          lowBalanceThreshold: formData.lowBalanceThreshold
        })
      })

      // Success
      toast.push('Expense account created successfully')

      // Navigate to the new account detail page
      if (result.data?.account?.id) {
        router.push(`/expense-accounts/${result.data.account.id}`)
      } else {
        router.push('/expense-accounts')
      }
    } catch (error) {
      console.error('Create expense account error:', error)
      const message = error instanceof Error ? error.message : 'Failed to create expense account'
      toast.push(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <ContentLayout title="Create Expense Account">
        <div className="flex items-center justify-center h-64">
          <div className="text-secondary">Loading...</div>
        </div>
      </ContentLayout>
    )
  }

  if (!canCreateAccount) {
    return (
      <ContentLayout title="Create Expense Account">
        <div className="flex items-center justify-center h-64">
          <div className="text-secondary">You do not have permission to create expense accounts</div>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="Create Expense Account"
      description="Create a new expense account for tracking payments and deposits"
    >
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Account Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.accountName}
                onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Marketing Expenses, Office Supplies"
                required
                maxLength={100}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                A descriptive name for this expense account
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="Optional description of what this account is used for"
                maxLength={500}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Low Balance Threshold
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  value={formData.lowBalanceThreshold}
                  onChange={(e) => setFormData({
                    ...formData,
                    lowBalanceThreshold: parseFloat(e.target.value) || 0
                  })}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  max="999999999.99"
                  step="0.01"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                You'll be alerted when the balance falls below this amount. Default: $500
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <span className="font-semibold">Note:</span> The account number will be generated automatically when you create the account. The initial balance will be $0.00.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => router.push('/expense-accounts')}
                className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ContentLayout>
  )
}
