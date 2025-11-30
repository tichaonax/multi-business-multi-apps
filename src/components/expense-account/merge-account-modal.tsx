"use client"

import { useState } from 'react'
import type { OnSuccessArg } from '@/types/ui'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { useToastContext } from '@/components/ui/toast'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'
import { usePermissions } from '@/lib/auth-utils'

interface MergeAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (payload: OnSuccessArg) => void
  onError: (error: string) => void
  // Accept either object props or primitives for backwards compatibility
  siblingAccount?: any | null
  siblingAccountId?: string
  siblingAccountName?: string
  siblingAccountNumber?: string
  parentAccount?: any | null
  parentAccountName?: string
  parentAccountNumber?: string
  currentBalance?: number
}

export function MergeAccountModal({
  isOpen,
  onClose,
  onSuccess,
  onError,
  siblingAccount,
  siblingAccountId,
  siblingAccountName,
  siblingAccountNumber,
  parentAccount,
  parentAccountName,
  parentAccountNumber,
  currentBalance
}: MergeAccountModalProps) {
  // Ensure a safe numeric balance is used in the UI to prevent `toFixed` errors.
  // If a siblingAccount object is provided prefer its `balance` (more authoritative),
  // else fall back to the primitive `currentBalance` prop.
  const safeBalance = Number(siblingAccount?.balance ?? currentBalance ?? 0)
  // Backwards-compatible: accept `siblingAccount` or `parentAccount` input props (legacy callers)
  // Resolve a display id, name, and number that can be passed as either object or primitives
  const sId = (siblingAccountId as string | undefined) ?? (siblingAccount && siblingAccount.id) ?? ''
  const sName = (siblingAccountName as string | undefined) ?? (siblingAccount && siblingAccount.name) ?? ''
  const sNumber = (siblingAccountNumber as string | undefined) ?? (siblingAccount && siblingAccount.accountNumber) ?? ''
  const pName = (parentAccountName as string | undefined) ?? (parentAccount && parentAccount.name) ?? ''
  const pNumber = (parentAccountNumber as string | undefined) ?? (parentAccount && parentAccount.accountNumber) ?? ''
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const toast = useToastContext()
  const customAlert = useAlert()
  const customConfirm = useConfirm()
  const permissions = usePermissions()

  const handleClose = () => {
    setStep(1)
    onClose()
  }

  const handleNextStep = async () => {
    if (step === 1) {
      // Check if balance is zero
      if (safeBalance !== 0) {
        await customAlert({ title: 'Cannot merge account', description: `Cannot merge account with non-zero balance. Current balance: $${safeBalance.toFixed(2)}` })
        return
      }

      const confirmed = await customConfirm({ title: 'Confirm zero balance', description: 'Are you sure this sibling account has zero balance and is ready to merge?' })
      if (confirmed) {
        setStep(2)
      }
    } else if (step === 2) {
      const confirmed = await customConfirm({ title: 'Final confirmation', description: 'This action is irreversible. All transactions from this sibling account will be moved to the parent account. Are you absolutely sure you want to proceed?' })
      if (confirmed) {
        await handleMerge()
      }
    }
  }

  const handleMerge = async () => {
    setLoading(true)

    try {
      const result = await fetchWithValidation(`/api/expense-account/${sId}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmZeroBalance: true,
          confirmIrreversible: true
        })
      })

      // Success
      toast.push(result.message || 'Sibling account merged successfully')
      try {
        onSuccess({
          message: result.message || 'Sibling account merged successfully',
          id: result.data.parentAccountId,
          refresh: true
        })
      } catch (e) {}

      handleClose()
    } catch (error) {
      console.error('Merge sibling account error:', error)
      const message = error instanceof Error ? error.message : 'Failed to merge sibling account'
      toast.push(message)
      try {
        onError(message)
      } catch (e) {}
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-primary mb-4">Merge Sibling Account</h2>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
                Irreversible Action
              </h3>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                Merging will permanently move all transactions from the sibling account to the parent account and delete the sibling account.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3">
              <p className="text-xs text-secondary font-medium">SIBLING ACCOUNT</p>
              <p className="text-sm font-semibold text-primary">{sName}</p>
              <p className="text-xs text-secondary">{sNumber}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-3">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">PARENT ACCOUNT</p>
              <p className="text-sm font-semibold text-primary">{pName}</p>
              <p className="text-xs text-secondary">{pNumber}</p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-secondary">Current Balance:</span>
              <span className={`text-lg font-bold ${safeBalance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${safeBalance.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">Step 1: Balance Verification</h3>
            <p className="text-sm text-secondary">
              Before merging, please confirm that this sibling account has a zero balance.
              All transactions must be properly accounted for before proceeding.
            </p>
            {safeBalance === 0 ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
                <p className="text-sm text-green-800 dark:text-green-300">
                  ✓ Account balance is $0.00 - Ready for merge
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  ⚠️ Account balance is non-zero: ${safeBalance.toFixed(2)}. Please resolve balance before merging.
                </p>
                {!permissions?.isAdmin && (
                  <p className="text-sm text-amber-800 dark:text-amber-300 mt-2">Admin permission required to merge accounts with a non-zero balance.</p>
                )}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">Step 2: Final Confirmation</h3>
            <p className="text-sm text-secondary">
              This is your final confirmation. Once merged, this action cannot be undone.
              All deposits and payments from the sibling account will be transferred to the parent account.
            </p>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-800 dark:text-red-300">
                ⚠️ This action is permanent and cannot be reversed
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-6 border-t border-border">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-secondary bg-background border border-border rounded-md hover:bg-muted"
            disabled={loading}
          >
            Cancel
          </button>
          {step === 1 ? (
            <button
              onClick={handleNextStep}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={safeBalance !== 0}
            >
              Next: Confirm Merge
            </button>
          ) : (
            <button
              onClick={handleNextStep}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              disabled={loading || (safeBalance !== 0 && !permissions?.isAdmin)}
            >
              {loading ? 'Merging...' : 'Merge Accounts'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}