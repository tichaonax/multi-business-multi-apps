'use client'

import { useState, useEffect } from 'react'
import { Search, User, UserCheck, UserX, FileText, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Employee {
  id: string
  employeeNumber: string
  fullName: string
  email: string
  isActive: boolean
  jobTitle?: string
  department?: string
  businessName?: string
  businessType?: string
  latestContract?: {
    id: string
    contractNumber: string
    status: string
    startDate: string
    endDate?: string
    createdAt: string
    isRenewal: boolean
    renewalCount: number
    baseSalary?: number | null
    contract_benefits?: Array<{
      amount: number
      isPercentage: boolean
      notes?: string | null
      benefitType?: { id?: string; name: string }
    }>
  }
  hasContract: boolean
}

interface EmployeeContractSelectorProps {
  onEmployeeSelect: (employee: Employee) => void
  onContractSelect: (contractId: string) => void
  selectedEmployeeId?: string
  className?: string
  excludeEmployeeId?: string
  selectedEmployee?: Employee | null
  onClearSelection?: () => void
}

export function EmployeeContractSelector({
  onEmployeeSelect,
  onContractSelect,
  selectedEmployeeId,
  className = '',
  excludeEmployeeId,
  selectedEmployee = null,
  onClearSelection
}: EmployeeContractSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [includeInactive, setIncludeInactive] = useState(true)

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.length >= 2) {
        searchEmployees()
      } else {
        setEmployees([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, includeInactive])

  const searchEmployees = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        q: searchTerm,
        includeInactive: includeInactive.toString(),
        contractsOnly: 'true',
        limit: '20'
      })

      if (excludeEmployeeId) {
        params.append('excludeId', excludeEmployeeId)
      }

      const response = await fetch(`/api/employees/search?${params}`)
      const result = await response.json()

      // Debug: expose raw search payload for troubleshooting in browser console
      try {
        // eslint-disable-next-line no-console
        console.debug('Employee search raw result:', JSON.parse(JSON.stringify(result)))
      } catch (e) {
        // ignore
      }

      if (result.success) {
        // Filter out the current employee if provided (safety client-side filter)
        const filtered = Array.isArray(result.data)
          ? result.data.filter((e: any) => e.id !== excludeEmployeeId)
          : result.data
        setEmployees(filtered)
      } else {
        console.error('Failed to search employees:', result.error)
      }
    } catch (error) {
      console.error('Error searching employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEmployeeSelect = (employee: Employee) => {
    onEmployeeSelect(employee)
    if (employee.latestContract) {
      onContractSelect(employee.latestContract.id)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'signed':
        return 'default'
      case 'draft':
        return 'secondary'
      case 'expired':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-primary">Copy Contract From Employee</h3>
        </div>

        <div className="text-sm text-secondary">
          Search for an employee to copy their contract terms and benefits
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search by name, employee number, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800"
          />
        </div>

        {/* Include Inactive Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="includeInactive"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="includeInactive" className="text-sm text-secondary">
            Include inactive employees
          </label>
        </div>
      </div>
      {/* If an employee is already selected, show a compact summary and a Change button */}
      {selectedEmployee ? (
        <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-primary">{selectedEmployee.fullName}</div>
              <div className="text-sm text-secondary">Employee #: {selectedEmployee.employeeNumber}</div>
              {selectedEmployee.latestContract && (
                <div className="text-xs text-secondary mt-2 space-y-2">
                  <div>
                    <div>Latest Contract: {(selectedEmployee.latestContract as any).contractNumber} • {(selectedEmployee.latestContract as any).status}</div>
                    {(selectedEmployee.latestContract as any).baseSalary != null && (
                      <div className="mt-1 font-medium">Base: ${Number((selectedEmployee.latestContract as any).baseSalary).toLocaleString()}</div>
                    )}
                  </div>
                  {/* Benefits preview */}
                  {(selectedEmployee.latestContract as any).contract_benefits && (selectedEmployee.latestContract as any).contract_benefits.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-secondary">Benefits:</div>
                      <ul className="text-xs text-secondary list-disc list-inside">
                        {(selectedEmployee.latestContract as any).contract_benefits.map((b: any, idx: number) => (
                          <li key={idx}>{b.benefitType?.name || 'Benefit'} — {b.amount}{b.isPercentage ? '%' : ''}{b.notes ? ` (${b.notes})` : ''}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => {
                  if (onClearSelection) onClearSelection()
                }}
                className="btn-secondary"
              >
                Change
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
        {loading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="text-sm text-secondary mt-2">Searching employees...</p>
          </div>
        )}

        {!loading && searchTerm.length >= 2 && employees.length === 0 && (
          <div className="text-center py-8 text-secondary">
            <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No employees found with contracts</p>
            <p className="text-xs">Try adjusting your search or include inactive employees</p>
          </div>
        )}

        {!loading && searchTerm.length < 2 && (
          <div className="text-center py-8 text-secondary">
            <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Enter at least 2 characters to search</p>
          </div>
        )}

        {/* Employee Cards */}
        {employees.map((employee) => (
          <div
            key={employee.id}
            onClick={() => handleEmployeeSelect(employee)}
            className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
              selectedEmployeeId === employee.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {/* Employee Header */}
                <div className="flex items-center gap-2 mb-2">
                  {employee.isActive ? (
                    <UserCheck className="h-4 w-4 text-green-600" />
                  ) : (
                    <UserX className="h-4 w-4 text-red-600" />
                  )}
                  <span className="font-medium text-primary truncate">
                    {employee.fullName}
                  </span>
                  <Badge variant={employee.isActive ? 'default' : 'secondary'}>
                    {employee.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {/* Employee Details */}
                <div className="text-sm text-secondary space-y-1">
                  <div>Employee #: {employee.employeeNumber}</div>
                  {employee.email && <div>Email: {employee.email}</div>}
                  {employee.jobTitle && (
                    <div>
                      Position: {employee.jobTitle}
                      {employee.department && ` • ${employee.department}`}
                    </div>
                  )}
                  {employee.businessName && (
                    <div>Business: {employee.businessName}</div>
                  )}
                </div>

                {/* Contract Info */}
                {employee.latestContract && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-sm">Latest Contract</span>
                      <Badge variant={getStatusBadgeVariant(employee.latestContract.status)}>
                        {employee.latestContract.status}
                      </Badge>
                      {employee.latestContract.isRenewal && (
                        <Badge variant="outline">
                          Renewal #{employee.latestContract.renewalCount}
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-secondary space-y-2">
                      <div className="flex items-center justify-between">
                        <div>Contract: {employee.latestContract.contractNumber}</div>
                        {(employee.latestContract as any).baseSalary != null && (
                          <div className="font-medium">Base: ${Number((employee.latestContract as any).baseSalary).toLocaleString()}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span>Start: {formatDate(employee.latestContract.startDate)}</span>
                        {employee.latestContract.endDate && (
                          <span>End: {formatDate(employee.latestContract.endDate)}</span>
                        )}
                      </div>
                      <div>Created: {formatDate(employee.latestContract.createdAt)}</div>
                      {(employee.latestContract as any).baseSalary != null && (
                        <div className="mt-1 font-medium">Base: ${Number((employee.latestContract as any).baseSalary).toLocaleString()}</div>
                      )}

                      {/* Benefits preview */}
                      {(employee.latestContract as any).contract_benefits && (employee.latestContract as any).contract_benefits.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs font-medium text-secondary">Benefits:</div>
                          <ul className="text-xs text-secondary list-disc list-inside">
                            {(employee.latestContract as any).contract_benefits.map((b: any, idx: number) => (
                              <li key={idx}>{b.benefitType?.name || 'Benefit'} — {b.amount}{b.isPercentage ? '%' : ''}{b.notes ? ` (${b.notes})` : ''}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {/* Recent contracts list (if multiple) */}
                      {(employee as any).contracts && (employee as any).contracts.length > 1 && (
                        <div className="mt-3">
                          <div className="text-xs font-medium text-secondary mb-2">Other recent contracts</div>
                          <div className="space-y-2">
                            {(employee as any).contracts.map((c: any) => (
                              <div key={c.id} className="flex flex-col gap-2 text-xs bg-white dark:bg-gray-900 p-2 rounded border">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="font-medium">{c.contractNumber} • {c.status}</div>
                                    <div className="text-xs text-secondary">Base: ${Number(c.baseSalary || 0).toLocaleString()}</div>
                                  </div>
                                  <div>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); onContractSelect(c.id); onEmployeeSelect(employee) }}
                                      className="btn-secondary btn-sm"
                                    >
                                      Copy
                                    </button>
                                  </div>
                                </div>

                                {/* Per-contract benefits (each contract can have different benefits) */}
                                {c.contract_benefits && Array.isArray(c.contract_benefits) && c.contract_benefits.length > 0 && (
                                  <div className="mt-1">
                                    <div className="text-xs font-medium text-secondary">Benefits:</div>
                                    <ul className="text-xs text-secondary list-disc list-inside mt-1">
                                      {c.contract_benefits.map((b: any, idx: number) => (
                                        <li key={idx}>
                                          {b.benefitType?.name || 'Benefit'} — {b.amount}{b.isPercentage ? '%' : ''}{b.notes ? ` (${b.notes})` : ''}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Selection Indicator */}
              {selectedEmployeeId === employee.id && (
                <div className="ml-2">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  )
}