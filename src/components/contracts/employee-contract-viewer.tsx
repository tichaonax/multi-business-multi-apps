'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useAlert } from '@/components/ui/confirm-modal'
import { downloadComprehensiveContractPDF } from '@/lib/contract-pdf-generator'

interface EmployeeContract {
  id: string
  contractNumber: string
  version: number
  baseSalary: number
  livingAllowance: number | null
  commissionAmount: number | null
  contractDurationMonths: number | null
  startDate: string
  endDate: string | null
  isActive: boolean
  isRenewal?: boolean
  renewalCount?: number
  originalContractId?: string
  previousContractId?: string
  pdfGenerationData?: any
  jobTitle: { title: string } | null
  compensationType: { name: string; type: string } | null
  businesses: { name: string; type: string } | null
  supervisor: { fullName: string } | null
}

export function EmployeeContractViewer() {
  const { data: session } = useSession()
  const customAlert = useAlert()
  const [contracts, setContracts] = useState<EmployeeContract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadingContract, setDownloadingContract] = useState<string | null>(null)
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    loadEmployeeContracts()
  }, [session])

  const loadEmployeeContracts = async () => {
  if (!session?.user?.id) {
      setLoading(false)
      return
    }

    try {
      // Look up the employee record linked to this user account
      const employeeResponse = await fetch('/api/employees/me', { credentials: 'include' })

      if (!employeeResponse.ok) {
        setError('Unable to access employee data')
        setLoading(false)
        return
      }

      const { employee: currentUserEmployee } = await employeeResponse.json()

      if (!currentUserEmployee) {
        setError('No employee record found for your user account')
        setLoading(false)
        return
      }

      setEmployeeId(currentUserEmployee.id)

      // Now fetch contracts for this employee
      const response = await fetch(`/api/employees/${currentUserEmployee.id}/contracts`)
      if (response.ok) {
        const data = await response.json()
        setContracts(data || [])
      } else {
        setError('Failed to load contracts')
      }
    } catch (error) {
      setError('Error loading contracts')
    } finally {
      setLoading(false)
    }
  }

  const downloadContract = async (contract: EmployeeContract) => {
    if (!contract.pdfGenerationData) {
      await customAlert({ title: 'Unable to download', description: 'No PDF data available for this contract. Please ask HR to regenerate it.' })
      return
    }

    setDownloadingContract(contract.id)
    try {
      downloadComprehensiveContractPDF(contract.pdfGenerationData, `${contract.contractNumber}_Employment_Contract`)
    } catch (err) {
      setError('Failed to generate contract PDF')
    } finally {
      setDownloadingContract(null)
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const headerContent = (
    <button
      onClick={() => setOpen(o => !o)}
      className="w-full flex items-center justify-between p-6 text-left"
    >
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Employment Contracts</h3>
        {!loading && !error && contracts.length > 0 && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
            {contracts.length}
          </span>
        )}
      </div>
      <span className="text-gray-400 dark:text-gray-500 text-sm">{open ? '▲' : '▼'}</span>
    </button>
  )

  if (error) {
    return (
      <div className="card">
        {headerContent}
        {open && <div className="px-6 pb-6"><p className="text-gray-500 dark:text-gray-400">{error}</p></div>}
      </div>
    )
  }

  if (!loading && !employeeId) {
    return (
      <div className="card">
        {headerContent}
        {open && (
          <div className="px-6 pb-6">
            <p className="text-gray-500 dark:text-gray-400">No employee profile found. Contact your administrator to set up your employee record.</p>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="card">
        {headerContent}
        {open && (
          <div className="px-6 pb-6 text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading contracts...</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="card">
      {headerContent}
      {open && <div className="px-6 pb-6">
        <div className="flex justify-end mb-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {contracts.length} contract{contracts.length !== 1 ? 's' : ''}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex">
              <span className="text-red-400 mr-2">⚠️</span>
              <span className="text-red-700 dark:text-red-400 text-sm">{error}</span>
            </div>
          </div>
        )}

        {contracts.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            No employment contracts found. Contact HR if you believe this is an error.
          </p>
        ) : (
          <div className="space-y-4">
            {contracts.map((contract) => (
              <div
                key={contract.id}
                className={`border rounded-lg p-4 ${
                  contract.isActive 
                    ? 'bg-white dark:bg-gray-700 border-green-200 dark:border-green-600' 
                    : 'bg-gray-50 dark:bg-gray-600 border-gray-200 dark:border-gray-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {contract.contractNumber}
                      </h4>
                      <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        Version {contract.version}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded ${
                        contract.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {contract.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {contract.isRenewal && (
                        <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 font-medium">
                          🔄 RENEWED {contract.renewalCount && contract.renewalCount > 0 ? `(#${contract.renewalCount})` : ''}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Position</p>
                        <p className="font-medium text-gray-900 dark:text-white">{contract.jobTitle?.title ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Business</p>
                        <p className="font-medium text-gray-900 dark:text-white">{contract.businesses?.name ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Start Date</p>
                        <p className="font-medium text-gray-900 dark:text-white">{formatDate(contract.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">End Date</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {contract.endDate ? formatDate(contract.endDate) : 'Ongoing'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Base Salary</p>
                          <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(contract.baseSalary)}</p>
                        </div>
                        {contract.livingAllowance && (
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Living Allowance</p>
                            <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(contract.livingAllowance)}</p>
                          </div>
                        )}
                        {contract.commissionAmount && (
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Commission</p>
                            <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(contract.commissionAmount)}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {contract.supervisor && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 text-sm">
                        <p className="text-gray-600 dark:text-gray-400">Supervisor</p>
                        <p className="font-medium text-gray-900 dark:text-white">{contract.supervisor.fullName}</p>
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    <button
                      onClick={() => downloadContract(contract)}
                      disabled={downloadingContract === contract.id}
                      className="btn-secondary text-sm disabled:opacity-50"
                    >
                      {downloadingContract === contract.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 inline-block mr-2"></div>
                          Downloading...
                        </>
                      ) : (
                        <>
                          {contract.isRenewal ? '🔄' : '📄'} Download PDF
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>}
    </div>
  )
}