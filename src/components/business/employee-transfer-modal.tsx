'use client'

import { useState, useEffect } from 'react'
import { X, AlertTriangle, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { BusinessSelector } from './business-selector'
import { EmployeeTransferPreview } from './employee-transfer-preview'

interface Employee {
  id: string
  fullName: string
  employeeNumber: string
  jobTitle: {
    title: string
  }
  activeContract: {
    contractNumber: string
    status: string
  } | null
  isActive: boolean
}

interface Business {
  id: string
  name: string
  type: string
  employeeCount?: number
}

interface TransferValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  validEmployeeIds: string[]
}

interface EmployeeTransferModalProps {
  isOpen: boolean
  onClose: () => void
  businessId: string
  businessName: string
  businessType: string
  onTransferComplete?: () => void
}

type TransferStep = 'loading' | 'select' | 'preview' | 'confirming' | 'success' | 'error'

export function EmployeeTransferModal({
  isOpen,
  onClose,
  businessId,
  businessName,
  businessType,
  onTransferComplete
}: EmployeeTransferModalProps) {
  const [step, setStep] = useState<TransferStep>('loading')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [compatibleBusinesses, setCompatibleBusinesses] = useState<Business[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const [validation, setValidation] = useState<TransferValidation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [transferResult, setTransferResult] = useState<{
    transferredCount: number
    contractRenewalsCreated: number
    businessAssignmentsUpdated: number
  } | null>(null)

  // Fetch transferable employees and compatible businesses
  useEffect(() => {
    if (isOpen) {
      fetchTransferData()
    }
  }, [isOpen, businessId])

  const fetchTransferData = async () => {
    setStep('loading')
    setError(null)

    try {
      // Fetch transferable employees
      const employeesRes = await fetch(`/api/admin/businesses/${businessId}/transferable-employees`)
      if (!employeesRes.ok) {
        throw new Error('Failed to fetch transferable employees')
      }
      const employeesData = await employeesRes.json()

      // Fetch compatible target businesses
      const businessesRes = await fetch(`/api/admin/businesses/${businessId}/compatible-targets`)
      if (!businessesRes.ok) {
        throw new Error('Failed to fetch compatible businesses')
      }
      const businessesData = await businessesRes.json()

      setEmployees(employeesData.employees || [])
      setCompatibleBusinesses(businessesData.businesses || [])

      // Check if there are any employees to transfer
      if (employeesData.count === 0) {
        setError('No active employees to transfer')
        setStep('error')
        return
      }

      // Check if there are compatible businesses
      if (businessesData.count === 0) {
        setError(`No compatible businesses of type "${businessType}" available for transfer`)
        setStep('error')
        return
      }

      setStep('select')
    } catch (err) {
      console.error('Error fetching transfer data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load transfer data')
      setStep('error')
    }
  }

  const handleBusinessSelect = async (targetBusinessId: string) => {
    setSelectedBusinessId(targetBusinessId)
    setError(null)

    // Validate the transfer
    try {
      const employeeIds = employees.map(emp => emp.id)
      const res = await fetch(`/api/admin/businesses/${businessId}/transfer-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetBusinessId,
          employeeIds
        })
      })

      if (!res.ok) {
        throw new Error('Failed to validate transfer')
      }

      const data = await res.json()
      setValidation(data.validation)

      if (!data.validation.isValid) {
        setError(data.validation.errors.join(', '))
        return
      }

      setStep('preview')
    } catch (err) {
      console.error('Error validating transfer:', err)
      setError(err instanceof Error ? err.message : 'Failed to validate transfer')
    }
  }

  const handleConfirmTransfer = async () => {
    if (!selectedBusinessId || !validation) return

    setStep('confirming')
    setError(null)

    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/transfer-employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetBusinessId: selectedBusinessId,
          employeeIds: validation.validEmployeeIds
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to transfer employees')
      }

      const data = await res.json()
      setTransferResult({
        transferredCount: data.data.transferredCount,
        contractRenewalsCreated: data.data.contractRenewalsCreated,
        businessAssignmentsUpdated: data.data.businessAssignmentsUpdated
      })

      setStep('success')
      
      // Call completion callback after a short delay
      setTimeout(() => {
        onTransferComplete?.()
      }, 2000)
    } catch (err) {
      console.error('Error transferring employees:', err)
      setError(err instanceof Error ? err.message : 'Failed to transfer employees')
      setStep('error')
    }
  }

  const handleCancel = () => {
    if (step === 'preview') {
      setStep('select')
      setSelectedBusinessId(null)
      setValidation(null)
    } else {
      onClose()
    }
  }

  const handleClose = () => {
    // Reset state
    setStep('loading')
    setEmployees([])
    setCompatibleBusinesses([])
    setSelectedBusinessId(null)
    setValidation(null)
    setError(null)
    setTransferResult(null)
    onClose()
  }

  if (!isOpen) return null

  const selectedBusiness = compatibleBusinesses.find(b => b.id === selectedBusinessId)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Transfer Employees
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              From: <span className="font-medium">{businessName}</span>
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={step === 'confirming'}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Loading State */}
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading transfer data...</p>
            </div>
          )}

          {/* Select Business Step */}
          {step === 'select' && (
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                      {employees.length} Active Employee{employees.length !== 1 ? 's' : ''} Found
                    </h4>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      These employees must be transferred to another business before deletion can proceed.
                      Select a target business of the same type to continue.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Select Target Business
                </h3>
                <BusinessSelector
                  businesses={compatibleBusinesses}
                  selectedBusinessId={selectedBusinessId}
                  onSelect={handleBusinessSelect}
                  loading={false}
                />
              </div>
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && selectedBusiness && validation && (
            <div>
              <EmployeeTransferPreview
                sourceBusiness={{
                  id: businessId,
                  name: businessName,
                  type: businessType
                }}
                targetBusiness={selectedBusiness}
                employees={employees.filter(emp => validation.validEmployeeIds.includes(emp.id))}
                contractRenewalsCount={validation.validEmployeeIds.length}
                businessAssignmentsCount={validation.validEmployeeIds.length * 2} // old + new
              />
            </div>
          )}

          {/* Confirming State */}
          {step === 'confirming' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Transferring employees...</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">This may take a moment</p>
            </div>
          )}

          {/* Success State */}
          {step === 'success' && transferResult && selectedBusiness && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Transfer Complete!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                Successfully transferred employees to <strong>{selectedBusiness.name}</strong>
              </p>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 w-full max-w-md">
                <ul className="space-y-2 text-sm text-green-800 dark:text-green-200">
                  <li>✓ {transferResult.transferredCount} employee{transferResult.transferredCount !== 1 ? 's' : ''} transferred</li>
                  <li>✓ {transferResult.contractRenewalsCreated} contract renewal{transferResult.contractRenewalsCreated !== 1 ? 's' : ''} created</li>
                  <li>✓ {transferResult.businessAssignmentsUpdated} assignment{transferResult.businessAssignmentsUpdated !== 1 ? 's' : ''} updated</li>
                </ul>
              </div>
            </div>
          )}

          {/* Error State */}
          {step === 'error' && error && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Transfer Failed
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                {error}
              </p>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          )}

          {/* Inline Error Display */}
          {error && step !== 'error' && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {(step === 'select' || step === 'preview') && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              {step === 'preview' ? 'Back' : 'Cancel'}
            </button>
            {step === 'preview' && (
              <button
                onClick={handleConfirmTransfer}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 font-medium"
              >
                Confirm Transfer
              </button>
            )}
          </div>
        )}

        {step === 'success' && (
          <div className="flex items-center justify-end p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 font-medium"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
