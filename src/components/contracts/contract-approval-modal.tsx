'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

interface ContractApprovalModalProps {
  contract: {
    id: string
    contractNumber: string
    version: number
    baseSalary: number
    livingAllowance?: number | null
    commissionAmount?: number | null
    startDate: string
    endDate?: string | null
    employeeSignedAt?: string | null
    status: string
    jobTitle?: { title: string }
    job_titles?: { title: string }
    business?: { name: string }
    businesses_employee_contracts_primaryBusinessIdTobusinesses?: { name: string }
    employee?: { fullName: string; employeeNumber: string }
    employees_employee_contracts_employeeIdToemployees?: { fullName: string; employeeNumber: string }
  }
  employeeId: string
  onClose: () => void
  onApproved: () => void
}

export function ContractApprovalModal({
  contract,
  employeeId,
  onClose,
  onApproved
}: ContractApprovalModalProps) {
  const { data: session } = useSession()
  const [isApproving, setIsApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle different response formats from API
  const employee = contract.employee || contract.employees_employee_contracts_employeeIdToemployees
  const jobTitle = contract.jobTitle || contract.job_titles
  const business = contract.business || contract.businesses_employee_contracts_primaryBusinessIdTobusinesses

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleApprove = async () => {
    // Prevent double-approval
    if (contract.managerSignedAt || isApproving) {
      if (contract.managerSignedAt) {
        setError('This contract has already been approved by a manager.')
      }
      return
    }

    setError(null)
    setIsApproving(true)

    try {
      const response = await fetch(
        `/api/employees/${employeeId}/contracts/${contract.id}/approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }
      )

      const data = await response.json()

      if (!response.ok) {
        // Don't throw - just set the error to display in UI
        setError(data.error || 'Failed to approve contract')
        setIsApproving(false)
        return
      }

      // Success - notify parent and close modal
      // Keep button disabled to prevent double-click
      onApproved()
      onClose()
    } catch (err: any) {
      console.error('Contract approval error:', err)
      setError(err.message || 'An unexpected error occurred. Please try again.')
      setIsApproving(false)
    }
    // Note: Don't reset isApproving on success - keep button disabled until modal closes
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {contract.employeeSignedAt ? 'Approve Employment Contract' : 'Sign and Approve Employment Contract'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {contract.employeeSignedAt
                  ? 'Review and approve this contract to activate the employee'
                  : 'Review and sign this contract on behalf of the employee and manager'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              disabled={isApproving}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contract Details */}
        <div className="px-6 py-4 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex">
                <span className="text-red-400 mr-2">⚠️</span>
                <span className="text-red-700 dark:text-red-400 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Contract Header Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Contract Number</p>
                <p className="font-semibold text-gray-900 dark:text-white">{contract.contractNumber}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Version</p>
                <p className="font-semibold text-gray-900 dark:text-white">v{contract.version}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Employee</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {employee?.fullName} ({employee?.employeeNumber})
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Employee Signed</p>
                <p className={`font-semibold ${contract.employeeSignedAt ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {contract.employeeSignedAt ? `✓ ${formatDateTime(contract.employeeSignedAt)}` : '⏳ Will be signed on approval'}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Manager Signed</p>
                <p className={`font-semibold ${contract.managerSignedAt ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {contract.managerSignedAt ? `✓ ${formatDateTime(contract.managerSignedAt)}` : '⏳ Pending approval'}
                </p>
              </div>
            </div>
          </div>

          {/* Position & Business */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Job Title
              </label>
              <p className="text-gray-900 dark:text-white">{jobTitle?.title || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Business
              </label>
              <p className="text-gray-900 dark:text-white">{business?.name || 'N/A'}</p>
            </div>
          </div>

          {/* Contract Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <p className="text-gray-900 dark:text-white">{formatDate(contract.startDate)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <p className="text-gray-900 dark:text-white">
                {contract.endDate ? formatDate(contract.endDate) : 'Ongoing'}
              </p>
            </div>
          </div>

          {/* Compensation */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              Compensation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Base Salary
                </label>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(contract.baseSalary)}
                </p>
              </div>
              {contract.livingAllowance && contract.livingAllowance > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Living Allowance
                  </label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(contract.livingAllowance)}
                  </p>
                </div>
              )}
              {contract.commissionAmount && contract.commissionAmount > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Commission
                  </label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(contract.commissionAmount)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Already Approved Notice */}
          {contract.managerSignedAt && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex">
                <span className="text-green-600 dark:text-green-400 mr-3 text-xl">✓</span>
                <div>
                  <h4 className="font-medium text-green-800 dark:text-green-300 mb-1">
                    Contract Already Approved
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    This contract has already been approved by a manager on {formatDateTime(contract.managerSignedAt)}.
                    No further action is required.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Approval Notice */}
          {!contract.managerSignedAt && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex">
                <span className="text-yellow-600 dark:text-yellow-400 mr-3 text-xl">⚠️</span>
                <div>
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                    Important Notice
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    By {contract.employeeSignedAt ? 'approving' : 'signing'} this contract, you confirm that:
                  </p>
                  <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-400 mt-2 space-y-1">
                    <li>You have reviewed all contract terms and compensation details</li>
                    {!contract.employeeSignedAt && (
                      <li>Both employee and manager signatures will be recorded (employee signature will be backdated to contract creation)</li>
                    )}
                    <li>The employee will be activated in the system immediately</li>
                    <li>The contract status will be set to "Active"</li>
                    <li>Your manager signature will be recorded with a timestamp</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isApproving}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            {contract.managerSignedAt ? 'Close' : 'Cancel'}
          </button>
          {!contract.managerSignedAt && (
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isApproving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {contract.employeeSignedAt ? 'Approving...' : 'Signing...'}
                </>
              ) : (
                <>
                  ✓ {contract.employeeSignedAt ? 'Approve Contract' : 'Sign & Approve Contract'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
