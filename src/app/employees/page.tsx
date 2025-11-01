'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { hasPermission } from '@/lib/permission-utils'
import { SalaryIncreaseModal } from '@/components/employees/salary-increase-modal'
import { PayrollExportModal } from '@/components/payroll/payroll-export-modal'
import { AddEmployeeModal } from '@/components/employees/add-employee-modal'

interface Employee {
  id: string
  employeeNumber?: string
  fullName?: string
  firstName?: string
  lastName?: string
  email?: string | null
  phone?: string
  nationalId?: string
  driverLicense?: string | null
  hireDate?: string
  employmentStatus?: string
  isActive?: boolean
  // Backend is being canonicalized; allow legacy or canonical user shapes
  user?: any | null
  // jobTitle/compensationType may come in different shapes during migration
  jobTitle?: any
  compensationType?: any
  supervisor?: any | null
  subordinates?: Employee[]
  primaryBusiness?: any
  businessAssignments?: any[]
  // contracts may be returned as `contracts` (legacy) or `employeeContracts` (canonical)
  contracts?: any[]
  employeeContracts?: any[]
  leaveBalance?: any
  currentContract?: any | null
  contractCount?: number
}

interface EmployeesResponse {
  employees: Employee[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const EMPLOYMENT_STATUS_COLORS = {
  active: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200',
  pendingContract: 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200 font-semibold border border-purple-300',
  onLeave: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200',
  terminated: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200',
  suspended: 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200'
}

const CONTRACT_STATUS_COLORS = {
  active: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200',
  pendingApproval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200',
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  expired: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200',
  terminated: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
}

export default function EmployeesPage() {
  const { data: session } = useSession()
  const currentUser = session?.user as any
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [businessFilter, setBusinessFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [departments, setDepartments] = useState<string[]>([])
  const [businesses, setBusinesses] = useState<Array<{ id: string; name: string; type: string }>>([])
  const [salaryIncreaseModal, setSalaryIncreaseModal] = useState<{
    isOpen: boolean
    employee: { id: string; fullName: string; currentSalary?: number } | null
  }>({ isOpen: false, employee: null })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [payrollExportModal, setPayrollExportModal] = useState(false)
  const [addEmployeeModal, setAddEmployeeModal] = useState(false)

  const canViewEmployees = currentUser && hasPermission(currentUser, 'canViewEmployees')
  const canCreateEmployees = currentUser && hasPermission(currentUser, 'canCreateEmployees')
  const canEditEmployees = currentUser && hasPermission(currentUser, 'canEditEmployees')
  const canApproveSalaryIncreases = currentUser && hasPermission(currentUser, 'canApproveSalaryIncreases')
  const canExportPayroll = currentUser && hasPermission(currentUser, 'canExportEmployeeData') &&
    hasPermission(currentUser, 'canViewEmployeeReports')

  useEffect(() => {
    if (canViewEmployees) {
      fetchEmployees()
      fetchDepartments()
      fetchBusinesses()
    }
  }, [canViewEmployees, currentPage, statusFilter, departmentFilter, businessFilter, searchTerm])
  
  // Read businessType from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const businessType = urlParams.get('businessType')
    if (businessType) {
      // Set the filter to match the businessType - will be used in next fetch
      setBusinessFilter(businessType)
    }
  }, [])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('page', currentPage.toString())
      params.append('limit', '10')

      // Add sorting for inactive first (false sorts before true), then by createdAt desc (newest first)
      params.append('sortBy', 'isActive,createdAt')
      params.append('sortOrder', 'asc,desc')

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim())
      }

      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      if (departmentFilter) {
        params.append('department', departmentFilter)
      }

      if (businessFilter) {
        // Check if it's a UUID (businessId) or a type string (businessType)
        if (businessFilter.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          params.append('businessId', businessFilter)
        } else {
          params.append('businessType', businessFilter)
        }
      }

      const response = await fetch(`/api/employees?${params}`)
      if (response.ok) {
        const data: EmployeesResponse = await response.json()

        // Sort employees to prioritize those with unsigned contracts
        const sortedEmployees = data.employees.sort((a, b) => {
          const aContracts = a.contracts || a.employeeContracts || []
          const bContracts = b.contracts || b.employeeContracts || []
          const aContract = aContracts.find(c => c.status === 'active') || aContracts[0]
          const bContract = bContracts.find(c => c.status === 'active') || bContracts[0]

          // Priority 1: Completely unsigned (neither employee nor manager signed)
          const aFullyUnsigned = aContract && !aContract.employeeSignedAt && !aContract.managerSignedAt
          const bFullyUnsigned = bContract && !bContract.employeeSignedAt && !bContract.managerSignedAt
          if (aFullyUnsigned && !bFullyUnsigned) return -1
          if (!aFullyUnsigned && bFullyUnsigned) return 1

          // Priority 2: Awaiting manager approval (employee signed, manager hasn't)
          const aNeedsApproval = aContract && aContract.employeeSignedAt && !aContract.managerSignedAt
          const bNeedsApproval = bContract && bContract.employeeSignedAt && !bContract.managerSignedAt
          if (aNeedsApproval && !bNeedsApproval) return -1
          if (!aNeedsApproval && bNeedsApproval) return 1

          // Priority 3: Fully signed comes last
          return 0
        })

        setEmployees(sortedEmployees)
        setPagination(data.pagination)
      } else {
        console.error('Failed to fetch employees')
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/job-titles')
      if (response.ok) {
        const jobTitles = await response.json()
        const uniqueDepartments = [...new Set(
          jobTitles
            .map((jt: any) => jt.department)
            .filter((dept: string) => dept)
        )]
        setDepartments(uniqueDepartments)
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const fetchBusinesses = async () => {
    try {
      const response = await fetch('/api/businesses')
      if (response.ok) {
        const data = await response.json()
        // API returns { businesses: [...], isAdmin: boolean }
        setBusinesses(data.businesses || [])
      }
    } catch (error) {
      console.error('Error fetching businesses:', error)
      setBusinesses([]) // Ensure businesses is always an array
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset to first page when searching
  }

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status)
    setCurrentPage(1) // Reset to first page when filtering
  }

  const handleDepartmentFilter = (department: string) => {
    setDepartmentFilter(department)
    setCurrentPage(1) // Reset to first page when filtering
  }

  const handleSalaryIncrease = (employee: any) => {
    // The API now returns employeeContracts with active contracts only
    const activeContract = employee.employeeContracts?.[0] // First element is the active contract
    const currentSalary = activeContract?.baseSalary ? Number(activeContract.baseSalary) : undefined

    // Extract frequency from contract notes (priority) or fallback to compensation type
    let frequency = employee.compensationType?.frequency || 'monthly'
    if (activeContract?.notes) {
      const frequencyMatch = activeContract.notes.match(/\[SALARY_FREQUENCY:(monthly|annual)\]/)
      if (frequencyMatch) {
        frequency = frequencyMatch[1]
      }
    }

    console.log('🔍 Salary increase debug:', {
      employeeId: employee.id,
      employeeName: employee.fullName,
      hasEmployeeContracts: !!employee.employeeContracts,
      contractsLength: employee.employeeContracts?.length || 0,
      compensationType: employee.compensationType,
      contractFrequency: frequency,
      activeContract: activeContract ? {
        id: activeContract.id,
        status: activeContract.status,
        baseSalary: activeContract.baseSalary,
        notes: activeContract.notes
      } : null,
      currentSalary
    })

    setSalaryIncreaseModal({
      isOpen: true,
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        currentSalary,
        compensationType: {
          ...employee.compensationType,
          frequency // Use the extracted frequency
        }
      }
    })
  }

  const handleSalaryIncreaseSuccess = (message: string) => {
    setMessage({ type: 'success', text: message })
    fetchEmployees() // Refresh employee list
    setTimeout(() => setMessage(null), 5000) // Clear message after 5 seconds
  }

  const handleSalaryIncreaseError = (error: string) => {
    setMessage({ type: 'error', text: error })
    setTimeout(() => setMessage(null), 5000) // Clear message after 5 seconds
  }

  if (!session) {
    return (
      <ContentLayout title="👤 Employees">
        <div className="text-center py-8">
          <p className="text-secondary">Please sign in to view employees.</p>
        </div>
      </ContentLayout>
    )
  }

  if (!canViewEmployees) {
    return (
      <ContentLayout title="👤 Employees">
        <div className="text-center py-8">
          <p className="text-secondary">You don't have permission to view employees.</p>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="👤 Employee Management"
      subtitle="Manage employee profiles, contracts, and assignments"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Employees', isActive: true }
      ]}
      headerActions={
        <div className="flex space-x-3">
          {canCreateEmployees && (
            <button
              className="btn-primary"
              onClick={() => setAddEmployeeModal(true)}
            >
              <span className="mr-2">+</span>
              Add Employee
            </button>
          )}
          {canExportPayroll && (
            <button
              className="btn-secondary"
              onClick={() => setPayrollExportModal(true)}
            >
              <span className="mr-2">📊</span>
              Export Payroll
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Search and Filters */}
        <div className="card p-4 sm:p-6">
          <div className="space-y-4">
            {/* Search - Full width on mobile */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Search Employees
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Search by name, ID, email, or job title..."
                className="input-field w-full"
              />
            </div>

            {/* Filters in responsive grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Employment Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="all">All Employees</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_leave">On Leave</option>
                  <option value="terminated">Terminated</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Business
                </label>
                <select
                  value={businessFilter}
                  onChange={(e) => setBusinessFilter(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="">All Businesses</option>
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name} ({business.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={fetchEmployees}
                  className="btn-secondary w-full"
                  disabled={loading}
                >
                  {loading ? '🔄 Loading...' : '🔄 Refresh'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 sm:p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-blue-600 dark:text-blue-300 text-sm font-semibold">👥</span>
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-primary">{employees.length}</p>
                <p className="text-xs sm:text-sm text-secondary">Total Employees</p>
              </div>
            </div>
          </div>

          <div className="card p-4 sm:p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-green-600 dark:text-green-300 text-sm font-semibold">✅</span>
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-primary">
                  {employees.filter(e => e.isActive && e.employmentStatus === 'active').length}
                </p>
                <p className="text-xs sm:text-sm text-secondary">Active</p>
              </div>
            </div>
          </div>

          <div className="card p-4 sm:p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-800 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-yellow-600 dark:text-yellow-300 text-sm font-semibold">📋</span>
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-primary">
                  {employees.filter(e => e.currentContract && e.currentContract.status === 'pending_approval').length}
                </p>
                <p className="text-xs sm:text-sm text-secondary">Pending Contracts</p>
              </div>
            </div>
          </div>

          <div className="card p-4 sm:p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-800 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-purple-600 dark:text-purple-300 text-sm font-semibold">👤</span>
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-primary">
                  {employees.filter(e => e.user).length}
                </p>
                <p className="text-xs sm:text-sm text-secondary">System Users</p>
              </div>
            </div>
          </div>
        </div>

        {/* Employee List */}
        <div className="card">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-secondary">Loading employees...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-secondary">No employees found matching your criteria.</p>
            </div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="block lg:hidden space-y-4 p-4">
                {employees.map((employee) => {
                  const contracts = employee.contracts || employee.employeeContracts || []
                  const activeContract = contracts.find(c => c.status === 'active')
                  const pendingContract = contracts.find(c => c.status === 'pending_approval') || contracts.find(c => c.status === 'draft')
                  const currentContract = activeContract || pendingContract || contracts[0]

                  return (
                    <div key={employee.id} className="card p-4 space-y-3">
                      {/* Header with avatar and name */}
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 dark:text-blue-300 font-semibold text-sm">
                            {employee.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-primary truncate">{employee.fullName}</h3>
                            {employee.user && (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200 rounded border border-green-300 flex-shrink-0">
                                👤
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-secondary">{employee.employeeNumber}</p>
                          {employee.email && (
                            <p className="text-xs text-secondary truncate">{employee.email}</p>
                          )}
                        </div>
                      </div>

                      {/* Job Title & Status */}
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <p className="text-xs font-medium text-secondary">Job Title & Department</p>
                          <p className="text-sm text-primary">{employee.jobTitle.title}</p>
                          {employee.jobTitle.department && (
                            <p className="text-xs text-secondary">{employee.jobTitle.department}</p>
                          )}
                        </div>

                        <div>
                          <p className="text-xs font-medium text-secondary">Primary Business</p>
                          <p className="text-sm text-primary">{employee.primaryBusiness.name}</p>
                          <p className="text-xs text-secondary capitalize">{employee.primaryBusiness.type}</p>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${employee.employmentStatus === 'pendingContract'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200 font-semibold border border-purple-300'
                            : EMPLOYMENT_STATUS_COLORS[employee.employmentStatus as keyof typeof EMPLOYMENT_STATUS_COLORS] ||
                            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          }`}>
                          {currentContract?.employeeSignedAt ?
                            `CONTRACT SIGNED` :
                            currentContract?.status === 'active' && employee.isActive ? 'ACTIVE' :
                              employee.employmentStatus === 'pending_contract' ? 'PENDING CONTRACT' :
                                employee.employmentStatus.replace('_', ' ').toUpperCase()}
                        </span>

                        {/* Contract Signature Status */}
                        {currentContract && (
                          <>
                            {!currentContract.employeeSignedAt && !currentContract.managerSignedAt && (
                              <button
                                onClick={() => window.location.href = `/employees/${employee.id}?highlightContract=${currentContract.id}&tab=contracts`}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200 rounded border-2 border-red-400 animate-pulse hover:bg-red-200 dark:hover:bg-red-700 cursor-pointer"
                                title="Click to view and sign this contract"
                              >
                                ⚠️ UNSIGNED
                              </button>
                            )}
                            {currentContract.employeeSignedAt && !currentContract.managerSignedAt && (
                              <button
                                onClick={() => window.location.href = `/employees/${employee.id}?highlightContract=${currentContract.id}&tab=contracts`}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200 rounded border-2 border-orange-400 hover:bg-orange-200 dark:hover:bg-orange-700 cursor-pointer"
                                title="Click to approve this contract"
                              >
                                ⏳ NEEDS APPROVAL
                              </button>
                            )}
                            {currentContract.employeeSignedAt && currentContract.managerSignedAt && (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 rounded">
                                ✓✓ FULLY SIGNED
                              </span>
                            )}
                          </>
                        )}

                        {(employee.contractCount > 0 || contracts.length > 0) && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200 rounded">
                            {employee.contractCount || contracts.length || 0} Contract{(employee.contractCount || contracts.length || 0) !== 1 ? 's' : ''}
                          </span>
                        )}

                        {employee.jobTitle.level && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 rounded">
                            {employee.jobTitle.level}
                          </span>
                        )}
                      </div>

                      {/* Supervisor Info */}
                      {employee.supervisor && (
                        <div>
                          <p className="text-xs font-medium text-secondary">Supervisor</p>
                          <p className="text-sm text-primary">{employee.supervisor.fullName}</p>
                          <p className="text-xs text-secondary">{employee.supervisor.jobTitle}</p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <button
                          className="flex-1 text-xs px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded font-medium"
                          onClick={() => window.location.href = `/employees/${employee.id}`}
                        >
                          👁️ View Details
                        </button>
                        {canEditEmployees && (
                          <button
                            className="flex-1 text-xs px-3 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 rounded font-medium"
                            onClick={() => window.location.href = `/employees/${employee.id}/edit`}
                          >
                            ✏️ Edit
                          </button>
                        )}
                        {canApproveSalaryIncreases && (
                          <button
                            className="text-xs px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded font-medium"
                            onClick={() => handleSalaryIncrease(employee)}
                          >
                            💰 Salary
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                        Job Title & Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                        Business & Assignments
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                        Status & Contract
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                        Supervisor & Team
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {employees.map((employee) => {
                      const contracts = employee.contracts || employee.employeeContracts || []
                      const activeContract = contracts.find(c => c.status === 'active')
                      const pendingContract = contracts.find(c => c.status === 'pendingApproval') || contracts.find(c => c.status === 'draft')
                      const currentContract = activeContract || pendingContract || contracts[0]

                      return (
                        <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 dark:text-blue-300 font-semibold text-sm">
                                  {employee.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-medium text-primary">{employee.fullName}</div>
                                  {employee.user && (
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200 rounded border border-green-300">
                                      👤
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-secondary">{employee.employeeNumber}</div>
                                {employee.email && (
                                  <div className="text-xs text-secondary">{employee.email}</div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-primary">{employee.jobTitle.title}</div>
                            {employee.jobTitle.department && (
                              <div className="text-xs text-secondary">{employee.jobTitle.department}</div>
                            )}
                            {employee.jobTitle.level && (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 rounded">
                                {employee.jobTitle.level}
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <div className="text-sm text-primary">{employee.primaryBusiness.name}</div>
                            <div className="text-xs text-secondary capitalize">{employee.primaryBusiness.type}</div>
                            {employee.businessAssignments && employee.businessAssignments.length > 0 && (
                              <div className="mt-1">
                                {employee.businessAssignments.slice(0, 2).map((assignment, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 rounded mr-1 mb-1"
                                  >
                                    {assignment.businesses?.name || assignment.businessName || 'Unknown Business'}
                                  </span>
                                ))}
                                {employee.businessAssignments.length > 2 && (
                                  <span className="text-xs text-secondary">+{employee.businessAssignments.length - 2} more</span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col space-y-1">
                              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${employee.employmentStatus === 'pendingContract'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200 font-semibold border border-purple-300'
                                  : EMPLOYMENT_STATUS_COLORS[employee.employmentStatus as keyof typeof EMPLOYMENT_STATUS_COLORS] ||
                                  'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                                }`}>
                                {currentContract?.employeeSignedAt ?
                                  `CONTRACT SIGNED` :
                                  currentContract?.status === 'active' && employee.isActive ? 'ACTIVE' :
                                    employee.employmentStatus === 'pending_contract' ? 'PENDING CONTRACT' :
                                      employee.employmentStatus.replace('_', ' ').toUpperCase()}
                              </span>
                              {/* Contract Signature Status */}
                              {currentContract && (
                                <>
                                  {!currentContract.employeeSignedAt && !currentContract.managerSignedAt && (
                                    <button
                                      onClick={() => window.location.href = `/employees/${employee.id}?highlightContract=${currentContract.id}&tab=contracts`}
                                      className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200 rounded border-2 border-red-400 animate-pulse hover:bg-red-200 dark:hover:bg-red-700 cursor-pointer"
                                      title="Click to view and sign this contract"
                                    >
                                      ⚠️ UNSIGNED
                                    </button>
                                  )}
                                  {currentContract.employeeSignedAt && !currentContract.managerSignedAt && (
                                    <button
                                      onClick={() => window.location.href = `/employees/${employee.id}?highlightContract=${currentContract.id}&tab=contracts`}
                                      className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200 rounded border-2 border-orange-400 hover:bg-orange-200 dark:hover:bg-orange-700 cursor-pointer"
                                      title="Click to approve this contract"
                                    >
                                      ⏳ NEEDS APPROVAL
                                    </button>
                                  )}
                                  {currentContract.employeeSignedAt && currentContract.managerSignedAt && (
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 rounded">
                                      ✓✓ FULLY SIGNED
                                    </span>
                                  )}
                                </>
                              )}
                              {(employee.contractCount > 0 || contracts.length > 0) && (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200 rounded">
                                  {employee.contractCount || contracts.length || 0} Contract{(employee.contractCount || contracts.length || 0) !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            {employee.supervisor ? (
                              <div>
                                <div className="text-sm text-primary">{employee.supervisor.fullName}</div>
                                <div className="text-xs text-secondary">{employee.supervisor.jobTitle}</div>
                              </div>
                            ) : (
                              <span className="text-xs text-secondary">No supervisor</span>
                            )}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                onClick={() => window.location.href = `/employees/${employee.id}`}
                              >
                                View
                              </button>
                              {canEditEmployees && (
                                <button
                                  className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                  onClick={() => window.location.href = `/employees/${employee.id}/edit`}
                                >
                                  Edit
                                </button>
                              )}
                              {canApproveSalaryIncreases && (
                                <button
                                  className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                  onClick={() => handleSalaryIncrease(employee)}
                                  title="Salary Increase"
                                >
                                  💰
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-primary bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                    disabled={currentPage >= pagination.totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-primary bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>

                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-secondary">
                      Showing <span className="font-medium">{((currentPage - 1) * pagination.limit) + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(currentPage * pagination.limit, pagination.total)}</span> of{' '}
                      <span className="font-medium">{pagination.total}</span> employees
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-secondary hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        ← Previous
                      </button>

                      <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-primary">
                        Page {currentPage} of {pagination.totalPages}
                      </span>

                      <button
                        onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                        disabled={currentPage >= pagination.totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-secondary hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        Next →
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Success/Error Message */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${message.type === 'success'
            ? 'bg-green-100 border border-green-400 text-green-700 dark:bg-green-900 dark:border-green-600 dark:text-green-200'
            : 'bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-600 dark:text-red-200'
          }`}>
          <div className="flex items-center">
            <span className="mr-2">
              {message.type === 'success' ? '✅' : '❌'}
            </span>
            {message.text}
          </div>
        </div>
      )}

      {/* Salary Increase Modal */}
      {salaryIncreaseModal.isOpen && salaryIncreaseModal.employee && currentUser && (
        <SalaryIncreaseModal
          employee={salaryIncreaseModal.employee}
          currentUser={currentUser}
          onClose={() => setSalaryIncreaseModal({ isOpen: false, employee: null })}
          onSuccess={handleSalaryIncreaseSuccess}
          onError={handleSalaryIncreaseError}
        />
      )}

      {/* Payroll Export Modal */}
      {payrollExportModal && currentUser && (
        <PayrollExportModal
          currentUser={currentUser}
          onClose={() => setPayrollExportModal(false)}
          onSuccess={(message) => {
            setMessage({ type: 'success', text: message })
            setTimeout(() => setMessage(null), 5000)
          }}
          onError={(error) => {
            setMessage({ type: 'error', text: error })
            setTimeout(() => setMessage(null), 5000)
          }}
        />
      )}

      {/* Add Employee Modal */}
      {addEmployeeModal && (
        <AddEmployeeModal
          isOpen={addEmployeeModal}
          onClose={() => setAddEmployeeModal(false)}
          onSuccess={(message) => {
            setMessage({ type: 'success', text: message })
            setTimeout(() => setMessage(null), 5000)
            // Reset to first page and ensure all filter is selected to show new employee
            setCurrentPage(1)
            setStatusFilter('all')
            // Force refresh with new sorting
            setTimeout(() => fetchEmployees(), 100)
          }}
          onError={(error) => {
            setMessage({ type: 'error', text: error })
            setTimeout(() => setMessage(null), 5000)
          }}
        />
      )}
    </ContentLayout>
  )
}