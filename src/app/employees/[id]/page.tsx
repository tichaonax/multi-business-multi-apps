 'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect, useMemo, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'
import { generateComprehensiveContract } from '@/lib/contract-pdf-generator'
import { formatDateByFormat, formatPhoneNumberForDisplay } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'
import { CreateUserModal } from '@/components/employees/create-user-modal'
import { ManageUserAccountModal } from '@/components/employees/manage-user-account-modal'
import { ContractRenewalModal } from '@/components/contracts/contract-renewal-modal'
import { ContractApprovalModal } from '@/components/contracts/contract-approval-modal'
import { useConfirm } from '@/components/ui/confirm-modal'
import { useToastContext } from '@/components/ui/toast'
import type { Employee } from '@/types/employee'
import { PayeeExpenseSummary } from '@/components/expense-account/payee-expense-summary'
import { PayeePaymentsTable } from '@/components/expense-account/payee-payments-table'
import { PayeeExpenseReport } from '@/components/expense-account/payee-expense-report'

const EMPLOYMENT_STATUS_COLORS = {
  active: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200',
  pendingContract: 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200 font-semibold border border-purple-300',
  onLeave: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200',
  terminated: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200',
  suspended: 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200'
}

const CONTRACT_STATUS_COLORS = {
  active: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200',
  pending_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200',
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  expired: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200',
  terminated: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200',
  suspended: 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200'
}

export default function EmployeeDetailPage() {
  const { data: session } = useSession()
  const currentUser = session?.user as any
  const params = useParams()
  const router = useRouter()
  const confirm = useConfirm()
  const toast = useToastContext()
  const employeeId = params.id as string
  const { format: globalDateFormat } = useDateFormat()
  
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [deletingContract, setDeletingContract] = useState<string | null>(null)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [showManageUserModal, setShowManageUserModal] = useState(false)
  const [showRenewalModal, setShowRenewalModal] = useState(false)
  const [selectedContractForRenewal, setSelectedContractForRenewal] = useState<any>(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [selectedContractForApproval, setSelectedContractForApproval] = useState<any>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [highlightContractId, setHighlightContractId] = useState<string | null>(null)
  const [showStatusChangeModal, setShowStatusChangeModal] = useState(false)

  // Track if we've already auto-opened the approval modal for a specific contract to prevent re-opening after approval
  const autoOpenedContractIdRef = useRef<string | null>(null)
  const [selectedContractForStatusChange, setSelectedContractForStatusChange] = useState<any>(null)
  const [statusChangeData, setStatusChangeData] = useState({
    status: '',
    endDate: '',
    terminationReason: '',
    notes: ''
  })

  const canViewEmployees = currentUser && hasPermission(currentUser, 'canViewEmployees')
  const canEditEmployees = currentUser && hasPermission(currentUser, 'canEditEmployees')
  const canViewEmployeeContracts = currentUser && hasPermission(currentUser, 'canViewEmployeeContracts')
  const canCreateEmployeeContracts = currentUser && hasPermission(currentUser, 'canCreateEmployeeContracts')
  const canApproveEmployeeContracts = currentUser && hasPermission(currentUser, 'canApproveEmployeeContracts')
  const canDeleteContracts = currentUser && isSystemAdmin(currentUser)
  const canManageUserAccounts = currentUser && hasPermission(currentUser, 'canManageBusinessUsers')
  const canEditEmployeeContracts = currentUser && hasPermission(currentUser, 'canEditEmployeeContracts')

  useEffect(() => {
    if (canViewEmployees && employeeId) {
      fetchEmployee()
    }
    // Check for highlightContract query param on initial load
    try {
      const params = new URLSearchParams(window.location.search)
      const hc = params.get('highlightContract')
      if (hc) setHighlightContractId(hc)
    } catch (err) {
      // ignore
    }
  }, [canViewEmployees, employeeId])

  useEffect(() => {
    if (!highlightContractId) return
    // Give the DOM a moment to render contracts
    setTimeout(() => {
      try {
        const el: HTMLElement | null = document.querySelector(`[data-contract-id=\"${highlightContractId}\"]`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('ring-4', 'ring-yellow-300')
          setTimeout(() => { el.classList.remove('ring-4', 'ring-yellow-300') }, 4000)
        }
      } catch (err) {
        // ignore
      }
    }, 300)
  }, [highlightContractId, employee])

  // Auto-open approval modal if navigated from employee list with unsigned contract
  useEffect(() => {
    if (!highlightContractId || !employee) return

    // Prevent auto-opening the same contract modal multiple times
    if (autoOpenedContractIdRef.current === highlightContractId) {
      return
    }

    // Find the contract in employee data
    const contracts = employee.employeeContracts || employee.contracts || []
    const targetContract = contracts.find((c: any) => c.id === highlightContractId)

    if (targetContract && !targetContract.managerSignedAt) {
      // Contract needs approval - auto-open modal after a brief delay
      autoOpenedContractIdRef.current = highlightContractId
      setTimeout(() => {
        setSelectedContractForApproval(targetContract)
        setShowApprovalModal(true)
      }, 600) // Small delay to allow page to settle
    }
  }, [highlightContractId, employee])

  const fetchEmployee = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/employees/${employeeId}`)
      if (response.ok) {
        const data = await response.json()
        setEmployee(data)
      } else {
        console.error('Failed to fetch employee')
      }
    } catch (error) {
      console.error('Error fetching employee:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    return formatDateByFormat(dateString, globalDateFormat)
  }


  const generateContractPDF = async (contract: any) => {
    try {
      // Fetch full contract data with pdfGenerationData from contracts endpoint
      console.log('🔍 Fetching full contract data for:', contract.id)
      
      const response = await fetch(`/api/employees/${employeeId}/contracts`)
      if (!response.ok) {
        throw new Error('Failed to fetch contract data')
      }
      
      const contracts = await response.json()
      const fullContract = contracts.find((c: any) => c.id === contract.id)
      
      if (!fullContract) {
        throw new Error('Contract not found')
      }
      
      console.log('📋 Full contract data retrieved:', {
        id: fullContract.id,
        contractNumber: fullContract.contractNumber,
        hasPdfData: !!fullContract.pdfGenerationData,
        pdfDataType: typeof fullContract.pdfGenerationData
      })

      // Use stored PDF generation data if available
      if (fullContract.pdfGenerationData) {
        console.log('🔍 Contract pdfGenerationData:', JSON.stringify(fullContract.pdfGenerationData, null, 2))

        // Check if this is a renewed contract - check both DB field and pdfGenerationData
        const isRenewed = fullContract.isRenewal === true || fullContract.pdfGenerationData.isRenewal === true
        const renewalCount = fullContract.renewalCount || fullContract.pdfGenerationData.renewalCount || 0

        const copyData = {
          ...fullContract.pdfGenerationData,
          // Ensure renewal flags are preserved/set
          isRenewal: isRenewed,
          renewalCount: isRenewed ? renewalCount : undefined,
          renewalNote: isRenewed ? fullContract.pdfGenerationData.renewalNote || `==RENEWED== (Renewal #${renewalCount})` : undefined,
          isCopy: true,
          copyNote: isRenewed
            ? `==RENEWED== (Renewal #${renewalCount}) - COPY OF RENEWED CONTRACT`
            : 'COPY - REPRINT OF ORIGINAL CONTRACT'
        }

        console.log('📄 Copy data being sent to PDF generator:', JSON.stringify(copyData, null, 2))

        const pdf = generateComprehensiveContract(copyData)
        const filename = isRenewed
          ? `${fullContract.contractNumber}_Employment_Contract_RENEWED_${renewalCount}_COPY.pdf`
          : `${fullContract.contractNumber}_Employment_Contract_COPY.pdf`
        pdf.save(filename)
        return
      }

      toast.push('Contract PDF data not available. This contract may be from an older version.')
    } catch (error) {
      console.error('Error generating contract PDF:', error)
      toast.push('Failed to generate contract PDF. Please try again.')
    }
  }
  const handleDeleteContract = async (contractId: string, contractNumber: string) => {
    if (!canDeleteContracts) {
      toast.push('You do not have permission to delete contracts.')
      return
    }

    const ok = await confirm({
      title: `Delete contract ${contractNumber}?`,
      description: `This action cannot be undone and will permanently remove the contract from the system.`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })

    if (!ok) return

    try {
      setDeletingContract(contractId)
      
      const response = await fetch(`/api/employees/${employeeId}/contracts/${contractId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete contract')
      }

      // Refresh employee data to update contracts list
      await fetchEmployee()
      toast.push('Contract deleted successfully.')
    } catch (error: any) {
      console.error('Error deleting contract:', error)
      toast.push(error.message || 'Failed to delete contract. Please try again.')
    } finally {
      setDeletingContract(null)
    }
  }

  const handleRenewContract = (contract: any) => {
    setSelectedContractForRenewal(contract)
    setShowRenewalModal(true)
  }

  const handleRenewalSuccess = async (renewalData: any) => {
    try {
      const response = await fetch(`/api/contracts/${selectedContractForRenewal?.id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(renewalData)
      })

      if (response.ok) {
        const result = await response.json()
        setMessage({
          type: 'success',
          text: `Contract renewed successfully! New contract: ${result.data.renewedContract.contractNumber}`
        })
        setShowRenewalModal(false)
        setSelectedContractForRenewal(null)
        fetchEmployee() // Refresh to show new contract
        setTimeout(() => setMessage(null), 5000)

        // Navigate to the new contract with highlight
        router.push(`/employees/${employeeId}?highlightContract=${result.data.renewedContract.id}`)
      } else {
        const error = await response.json()
        setMessage({
          type: 'error',
          text: error.error || 'Failed to renew contract'
        })
        setTimeout(() => setMessage(null), 5000)
      }
    } catch (error) {
      console.error('Error renewing contract:', error)
      setMessage({
        type: 'error',
        text: 'Error renewing contract. Please try again.'
      })
      setTimeout(() => setMessage(null), 5000)
    }
  }

  const handleApproveContract = (contract: any) => {
    setSelectedContractForApproval(contract)
    setShowApprovalModal(true)
  }

  const handleApprovalSuccess = async () => {
    setMessage({
      type: 'success',
      text: 'Contract approved successfully! Employee has been activated.'
    })
    setShowApprovalModal(false)
    setSelectedContractForApproval(null)
    await fetchEmployee() // Refresh to show updated contract status
    setTimeout(() => setMessage(null), 5000)
  }

  const handleChangeStatus = (contract: any) => {
    setSelectedContractForStatusChange(contract)
    setStatusChangeData({
      status: '',
      endDate: '',
      terminationReason: '',
      notes: ''
    })
    setShowStatusChangeModal(true)
  }

  const handleStatusChangeSubmit = async () => {
    if (!selectedContractForStatusChange) return

    // Validation
    if (!statusChangeData.status) {
      toast.push('Please select a status')
      return
    }

    if (statusChangeData.status === 'terminated' && !statusChangeData.terminationReason) {
      toast.push('Termination reason is required when terminating a contract')
      return
    }

    const confirmMessage = statusChangeData.status === 'terminated'
      ? `⚠️ WARNING: Terminating this contract will:\n\n` +
        `• Set employee status to TERMINATED\n` +
        `• Deactivate the employee\n` +
        `• Suspend their user account (if linked)\n` +
        `• Deactivate all business memberships\n\n` +
        `This action is PERMANENT and cannot be reversed.\n\n` +
        `Are you absolutely sure you want to terminate contract ${selectedContractForStatusChange.contractNumber}?`
      : `Are you sure you want to change contract ${selectedContractForStatusChange.contractNumber} status to ${statusChangeData.status}?`

    const ok = await confirm({
      title: statusChangeData.status === 'terminated' ? 'Terminate contract' : 'Change contract status',
      description: confirmMessage,
      confirmText: statusChangeData.status === 'terminated' ? 'Terminate' : 'Change',
      cancelText: 'Cancel'
    })

    if (!ok) return

    try {
      const response = await fetch(
        `/api/employees/${employeeId}/contracts/${selectedContractForStatusChange.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(statusChangeData)
        }
      )

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Contract status changed to ${statusChangeData.status} successfully`
        })
        setShowStatusChangeModal(false)
        setSelectedContractForStatusChange(null)
        fetchEmployee() // Refresh employee data
        setTimeout(() => setMessage(null), 5000)
      } else {
        const error = await response.json()
        setMessage({
          type: 'error',
          text: error.error || 'Failed to change contract status'
        })
        setTimeout(() => setMessage(null), 5000)
      }
    } catch (error) {
      console.error('Error changing contract status:', error)
      setMessage({
        type: 'error',
        text: 'Error changing contract status. Please try again.'
      })
      setTimeout(() => setMessage(null), 5000)
    }
  }

  const handleCreateUserSuccess = (message: string) => {
    setMessage({ type: 'success', text: message })
    setShowCreateUserModal(false)
    fetchEmployee() // Refresh to show user link
    setTimeout(() => setMessage(null), 5000)
  }

  const handleCreateUserError = (error: string) => {
    setMessage({ type: 'error', text: error })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleManageUserSuccess = (message: string) => {
    setMessage({ type: 'success', text: message })
    setShowManageUserModal(false)
    fetchEmployee() // Refresh to show changes
    setTimeout(() => setMessage(null), 5000)
  }

  const handleManageUserError = (error: string) => {
    setMessage({ type: 'error', text: error })
    setTimeout(() => setMessage(null), 5000)
  }

  const calculateTenure = (hireDate: string) => {
    const hire = new Date(hireDate)
    const now = new Date()
    const months = (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth())
    const years = Math.floor(months / 12)
    const remainingMonths = months % 12
    
    if (years === 0) return `${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`
    if (remainingMonths === 0) return `${years} year${years !== 1 ? 's' : ''}`
    return `${years} year${years !== 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`
  }

  // Calculate monthly benefits from active contract if server didn't provide `totalBenefits`.
  const computedMonthlyBenefits = useMemo(() => {
    if (!employee) return 0
    const active = (employee.contracts || []).find((c: any) => c.status === 'active') || (employee.contracts || [])[0]
    if (!active) return 0

    // Prefer server-calculated monthlyBenefits when available
    const activeAny = active as any
    if (activeAny._computed && typeof activeAny._computed.monthlyBenefits === 'number') {
      return Number(activeAny._computed.monthlyBenefits || 0)
    }

    // Fallback: compute from benefit list (DB or pdfGenerationData) including percentage-based benefits
    const benefitsSource = Array.isArray(active.benefits) && active.benefits.length > 0
      ? active.benefits
      : ((active as any).pdfGenerationData && Array.isArray((active as any).pdfGenerationData.benefits))
        ? (active as any).pdfGenerationData.benefits
        : []

  const monthlySalaryFallback = Number((activeAny._computed && activeAny._computed.monthlySalary) ?? active.baseSalary ?? 0)

    return (benefitsSource || []).reduce((sum: number, b: any) => {
      const amt = b && b.amount != null ? Number(b.amount) : 0
      if (b.isPercentage) {
        return sum + (monthlySalaryFallback * amt / 100)
      }
      return sum + (isFinite(amt) ? amt : 0)
    }, 0)
  }, [employee])

  const displayedMonthlyBenefits = (employee && employee.totalBenefits != null && employee.totalBenefits > 0) ? employee.totalBenefits : computedMonthlyBenefits

  if (!session) {
    return (
      <ContentLayout title="Employee Details">
        <div className="text-center py-8">
          <p className="text-secondary">Please sign in to view employee details.</p>
        </div>
      </ContentLayout>
    )
  }

  if (!canViewEmployees) {
    return (
      <ContentLayout title="Employee Details">
        <div className="text-center py-8">
          <p className="text-secondary">You don't have permission to view employee details.</p>
        </div>
      </ContentLayout>
    )
  }

  if (loading) {
    return (
      <ContentLayout title="Employee Details">
        <div className="text-center py-8">
          <p className="text-secondary">Loading employee details...</p>
        </div>
      </ContentLayout>
    )
  }

  if (!employee) {
    return (
      <ContentLayout title="Employee Details">
        <div className="text-center py-8">
          <p className="text-secondary">Employee not found.</p>
        </div>
      </ContentLayout>
    )
  }

  // Use contracts from API response, fallback to empty array if not available
  const contracts = employee.contracts || []
  const activeContract = contracts.find(c => c.status === 'active')
  const pendingContract = contracts.find(c => c.status === 'pending_approval')
  const currentContract = activeContract || pendingContract

  // Only the most recent active contract can be renewed
  // Sort contracts by creation date (newest first) and find the first active one
  const sortedContracts = [...contracts].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  const mostRecentActiveContract = sortedContracts.find(c => c.status === 'active')
  const canRenewContract = (contract: any) => {
    // Only allow renewal if this is the most recent active contract
    return mostRecentActiveContract && contract.id === mostRecentActiveContract.id
  }

  // Check if user account creation should be enabled
  const canCreateUserAccount = canManageUserAccounts && !employee.user && activeContract


  return (
    <ContentLayout
      title={employee.fullName}
      subtitle={`${employee.jobTitle.title} • ${employee.employeeNumber}`}
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Employees', href: '/employees' },
        { label: employee.fullName, isActive: true }
      ]}
      headerActions={
        <div className="flex space-x-3">
          {canEditEmployees && (
            <button 
              className="btn-secondary"
              onClick={() => router.push(`/employees/${employeeId}/edit`)}
            >
              Edit Employee
            </button>
          )}
          {canCreateEmployeeContracts && (
            <button 
              className="btn-primary"
              onClick={() => router.push(`/employees/${employeeId}/contracts/new`)}
            >
              New Contract
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Employee Overview Card */}
        <div className="card">
          <div className="p-4 sm:p-6">
            <div className="space-y-4 sm:space-y-0 sm:flex sm:items-start sm:justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 dark:text-blue-300 font-semibold text-sm sm:text-lg">
                    {employee.firstName[0]}{employee.lastName[0]}
                  </span>
                </div>
                <div className="ml-3 sm:ml-6 min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-primary truncate">{employee.fullName}</h1>
                  <p className="text-base sm:text-lg text-secondary">{employee.jobTitle.title}</p>
                  <div className="mt-2 space-y-1 sm:space-y-0 sm:flex sm:items-center sm:space-x-4 text-sm text-secondary">
                    <span className="block sm:inline">{employee.employeeNumber}</span>
                    {employee.email && <span className="block sm:inline truncate">{employee.email}</span>}
                    <span className="block sm:inline">Hired {formatDate(employee.hireDate)}</span>
                    <span className="block sm:inline">{calculateTenure(employee.hireDate)} tenure</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start sm:items-end space-y-2 flex-shrink-0">
                <span className={`inline-flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-full w-full sm:w-auto text-center ${
                  EMPLOYMENT_STATUS_COLORS[employee.employmentStatus as keyof typeof EMPLOYMENT_STATUS_COLORS] ||
                  'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                }`}>
                  {currentContract?.employeeSignedAt ?
                   `CONTRACT SIGNED` :
                   currentContract?.status === 'active' && employee.isActive ? 'ACTIVE' :
                   employee.employmentStatus === 'pending_contract' ? 'PENDING CONTRACT' :
                   employee.employmentStatus.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max px-1">
            {['profile', 'contracts', 'assignments', 'performance', 'expensePayments'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-2 sm:px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-secondary hover:text-primary hover:border-gray-300'
                }`}
              >
                {tab === 'expensePayments' ? 'Expense Payments' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Personal Information */}
            <div className="card">
              <div className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Personal Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-secondary">Full Name</label>
                    <p className="mt-1 text-sm text-primary">{employee.fullName}</p>
                  </div>
                  {employee.email && (
                    <div>
                      <label className="block text-sm font-medium text-secondary">Email</label>
                      <p className="mt-1 text-sm text-primary">{employee.email}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-secondary">Phone</label>
                    <p className="mt-1 text-sm text-primary">{formatPhoneNumberForDisplay(employee.phone)}</p>
                  </div>
                  {employee.address && (
                    <div>
                      <label className="block text-sm font-medium text-secondary">Address</label>
                      <p className="mt-1 text-sm text-primary">{employee.address}</p>
                    </div>
                  )}
                  {employee.dateOfBirth && (
                    <div>
                      <label className="block text-sm font-medium text-secondary">Date of Birth</label>
                      <p className="mt-1 text-sm text-primary">{formatDate(employee.dateOfBirth)}</p>
                    </div>
                  )}
                  {employee.nationalId && (
                    <div>
                      <label className="block text-sm font-medium text-secondary">National ID</label>
                      <p className="mt-1 text-sm text-primary">{employee.nationalId}</p>
                    </div>
                  )}
                  {employee.driverLicense && (
                    <div>
                      <label className="block text-sm font-medium text-secondary">Driver's License</label>
                      <p className="mt-1 text-sm text-primary">{employee.driverLicense}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Employment Details */}
            <div className="card">
              <div className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Employment Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-secondary">Employee Number</label>
                    <p className="mt-1 text-sm text-primary">{employee.employeeNumber}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary">Job Title</label>
                    <p className="mt-1 text-sm text-primary">{employee.jobTitle.title}</p>
                    {employee.jobTitle.department && (
                      <p className="text-xs text-secondary">{employee.jobTitle.department}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary">Primary Business</label>
                    <p className="mt-1 text-sm text-primary">
                      {employee.primaryBusiness.name} ({employee.primaryBusiness.type})
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary">Hire Date</label>
                    <p className="mt-1 text-sm text-primary">{formatDate(employee.hireDate)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary">Tenure</label>
                    <p className="mt-1 text-sm text-primary">{calculateTenure(employee.hireDate)}</p>
                  </div>
                    {employee.supervisor && (
                    <div>
                      <label className="block text-sm font-medium text-secondary">Supervisor</label>
                      <p className="mt-1 text-sm text-primary">
                        {employee.supervisor.fullName}
                        <span className="block text-xs text-secondary">{employee.supervisor.jobTitle ? employee.supervisor.jobTitle.title : ''}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="card">
              <div className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Emergency Contact</h3>
                {employee.emergencyContactName ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-secondary">Name</label>
                      <p className="mt-1 text-sm text-primary">{employee.emergencyContactName}</p>
                    </div>
                    {employee.emergencyContactPhone && (
                      <div>
                        <label className="block text-sm font-medium text-secondary">Phone</label>
                        <p className="mt-1 text-sm text-primary">{employee.emergencyContactPhone}</p>
                      </div>
                    )}
                    {employee.emergencyContactRelation && (
                      <div>
                        <label className="block text-sm font-medium text-secondary">Relationship</label>
                        <p className="mt-1 text-sm text-primary">{employee.emergencyContactRelation}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-secondary">No emergency contact information available.</p>
                )}
              </div>
            </div>

            {/* Salary & Remuneration */}
            <div className="card sm:col-span-2 lg:col-span-1">
              <div className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">💰 Salary & Benefits</h3>
                {employee.currentSalary ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-secondary">Current Salary</label>
                      <div className="mt-1">
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(employee.currentSalary.annualSalary)}/year
                        </p>
                        <p className="text-sm text-secondary">
                          ${employee.currentSalary.monthlySalary.toLocaleString(undefined, { maximumFractionDigits: 2 })}/month
                          <span className="ml-2 text-xs text-secondary">
                            ({employee.currentSalary.frequency} payments)
                          </span>
                        </p>
                      </div>
                    </div>

                    {(displayedMonthlyBenefits && displayedMonthlyBenefits > 0) && (
                      <div>
                        <label className="block text-sm font-medium text-secondary">Total Benefits</label>
                        <p className="mt-1 text-lg font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(displayedMonthlyBenefits)}/month
                        </p>
                        <p className="text-sm text-secondary">
                          ({employee.currentSalary?.frequency} payments)
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-secondary">Total Remuneration</label>
                      <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(employee.totalRemuneration ?? 0)}/year
                      </p>
                      <p className="text-sm text-secondary">
                        ${employee.monthlyRemuneration?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '0.00'}/month
                      </p>
                      <p className="text-xs text-secondary">
                        Salary + Benefits from active contract
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-secondary">No active contract with salary information.</p>
                )}
              </div>
            </div>

            {/* User Account Management */}
            {canManageUserAccounts && (
              <div className="card sm:col-span-2 lg:col-span-1">
                <div className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-primary">System Account</h3>
                    {employee.user ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200 rounded border border-green-300">
                        <span className="mr-1">✓</span>
                        Linked
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200 rounded border border-orange-300">
                        <span className="mr-1">○</span>
                        No Account
                      </span>
                    )}
                  </div>
                  
                  {employee.user ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-secondary">User Name</label>
                        <p className="mt-1 text-sm text-primary">{employee.users.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary">Email</label>
                        <p className="mt-1 text-sm text-primary">{employee.users.email}</p>
                      </div>
                      <div className="pt-3 space-y-2">
                        <button
                          onClick={() => setShowManageUserModal(true)}
                          className="w-full btn-secondary text-sm"
                        >
                          Manage Account
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-secondary mb-4">
                        {activeContract
                          ? "This employee does not have a system user account. You can create one to give them access to the system."
                          : "User account creation is disabled until employee has an active contract."
                        }
                      </p>
                      {!activeContract && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-4">
                          <div className="flex items-start">
                            <span className="text-yellow-600 dark:text-yellow-400 mr-2">⚠️</span>
                            <div>
                              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Contract Required</p>
                              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                Create and activate an employment contract before creating a user account for security purposes.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => setShowCreateUserModal(true)}
                        disabled={!canCreateUserAccount}
                        className={`w-full text-sm ${
                          canCreateUserAccount
                            ? 'btn-primary'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed px-4 py-2 rounded-lg dark:bg-gray-600 dark:text-gray-400'
                        }`}
                        title={!activeContract ? "Employee must have an active contract before user account creation" : ""}
                      >
                        {canCreateUserAccount ? 'Create User Account' : 'Contract Required'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Team Management (if applicable) */}
            {employee.subordinates.length > 0 && (
              <div className="card sm:col-span-2 lg:col-span-3">
                <div className="p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-primary mb-4">
                    Team Members ({employee._count.subordinates})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {employee.subordinates.map((subordinate) => (
                      <div key={subordinate.id} className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mr-3">
                          <span className="text-blue-600 dark:text-blue-300 font-semibold text-xs">
                            {subordinate.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-primary">{subordinate.fullName}</p>
                          <p className="text-xs text-secondary">{subordinate.jobTitle.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'contracts' && canViewEmployeeContracts && (
          <div className="space-y-6">
            {contracts.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-secondary">No contracts found for this employee.</p>
                {canCreateEmployeeContracts && (
                  <button 
                    className="mt-4 btn-primary"
                    onClick={() => router.push(`/employees/${employeeId}/contracts/new`)}
                  >
                    Create First Contract
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {contracts.map((contract) => (
                  <div key={contract.id} className="card" data-contract-id={contract.id}>
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-3">
                            <h4 className="text-lg font-semibold text-primary">
                              Contract #{contract.contractNumber} (v{contract.version})
                            </h4>
                            {(contract as any).isRenewal && (
                              <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 font-medium">
                                🔄 RENEWED {(contract as any).renewalCount && (contract as any).renewalCount > 0 ? `(#${(contract as any).renewalCount})` : ''}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-secondary mt-1">
                            {formatDate(contract.startDate)} - {contract.endDate ? formatDate(contract.endDate) : 'Ongoing'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${
                            CONTRACT_STATUS_COLORS[contract.status as keyof typeof CONTRACT_STATUS_COLORS] ||
                            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          }`}>
                            {contract.status.replace('_', ' ').toUpperCase()}
                          </span>
                          {contract.employeeSignedAt && contract.managerSignedAt && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200" title="Signed by both employee and manager">
                              ✓✓ Fully Signed
                            </span>
                          )}
                          {contract.employeeSignedAt && !contract.managerSignedAt && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200" title="Signed by employee, awaiting manager approval">
                              ⏳ Awaiting Approval
                            </span>
                          )}
                          <button
                            onClick={() => generateContractPDF(contract)}
                            className="btn-secondary text-sm px-3 py-1"
                            title="Download Contract PDF"
                          >
                            {(contract as any).isRenewal ? '🔄' : '📄'} PDF
                          </button>
                          {canApproveEmployeeContracts && contract.status !== 'terminated' && (
                            <button
                              onClick={() => handleApproveContract(contract)}
                              disabled={!!contract.managerSignedAt}
                              className={`text-sm px-3 py-1 ${
                                contract.managerSignedAt
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                                  : 'btn-primary bg-green-600 hover:bg-green-700'
                              }`}
                              title={
                                contract.managerSignedAt
                                  ? "Contract already approved"
                                  : contract.employeeSignedAt
                                  ? "Approve Contract and Activate Employee"
                                  : "Sign and Approve Contract"
                              }
                            >
                              ✓ {contract.managerSignedAt ? 'Approved' : contract.employeeSignedAt ? 'Approve' : 'Sign & Approve'}
                            </button>
                          )}
                          {canEditEmployeeContracts && (contract as any).status === 'active' && (contract as any).status !== 'terminated' && (
                            <button
                              onClick={() => handleChangeStatus(contract)}
                              className="btn-secondary text-sm px-3 py-1"
                              title="Change Contract Status"
                            >
                              📝 Status
                            </button>
                          )}
                          {canCreateEmployeeContracts && (contract as any).status === 'active' && (contract as any).status !== 'terminated' && canRenewContract(contract) && (
                            <button
                              onClick={() => handleRenewContract(contract)}
                              className="btn-primary text-sm px-3 py-1"
                              title="Renew Contract (Only most recent active contract can be renewed)"
                            >
                              🔄 Renew
                            </button>
                          )}
                          {canDeleteContracts && contract.status !== 'active' && (
                            <button
                              onClick={() => handleDeleteContract(contract.id, contract.contractNumber)}
                              disabled={deletingContract === contract.id}
                              className="btn-danger text-sm px-3 py-1"
                              title="Delete Contract (Admin Only)"
                            >
                              {deletingContract === contract.id ? '⏳' : '🗑️'} Delete
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-secondary">Base Salary</label>
                          <p className="mt-1 text-lg font-semibold text-primary">{formatCurrency(contract.baseSalary)}</p>
                          {/* Monthly benefits total: prefer server-provided computed values, otherwise compute locally (including percentages) */}
                          {(() => {
                            const cAny = contract as any

                            // Prefer server-provided computed monthly benefits
                            const serverComputed = cAny._computed && typeof cAny._computed.monthlyBenefits === 'number'
                              ? Number(cAny._computed.monthlyBenefits)
                              : null

                            // If server provided the employee.totalBenefits for active contract, prefer it
                            if (employee && employee.totalBenefits != null && employee.totalBenefits > 0 && (activeContract && activeContract.id === contract.id)) {
                              return (
                                <p className="mt-1 text-sm text-secondary">
                                  <span className="font-medium text-primary">Monthly benefits: </span>
                                  {formatCurrency(Number(employee.totalBenefits))}
                                </p>
                              )
                            }

                            if (serverComputed !== null) {
                              return (
                                <p className="mt-1 text-sm text-secondary">
                                  <span className="font-medium text-primary">Monthly benefits: </span>
                                  {serverComputed > 0 ? formatCurrency(serverComputed) : <span className="text-sm text-secondary">None</span>}
                                </p>
                              )
                            }

                            // Fallback: compute from benefit list (DB or pdfGenerationData), include percentage benefits calculated against monthly salary
                            const benefitsSource = (Array.isArray(contract.benefits) && contract.benefits.length > 0)
                              ? contract.benefits
                              : (cAny.pdfGenerationData && Array.isArray(cAny.pdfGenerationData.benefits))
                                ? cAny.pdfGenerationData.benefits
                                : []

                            const monthlySalaryFallback = Number((cAny._computed && cAny._computed.monthlySalary) ?? contract.baseSalary ?? 0)

                            const benefitTotal = (benefitsSource || []).reduce((sum: number, b: any) => {
                              const amt = b && b.amount != null ? Number(b.amount) : 0
                              if (b.isPercentage) {
                                return sum + (monthlySalaryFallback * amt / 100)
                              }
                              return sum + (isFinite(amt) ? amt : 0)
                            }, 0)

                            return (
                              <p className="mt-1 text-sm text-secondary">
                                <span className="font-medium text-primary">Monthly benefits: </span>
                                {benefitTotal > 0 ? formatCurrency(benefitTotal) : <span className="text-sm text-secondary">None</span>}
                              </p>
                            )
                          })()}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-secondary">Compensation Type</label>
                          <p className="mt-1 text-sm text-primary">
                            {contract.isSalaryBased && 'Salary'}
                            {contract.isCommissionBased && (contract.isSalaryBased ? ' + Commission' : 'Commission')}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-secondary">Created</label>
                          <p className="mt-1 text-sm text-primary">{formatDate(contract.createdAt)}</p>
                        </div>
                      </div>

                      {/* Show link to previous contract if present */}
                      {(() => {
                        // Prefer normalized previousContract returned by the server
                        const prev = (contract as any).previousContract || null
                        if (prev && prev.id) {
                          const referenced = contracts.find((c: any) => c.id === prev.id)
                          const displayLabel = referenced?.contractNumber || prev.contractNumber || prev.id
                          return (
                            <div className="mt-4">
                              <label className="block text-sm font-medium text-secondary">Based On</label>
                              <p className="mt-1 text-sm text-primary">
                                <a
                                  href={`#`}
                                  onClick={(e) => { e.preventDefault(); router.push(`/employees/${employeeId}?tab=contracts&highlightContract=${prev.id}`) }}
                                  className="text-blue-600 hover:underline"
                                >
                                  View previous contract #{displayLabel}
                                </a>
                              </p>
                            </div>
                          )
                        }
                        return null
                      })()}

                      {contract.benefits.length > 0 && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-secondary mb-2">Benefits</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {contract.benefits.map((benefit, idx) => (
                              <div key={benefit.id ?? `${benefit.benefitType?.name || (benefit as any).name || 'benefit'}-${benefit.amount}-${idx}`} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                <span className="text-sm text-primary">{benefit.benefitType.name}</span>
                                <span className="text-sm font-medium text-primary">
                                  {benefit.isPercentage ? `${benefit.amount}%` : formatCurrency(benefit.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {contract.notes && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-secondary">Notes</label>
                          <p className="mt-1 text-sm text-primary">{contract.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'assignments' && (
          <div className="space-y-6">
            <div className="card">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Business Assignments</h3>
                
                {/* Primary Business */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-primary mb-2">Primary Business</h4>
                  <div className="flex items-center p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg">
                    <div>
                      <p className="font-medium text-primary">{employee.primaryBusiness.name}</p>
                      <p className="text-sm text-secondary capitalize">{employee.primaryBusiness.type} Business</p>
                    </div>
                  </div>
                </div>

                {/* Additional Assignments */}
                {employee.businessAssignments.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-primary mb-2">Additional Assignments</h4>
                    <div className="space-y-3">
                      {employee.businessAssignments.map((assignment, idx) => (
                        <div key={idx} className={`flex items-center justify-between p-4 rounded-lg border ${
                          assignment.isActive 
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        }`}>
                          <div>
                            <p className="font-medium text-primary">{assignment.businesses.name}</p>
                            <p className="text-sm text-secondary capitalize">{assignment.businesses.type} Business</p>
                            {assignment.role && (
                              <p className="text-xs text-secondary">Role: {assignment.role}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                              assignment.isActive 
                                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200' 
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`}>
                              {assignment.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <p className="text-xs text-secondary mt-1">
                              Assigned {formatDate(assignment.assignedAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div className="card">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Performance Overview</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{calculateTenure(employee.hireDate)}</p>
                    <p className="text-sm text-secondary">Tenure</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{employee._count.subordinates}</p>
                    <p className="text-sm text-secondary">Team Members</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{employee.disciplinaryActions.length}</p>
                    <p className="text-sm text-secondary">Disciplinary Actions</p>
                  </div>
                </div>

                {/* Disciplinary Actions */}
                {employee.disciplinaryActions.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-primary mb-3">Disciplinary History</h4>
                    <div className="space-y-3">
                      {employee.disciplinaryActions.map((action) => (
                        <div key={action.id} className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-primary">{action.type} - {action.severity}</p>
                              <p className="text-sm text-secondary mt-1">{action.description}</p>
                              <p className="text-sm text-secondary mt-2">Action: {action.actionTaken}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-secondary">{formatDate(action.actionDate)}</p>
                              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded mt-1 ${
                                action.isResolved 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200' 
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'
                              }`}>
                                {action.isResolved ? 'Resolved' : 'Open'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {employee.disciplinaryActions.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-secondary">No disciplinary actions on record.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Expense Account Payments Tab */}
        {activeTab === 'expensePayments' && (
          <div className="space-y-6">
            {/* Summary Card */}
            <PayeeExpenseSummary
              payeeType="EMPLOYEE"
              payeeId={employeeId}
            />

            {/* Payments Table */}
            <PayeePaymentsTable
              payeeType="EMPLOYEE"
              payeeId={employeeId}
            />

            {/* Expense Report with Charts */}
            <PayeeExpenseReport
              payeeType="EMPLOYEE"
              payeeId={employeeId}
            />
          </div>
        )}
      </div>

      {/* Success/Error Message */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          message.type === 'success' 
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

      {/* Create User Modal */}
      {showCreateUserModal && employee && currentUser && (
        <CreateUserModal
          employee={employee}
          currentUser={currentUser}
          isOpen={showCreateUserModal}
          onClose={() => setShowCreateUserModal(false)}
          onSuccess={handleCreateUserSuccess}
          onError={handleCreateUserError}
        />
      )}

      {/* Manage User Account Modal */}
      {showManageUserModal && employee && currentUser && (
        <ManageUserAccountModal
          employee={employee}
          currentUser={currentUser}
          isOpen={showManageUserModal}
          onClose={() => setShowManageUserModal(false)}
          onSuccess={handleManageUserSuccess}
          onError={handleManageUserError}
        />
      )}

      {/* Contract Renewal Modal */}
      {selectedContractForRenewal && (
        <ContractRenewalModal
          contract={{
            id: selectedContractForRenewal.id,
            contractNumber: selectedContractForRenewal.contractNumber,
            employeeName: employee.fullName,
            startDate: selectedContractForRenewal.startDate,
            endDate: selectedContractForRenewal.endDate,
            contractDurationMonths: selectedContractForRenewal.contractDurationMonths,
            jobTitle: selectedContractForRenewal.jobTitle?.title || employee.jobTitle.title,
            baseSalary: selectedContractForRenewal.baseSalary
          }}
          isOpen={showRenewalModal}
          onClose={() => {
            setShowRenewalModal(false)
            setSelectedContractForRenewal(null)
          }}
          onRenew={handleRenewalSuccess}
        />
      )}

      {/* Contract Status Change Modal */}
      {showStatusChangeModal && selectedContractForStatusChange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">
                Change Contract Status
              </h3>
              <p className="text-sm text-secondary mb-4">
                Contract: {selectedContractForStatusChange.contractNumber}
              </p>

              <div className="space-y-4">
                {/* Status Selection */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    New Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={statusChangeData.status}
                    onChange={(e) => setStatusChangeData({ ...statusChangeData, status: e.target.value })}
                    className="input w-full px-4 py-2.5 text-base"
                  >
                    <option value="">Select status...</option>
                    <option value="suspended">Suspended</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={statusChangeData.endDate}
                    onChange={(e) => setStatusChangeData({ ...statusChangeData, endDate: e.target.value })}
                    className="input w-full px-4 py-2.5 text-base"
                  />
                </div>

                {/* Termination Reason (required for terminated status) */}
                {statusChangeData.status === 'terminated' && (
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Termination Reason <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={statusChangeData.terminationReason}
                      onChange={(e) => setStatusChangeData({ ...statusChangeData, terminationReason: e.target.value })}
                      className="input w-full px-4 py-2.5 text-base"
                      placeholder="e.g., Voluntary resignation, End of contract period"
                    />
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={statusChangeData.notes}
                    onChange={(e) => setStatusChangeData({ ...statusChangeData, notes: e.target.value })}
                    className="input w-full px-4 py-2.5 text-base"
                    rows={3}
                    placeholder="Additional notes or comments"
                  />
                </div>

                {/* Warning for termination */}
                {statusChangeData.status === 'terminated' && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-start">
                      <span className="text-red-600 dark:text-red-400 mr-2">⚠️</span>
                      <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">Warning: Permanent Action</p>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                          Terminating this contract will permanently deactivate the employee and suspend their user account. This action cannot be reversed.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowStatusChangeModal(false)
                    setSelectedContractForStatusChange(null)
                    setStatusChangeData({
                      status: '',
                      endDate: '',
                      terminationReason: '',
                      notes: ''
                    })
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusChangeSubmit}
                  className={statusChangeData.status === 'terminated' ? 'btn-danger' : 'btn-primary'}
                >
                  {statusChangeData.status === 'terminated' ? 'Terminate Contract' : 'Change Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contract Approval Modal */}
      {showApprovalModal && selectedContractForApproval && (
        <ContractApprovalModal
          contract={selectedContractForApproval}
          employeeId={employeeId}
          onClose={() => {
            setShowApprovalModal(false)
            setSelectedContractForApproval(null)
          }}
          onApproved={handleApprovalSuccess}
        />
      )}
    </ContentLayout>
  )
}