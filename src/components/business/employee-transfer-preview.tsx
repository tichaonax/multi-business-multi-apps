'use client'

import { ArrowRight, Building2, User, FileText, RefreshCw, AlertTriangle } from 'lucide-react'

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

interface EmployeeTransferPreviewProps {
  sourceBusiness: Business
  targetBusiness: Business
  employees: Employee[]
  contractRenewalsCount: number
  businessAssignmentsCount: number
}

export function EmployeeTransferPreview({
  sourceBusiness,
  targetBusiness,
  employees,
  contractRenewalsCount,
  businessAssignmentsCount
}: EmployeeTransferPreviewProps) {
  const activeEmployees = employees.filter(emp => emp.isActive)
  const employeesWithContracts = employees.filter(emp => emp.activeContract)

  return (
    <div className="space-y-6">
      {/* Business Transfer Flow */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between gap-4">
          {/* Source Business */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">FROM</span>
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white">{sourceBusiness.name}</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">{sourceBusiness.type}</p>
          </div>

          {/* Arrow */}
          <div className="flex-shrink-0">
            <ArrowRight className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>

          {/* Target Business */}
          <div className="flex-1 text-right">
            <div className="flex items-center justify-end gap-2 mb-1">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">TO</span>
              <Building2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white">{targetBusiness.name}</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">{targetBusiness.type}</p>
          </div>
        </div>
      </div>

      {/* Impact Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-center">
          <User className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{activeEmployees.length}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Employee{activeEmployees.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-center">
          <FileText className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{contractRenewalsCount}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Contract{contractRenewalsCount !== 1 ? 's' : ''}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-center">
          <RefreshCw className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{businessAssignmentsCount}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Assignment{businessAssignmentsCount !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* What Will Happen */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          What Will Happen:
        </h4>
        <ul className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
          <li className="flex items-start gap-2">
            <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">✓</span>
            <span><strong>{activeEmployees.length} employee{activeEmployees.length !== 1 ? 's' : ''}</strong> will have their primary business updated to <strong>{targetBusiness.name}</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">✓</span>
            <span><strong>{contractRenewalsCount} contract renewal{contractRenewalsCount !== 1 ? 's' : ''}</strong> will be created (pending HR approval)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">✓</span>
            <span><strong>{businessAssignmentsCount} business assignment{businessAssignmentsCount !== 1 ? 's' : ''}</strong> will be updated</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">✓</span>
            <span>Existing contracts will be <strong>preserved</strong> (historical record)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">✓</span>
            <span>Contract terms (salary, benefits, etc.) remain <strong>unchanged</strong></span>
          </li>
        </ul>
      </div>

      {/* Employee List */}
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
          Employees Being Transferred ({activeEmployees.length}):
        </h4>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
          {activeEmployees.map((employee) => (
            <div
              key={employee.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="font-medium text-gray-900 dark:text-white truncate">
                      {employee.fullName}
                    </h5>
                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                      Active
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <p>Employee #: {employee.employeeNumber}</p>
                    <p>Position: {employee.jobTitle.title}</p>
                    {employee.activeContract && (
                      <p className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Contract: {employee.activeContract.contractNumber}
                        <span className="text-yellow-600 dark:text-yellow-400 ml-1">
                          (renewal pending)
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* HR Notice */}
      {contractRenewalsCount > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> Contract renewals will be created with status "pending" and require HR approval within 7 days.
            The renewals will only update the primary business field - all other contract terms remain unchanged.
          </p>
        </div>
      )}
    </div>
  )
}
