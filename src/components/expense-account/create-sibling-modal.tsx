"use client"

import { useState } from 'react'
import type { OnSuccessArg } from '@/types/ui'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { useToastContext } from '@/components/ui/toast'
import { usePermissions } from '@/lib/auth-utils'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'
import type { ExpenseAccount } from '@/types/expense-account'

interface CreateSiblingAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (payload: OnSuccessArg) => void
  onError?: (error: string) => void
  parentAccount?: ExpenseAccount | null
}

export function CreateSiblingAccountModal({
  isOpen,
  onClose,
  onSuccess,
  onError,
  parentAccount
}: CreateSiblingAccountModalProps) {
  const [loading, setLoading] = useState(false)
  const toast = useToastContext()
  const customAlert = useAlert()
  const customConfirm = useConfirm()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    lowBalanceThreshold: 500
  })

  const permissions = usePermissions()
  const cannotCreateFromSibling = parentAccount?.isSibling === true
  // DEBUG: log permissions for tests to validate the mock
  // console.log('CreateSiblingAccountModal permissions:', permissions)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Ensure parent account ID is present
    if (!parentAccount?.id || parentAccount.id.trim() === '' || parentAccount.id === 'undefined' || parentAccount.id === 'null') {
      await customAlert({ title: 'Parent account not specified', description: 'Please select a valid parent account.' })
      return
    }

    // Prevent creating from a sibling parent
    if (cannotCreateFromSibling) {
      await customAlert({ title: 'Cannot create sibling account', description: 'Cannot create a sibling account from another sibling account' })
      return
    }

    // Validate account name
    if (!formData.name.trim()) {
      await customAlert({ title: 'Missing name', description: 'Please enter a sibling account name' })
      return
    }

    // Validate threshold
    if (formData.lowBalanceThreshold <= 0) {
      await customAlert({ title: 'Invalid threshold', description: 'Low balance threshold must be greater than $0' })
      return
    }

    setLoading(true)

    try {
      const result = await fetchWithValidation(`/api/expense-account/${parentAccount?.id}/sibling`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: formData.name.trim(),
          description: formData.description.trim() || null,
          lowBalanceThreshold: formData.lowBalanceThreshold
        })
      })

      // Success
      toast.push('Sibling account created successfully')
      try {
        const created = result?.data?.siblingAccount || result?.data
        onSuccess({
          message: 'Sibling account created successfully',
          id: created?.id,
          refresh: true
        })
      } catch (e) {}

      onClose()

      // Reset form
      setFormData({
        name: '',
        description: '',
        lowBalanceThreshold: 500
      })
    } catch (error) {
      console.error('Create sibling account error:', error)
      const message = error instanceof Error ? error.message : 'Failed to create sibling account'
      toast.push(message)
      try {
        onError?.(message)
      } catch (e) {}
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    // Check if form has unsaved changes
    const hasChanges = formData.name.trim() !== '' ||
                       formData.description.trim() !== '' ||
                       formData.lowBalanceThreshold !== 500

    if (hasChanges) {
      const confirmed = await customConfirm({ title: 'Unsaved changes', description: 'You have unsaved changes. Are you sure you want to cancel?' })
      if (!confirmed) return
    }

    onClose()

    // Reset form
    setFormData({
      name: '',
      description: '',
      lowBalanceThreshold: 500
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-primary mb-4">Create Sibling Account</h2>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <span className="font-semibold">Parent Account:</span> {parentAccount?.accountName}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            Account Number: {parentAccount?.accountNumber}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Sibling Account Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Historical Data, Backdated Entries"
              required
              maxLength={100}
            />
            <p className="text-xs text-secondary mt-1">
              A descriptive name for this sibling account
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Optional description of what this sibling account is used for"
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Low Balance Threshold
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary">
                $
              </span>
              <input
                type="number"
                value={formData.lowBalanceThreshold}
                onChange={(e) => setFormData({
                  ...formData,
                  lowBalanceThreshold: e.target.value === '' ? 0 : parseFloat(e.target.value)
                })}
                className="w-full pl-8 pr-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                max="999999999.99"
                step="0.01"
              />
            </div>
            <p className="text-xs text-secondary mt-1">
              You'll be alerted when the balance falls below this amount. Default: $500
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <span className="font-semibold">Note:</span> Sibling accounts are used for capturing historical expense data. They can be merged back into the parent account later.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-secondary bg-background border border-border rounded-md hover:bg-muted"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={loading || !permissions.canCreateSiblingAccounts || cannotCreateFromSibling}
            >
              {loading ? 'Creating...' : 'Create Sibling Account'}
            </button>
          </div>
        </form>
          {cannotCreateFromSibling && (
            <div className="mt-2 text-sm text-red-600 dark:text-red-400">
              Cannot create a sibling account from another sibling account. Select a parent account instead.
            </div>
          )}
      </div>
    </div>
  )
}