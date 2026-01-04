'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { SystemAdminRoute } from '@/components/auth/system-admin-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect } from 'react'
import { formatDateByFormat, formatPhoneNumberForDisplay } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'

interface ContractorAnalytics {
  id: string
  fullName: string
  email?: string
  phone?: string
  nationalId?: string
  idFormatTemplate?: {
    name: string
    countryCode: string
  }
  isActive: boolean
  createdAt: string

  // Analytics
  totalProjects: number
  totalPayments: number
  totalTransactions: number
  averagePayment: number
  uniquePayingUsers: number
  businessTypesWorked: number

  // Usage details
  projects: Array<{
    id: string
    name: string
    status: string
    createdBy: string
    createdAt: string
  }>
  recentActivity?: {
    date: string
    amount: number
    stage?: string
  }
}

interface AnalyticsData {
  contractors: ContractorAnalytics[]
  systemStats: {
    totalContractors: number
    activeContractors: number
    contractorsWithProjects: number
    contractorsWithPayments: number
    totalProjectAssignments: number
    totalPaymentTransactions: number
    totalPaymentsValue: number
  }
  topPerformers: {
    byProjects: ContractorAnalytics[]
    byPayments: ContractorAnalytics[]
    byUsers: ContractorAnalytics[]
  }
}

export default function AdminContractorsPage() {
  const { format: globalDateFormat } = useDateFormat()
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedContractor, setSelectedContractor] = useState<ContractorAnalytics | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'contractors' | 'analytics'>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/contractors/analytics')
      if (response.ok) {
        const data = await response.json()
        setAnalyticsData(data)
      } else {
        console.error('Failed to fetch contractor analytics')
      }
    } catch (error) {
      console.error('Error fetching contractor analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => formatDateByFormat(dateString, globalDateFormat)
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`

  const filteredContractors = analyticsData?.contractors.filter(contractor => {
    const matchesSearch = contractor.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contractor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contractor.nationalId?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filterActive === 'all' ||
                         (filterActive === 'active' && contractor.isActive) ||
                         (filterActive === 'inactive' && !contractor.isActive)

    return matchesSearch && matchesFilter
  }) || []

  if (loading) {
    return (
      <SystemAdminRoute>
        <ContentLayout title="Global Contractor Management" subtitle="Loading contractor analytics...">
          <div className="card p-6">
            <div className="text-secondary">Loading contractor data...</div>
          </div>
        </ContentLayout>
      </SystemAdminRoute>
    )
  }

  if (!analyticsData) {
    return (
      <SystemAdminRoute>
        <ContentLayout title="Global Contractor Management" subtitle="Failed to load contractor data">
          <div className="card p-6">
            <div className="text-red-600">Failed to load contractor analytics. Please try again.</div>
          </div>
        </ContentLayout>
      </SystemAdminRoute>
    )
  }

  return (
    <SystemAdminRoute>
      <ContentLayout
        title="Global Contractor Management"
        subtitle="Manage and analyze contractor usage across all business types"
        breadcrumb={[
          { label: 'Administration', href: '/admin' },
          { label: 'Global Contractors', isActive: true }
        ]}
      >
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'overview', label: 'System Overview' },
                { key: 'contractors', label: 'Contractor Directory' },
                { key: 'analytics', label: 'Top Performers' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-secondary hover:text-primary hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* System Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card p-6">
                  <h3 className="text-sm font-medium text-secondary">Total Contractors</h3>
                  <p className="text-3xl font-bold text-primary">{analyticsData.systemStats.totalContractors}</p>
                  <p className="text-xs text-secondary mt-1">
                    {analyticsData.systemStats.activeContractors} active
                  </p>
                </div>
                <div className="card p-6">
                  <h3 className="text-sm font-medium text-secondary">Project Assignments</h3>
                  <p className="text-3xl font-bold text-primary">{analyticsData.systemStats.totalProjectAssignments}</p>
                  <p className="text-xs text-secondary mt-1">
                    {analyticsData.systemStats.contractorsWithProjects} contractors with projects
                  </p>
                </div>
                <div className="card p-6">
                  <h3 className="text-sm font-medium text-secondary">Payment Transactions</h3>
                  <p className="text-3xl font-bold text-primary">{analyticsData.systemStats.totalPaymentTransactions}</p>
                  <p className="text-xs text-secondary mt-1">
                    {analyticsData.systemStats.contractorsWithPayments} contractors paid
                  </p>
                </div>
                <div className="card p-6">
                  <h3 className="text-sm font-medium text-secondary">Total Payments</h3>
                  <p className="text-3xl font-bold text-primary">{formatCurrency(analyticsData.systemStats.totalPaymentsValue)}</p>
                  <p className="text-xs text-secondary mt-1">
                    Across all projects
                  </p>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-primary mb-4">Contractor Utilization</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-secondary">With Project Assignments:</span>
                      <span className="font-medium text-primary">
                        {Math.round((analyticsData.systemStats.contractorsWithProjects / analyticsData.systemStats.totalContractors) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">With Payment History:</span>
                      <span className="font-medium text-primary">
                        {Math.round((analyticsData.systemStats.contractorsWithPayments / analyticsData.systemStats.totalContractors) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Average Projects per Contractor:</span>
                      <span className="font-medium text-primary">
                        {(analyticsData.systemStats.totalProjectAssignments / analyticsData.systemStats.contractorsWithProjects || 0).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-primary mb-4">Payment Statistics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-secondary">Average Payment:</span>
                      <span className="font-medium text-primary">
                        {formatCurrency(analyticsData.systemStats.totalPaymentsValue / analyticsData.systemStats.totalPaymentTransactions || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Avg Payments per Contractor:</span>
                      <span className="font-medium text-primary">
                        {(analyticsData.systemStats.totalPaymentTransactions / analyticsData.systemStats.contractorsWithPayments || 0).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Total Payment Volume:</span>
                      <span className="font-medium text-primary">
                        {formatCurrency(analyticsData.systemStats.totalPaymentsValue)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contractors Tab */}
          {activeTab === 'contractors' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="card p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="🔍 Search contractors by name, email, or national ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <select
                    value={filterActive}
                    onChange={(e) => setFilterActive(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Contractors</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>
              </div>

              {/* Contractors Table */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">
                  Contractor Directory ({filteredContractors.length} contractors)
                </h3>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                          Contractor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                          Projects
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                          Payments
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                          Users
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredContractors.map((contractor) => (
                        <tr key={contractor.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-primary">{contractor.fullName}</div>
                              <div className="text-xs text-secondary">
                                {contractor.nationalId && `ID: ${contractor.nationalId}`}
                                {contractor.idFormatTemplate && ` (${contractor.idFormatTemplate.countryCode})`}
                              </div>
                              <div className="text-xs">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  contractor.isActive
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }`}>
                                  {contractor.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                            <div>
                              {contractor.email && <div>{contractor.email}</div>}
                              {contractor.phone && <div>{formatPhoneNumberForDisplay(contractor.phone)}</div>}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                            <div className="font-medium">{contractor.totalProjects}</div>
                            <div className="text-xs text-secondary">projects assigned</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                            <div className="font-medium">{formatCurrency(contractor.totalPayments)}</div>
                            <div className="text-xs text-secondary">
                              {contractor.totalTransactions} transactions
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                            <div className="font-medium">{contractor.uniquePayingUsers}</div>
                            <div className="text-xs text-secondary">unique users</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                            <button
                              onClick={() => setSelectedContractor(contractor)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top by Projects */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-primary mb-4">Top by Projects</h3>
                  <div className="space-y-3">
                    {analyticsData.topPerformers.byProjects.slice(0, 5).map((contractor, index) => (
                      <div key={contractor.id} className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-primary">{contractor.fullName}</div>
                          <div className="text-xs text-secondary">{contractor.totalProjects} projects</div>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">#{index + 1}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top by Payments */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-primary mb-4">Top by Payments</h3>
                  <div className="space-y-3">
                    {analyticsData.topPerformers.byPayments.slice(0, 5).map((contractor, index) => (
                      <div key={contractor.id} className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-primary">{contractor.fullName}</div>
                          <div className="text-xs text-secondary">{formatCurrency(contractor.totalPayments)}</div>
                        </div>
                        <div className="text-2xl font-bold text-green-600">#{index + 1}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top by User Diversity */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-primary mb-4">Most Cross-User</h3>
                  <div className="space-y-3">
                    {analyticsData.topPerformers.byUsers.slice(0, 5).map((contractor, index) => (
                      <div key={contractor.id} className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-primary">{contractor.fullName}</div>
                          <div className="text-xs text-secondary">{contractor.uniquePayingUsers} users</div>
                        </div>
                        <div className="text-2xl font-bold text-purple-600">#{index + 1}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contractor Detail Modal */}
        {selectedContractor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="card p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-primary">
                  Contractor Details: {selectedContractor.fullName}
                </h2>
                <button
                  onClick={() => setSelectedContractor(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">Personal Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Name:</span> {selectedContractor.fullName}</div>
                    {selectedContractor.email && <div><span className="font-medium">Email:</span> {selectedContractor.email}</div>}
                    {selectedContractor.phone && <div><span className="font-medium">Phone:</span> {formatPhoneNumberForDisplay(selectedContractor.phone)}</div>}
                    {selectedContractor.nationalId && <div><span className="font-medium">National ID:</span> {selectedContractor.nationalId}</div>}
                    <div><span className="font-medium">Status:</span>
                      <span className={selectedContractor.isActive ? 'text-green-600' : 'text-red-600'}>
                        {selectedContractor.isActive ? ' Active' : ' Inactive'}
                      </span>
                    </div>
                    <div><span className="font-medium">Registered:</span> {formatDate(selectedContractor.createdAt)}</div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div>
                  <h3 className="text-lg font-medium text-primary mb-3">Performance Metrics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <div className="text-sm text-secondary">Total Projects</div>
                      <div className="text-xl font-bold text-primary">{selectedContractor.totalProjects}</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                      <div className="text-sm text-secondary">Total Payments</div>
                      <div className="text-xl font-bold text-primary">{formatCurrency(selectedContractor.totalPayments)}</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                      <div className="text-sm text-secondary">Avg Payment</div>
                      <div className="text-xl font-bold text-primary">{formatCurrency(selectedContractor.averagePayment)}</div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                      <div className="text-sm text-secondary">Unique Users</div>
                      <div className="text-xl font-bold text-primary">{selectedContractor.uniquePayingUsers}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Projects */}
              {selectedContractor.projects.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-primary mb-3">Project History</h3>
                  <div className="space-y-2">
                    {selectedContractor.projects.map(project => (
                      <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <div className="font-medium text-primary">{project.name}</div>
                          <div className="text-sm text-secondary">Started: {formatDate(project.createdAt)}</div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          project.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}>
                          {project.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              {selectedContractor.recentActivity && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-primary mb-3">Recent Activity</h3>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-sm text-secondary">Last Payment</div>
                    <div className="font-medium text-primary">
                      {formatCurrency(selectedContractor.recentActivity.amount)} on {formatDate(selectedContractor.recentActivity.date)}
                    </div>
                    {selectedContractor.recentActivity.stage && (
                      <div className="text-sm text-secondary">Stage: {selectedContractor.recentActivity.stage}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </ContentLayout>
    </SystemAdminRoute>
  )
}