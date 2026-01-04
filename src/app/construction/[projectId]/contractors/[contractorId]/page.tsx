'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { formatPhoneNumberForDisplay } from '@/lib/country-codes'

interface StageAssignment {
  id: string
  predeterminedAmount: number
  depositPercentage: number
  depositAmount?: number
  isDepositPaid: boolean
  depositPaidDate?: string
  isFinalPaymentMade: boolean
  finalPaymentDate?: string
  stage: {
    id: string
    name: string
    description?: string
    status: string
  }
}

interface ProjectTransaction {
  id: string
  transactionType: string
  amount: number
  description?: string
  status: string
  createdAt: string
  approvedAt?: string
  approvedBy?: {
    id: string
    name: string
  }
  personalExpense?: {
    id: string
    description: string
    date: string
  }
}

interface Contractor {
  id: string
  isPrimary: boolean
  role?: string
  hourlyRate?: number
  totalContractAmount?: number
  startDate?: string
  endDate?: string
  status: string
  createdAt: string
  person: {
    id: string
    fullName: string
    email?: string
    phone: string
    nationalId: string
    address?: string
    notes?: string
    idFormatTemplate?: {
      name: string
      description?: string
      countryCode?: string
    }
  }
  project: {
    id: string
    name: string
    status: string
  }
  stageAssignments?: StageAssignment[]
  projectTransactions?: ProjectTransaction[]
}

export default function ContractorDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [contractor, setContractor] = useState<Contractor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const projectId = params?.projectId as string
  const contractorId = params?.contractorId as string

  useEffect(() => {
    const fetchContractorDetails = async () => {
      if (!projectId || !contractorId) return

      try {
        const response = await fetch(`/api/construction/projects/${projectId}/contractors/${contractorId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Contractor not found')
          } else if (response.status === 403) {
            setError('You do not have permission to view this contractor')
          } else {
            setError('Failed to load contractor details')
          }
          return
        }

        const data = await response.json()
        setContractor(data)
      } catch (error) {
        console.error('Error fetching contractor details:', error)
        setError('Failed to load contractor details')
      } finally {
        setLoading(false)
      }
    }

    fetchContractorDetails()
  }, [projectId, contractorId])

  const formatCurrency = (amount?: number) => {
    return amount ? `$${amount.toFixed(2)}` : 'N/A'
  }

  const formatDate = (dateString?: string) => {
    return dateString ? new Date(dateString).toLocaleDateString() : 'N/A'
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      completed: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    )
  }

  if (loading) {
    return (
      <BusinessTypeRoute requiredBusinessType="construction">
        <ContentLayout title="Loading..." breadcrumb={[]}>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </ContentLayout>
      </BusinessTypeRoute>
    )
  }

  if (error || !contractor) {
    return (
      <BusinessTypeRoute requiredBusinessType="construction">
        <ContentLayout
          title="Error"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Construction', href: '/construction' },
            { label: 'Project', href: `/construction/${projectId}` },
            { label: 'Contractor Details', isActive: true }
          ]}
        >
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-red-600 mb-2">🚫 {error || 'Contractor Not Found'}</h2>
            <p className="text-secondary mb-4">The requested contractor could not be found or you don't have permission to view it.</p>
            <Link
              href={`/construction/${projectId}`}
              className="btn-primary"
            >
              Back to Project
            </Link>
          </div>
        </ContentLayout>
      </BusinessTypeRoute>
    )
  }

  const totalPaid = contractor.project_transactions?.reduce((sum, transaction) => {
    return transaction.status === 'paid' ? sum + transaction.amount : sum
  }, 0) || 0

  const totalPending = contractor.project_transactions?.reduce((sum, transaction) => {
    return transaction.status === 'pending' ? sum + transaction.amount : sum
  }, 0) || 0

  return (
    <BusinessTypeRoute requiredBusinessType="construction">
      <ContentLayout
        title={`👷 ${contractor.persons.fullName}`}
        subtitle={contractor.isPrimary ? "Primary Contractor" : "Contractor"}
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Construction', href: '/construction' },
          { label: contractor.project.name, href: `/construction/${projectId}` },
          { label: 'Contractor Details', isActive: true }
        ]}
        headerActions={
          <Link
            href={`/construction/${projectId}`}
            className="btn-secondary"
          >
            ← Back to Project
          </Link>
        }
      >
        <div className="space-y-6">
          
          {/* Status and Key Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-2">Status</h3>
              <div className="space-y-2">
                {getStatusBadge(contractor.status)}
                {contractor.isPrimary && (
                  <div>
                    <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                      Primary Contractor
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-2">💰 Total Paid</h3>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
            </div>
            
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-2">⏳ Pending Payments</h3>
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
            </div>
          </div>

          {/* Personal Information */}
          <div className="card">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-primary">👤 Personal Information</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-secondary mb-1">Full Name</h3>
                  <p className="text-primary font-medium">{contractor.persons.fullName}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-secondary mb-1">Phone</h3>
                  <p className="text-primary">{formatPhoneNumberForDisplay(contractor.persons.phone)}</p>
                </div>
                
                {contractor.persons.email && (
                  <div>
                    <h3 className="text-sm font-medium text-secondary mb-1">Email</h3>
                    <p className="text-primary">{contractor.persons.email}</p>
                  </div>
                )}
                
                <div>
                  <h3 className="text-sm font-medium text-secondary mb-1">National ID</h3>
                  <p className="text-primary">{contractor.persons.nationalId}</p>
                  {contractor.persons.idFormatTemplate && (
                    <p className="text-xs text-secondary mt-1">
                      Format: {contractor.persons.idFormatTemplate.name}
                      {contractor.persons.idFormatTemplate.countryCode && ` (${contractor.persons.idFormatTemplate.countryCode})`}
                    </p>
                  )}
                </div>
                
                {contractor.persons.address && (
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-secondary mb-1">Address</h3>
                    <p className="text-primary">{contractor.persons.address}</p>
                  </div>
                )}
                
                {contractor.persons.notes && (
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-secondary mb-1">Notes</h3>
                    <p className="text-primary">{contractor.persons.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contract Information */}
          <div className="card">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-primary">📄 Contract Information</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {contractor.role && (
                  <div>
                    <h3 className="text-sm font-medium text-secondary mb-1">Role</h3>
                    <p className="text-primary">{contractor.role}</p>
                  </div>
                )}
                
                {contractor.hourlyRate && (
                  <div>
                    <h3 className="text-sm font-medium text-secondary mb-1">Hourly Rate</h3>
                    <p className="text-primary">{formatCurrency(contractor.hourlyRate)}</p>
                  </div>
                )}
                
                {contractor.totalContractAmount && (
                  <div>
                    <h3 className="text-sm font-medium text-secondary mb-1">Total Contract Amount</h3>
                    <p className="text-primary text-lg font-semibold">{formatCurrency(contractor.totalContractAmount)}</p>
                  </div>
                )}
                
                <div>
                  <h3 className="text-sm font-medium text-secondary mb-1">Contract Period</h3>
                  <p className="text-primary">
                    {formatDate(contractor.startDate)} - {formatDate(contractor.endDate)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Transactions */}
          {contractor.projectTransactions && contractor.project_transactions.length > 0 && (
            <div className="card">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-primary">💸 Payment History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Approved By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {contractor.project_transactions.map(transaction => (
                      <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                          {formatDate(transaction.personalExpense?.date || transaction.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                            {transaction.transactionType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-primary">
                          {transaction.description || transaction.personalExpense?.description || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(transaction.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                          {transaction.approvedBy?.name || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Stage Assignments */}
          {contractor.stageAssignments && contractor.stageAssignments.length > 0 && (
            <div className="card">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-primary">🏗️ Stage Assignments</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Stage</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Deposit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Deposit Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Final Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {contractor.stageAssignments.map(assignment => (
                      <tr key={assignment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-primary">{assignment.stage.name}</p>
                            {assignment.stage.description && (
                              <p className="text-xs text-secondary mt-1">{assignment.stage.description}</p>
                            )}
                            {getStatusBadge(assignment.stage.status)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                          {formatCurrency(assignment.predeterminedAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                          {assignment.depositPercentage}% 
                          {assignment.depositAmount && (
                            <div className="text-xs text-secondary">({formatCurrency(assignment.depositAmount)})</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            {assignment.isDepositPaid ? (
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                Paid
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                                Unpaid
                              </span>
                            )}
                            {assignment.depositPaidDate && (
                              <div className="text-xs text-secondary mt-1">
                                {formatDate(assignment.depositPaidDate)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            {assignment.isFinalPaymentMade ? (
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                Completed
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                                Pending
                              </span>
                            )}
                            {assignment.finalPaymentDate && (
                              <div className="text-xs text-secondary mt-1">
                                {formatDate(assignment.finalPaymentDate)}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </ContentLayout>
    </BusinessTypeRoute>
  )
}