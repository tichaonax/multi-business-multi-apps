'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { hasPermission } from '@/lib/permission-utils'

interface EmployeeMetrics {
  totalEmployees: number
  activeEmployees: number
  inactiveEmployees: number
  newHiresThisMonth: number
  newHiresThisYear: number
  terminationsThisMonth: number
  terminationsThisYear: number
  averageTenure: number
  employeesByStatus: {
    active: number
    onLeave: number
    terminated: number
    suspended: number
  }
  employeesByDepartment: Array<{
    department: string | null
    count: number
  }>
  employeesByBusiness: Array<{
    businessName: string
    businessType: string
    count: number
  }>
}

interface ContractMetrics {
  totalContracts: number
  activeContracts: number
  pendingContracts: number
  expiredContracts: number
  drafts: number
  contractsByStatus: {
    active: number
    pendingApproval: number
    draft: number
    expired: number
    terminated: number
  }
  averageContractValue: number
  totalContractValue: number
}

interface DisciplinaryMetrics {
  totalActions: number
  openActions: number
  resolvedActions: number
  overdueActions: number
  actionsBySeverity: {
    low: number
    medium: number
    high: number
    critical: number
  }
  actionsByType: Array<{
    type: string
    count: number
  }>
  actionsThisMonth: number
  actionsThisYear: number
}

interface BenefitsMetrics {
  totalBenefitTypes: number
  activeBenefitTypes: number
  totalBenefitValue: number
  averageBenefitsPerEmployee: number
  benefitsByType: Array<{
    type: string
    count: number
    totalValue: number
  }>
}

interface DashboardData {
  employees: EmployeeMetrics
  contracts: ContractMetrics
  disciplinary: DisciplinaryMetrics
  benefits: BenefitsMetrics
}

export default function ReportsPage() {
  const { data: session } = useSession()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedBusiness, setSelectedBusiness] = useState('')
  const [businesses, setBusinesses] = useState<Array<{ id: string; name: string; type: string }>>([])

  const canViewReports = session?.user && (
    hasPermission(session.user, 'canViewEmployees') ||
    hasPermission(session.user, 'canManageEmployees') ||
    hasPermission(session.user, 'isSystemAdmin')
  )

  useEffect(() => {
    if (canViewReports) {
      fetchDashboardData()
      fetchBusinesses()
    }
  }, [canViewReports, selectedPeriod, selectedBusiness])

  const fetchBusinesses = async () => {
    try {
      const response = await fetch('/api/businesses')
      if (response.ok) {
        const data = await response.json()
        setBusinesses(data)
      }
    } catch (error) {
      console.error('Error fetching businesses:', error)
    }
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedPeriod) {
        params.append('period', selectedPeriod)
      }
      if (selectedBusiness) {
        params.append('businessId', selectedBusiness)
      }

      const response = await fetch(`/api/reports/dashboard?${params}`)
      if (response.ok) {
        const data = await response.json()
        setDashboardData(data)
      } else {
        console.error('Failed to fetch dashboard data')
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return 0
    return Math.round((value / total) * 100)
  }

  const getGrowthColor = (current: number, previous: number) => {
    if (current > previous) return 'text-green-600 dark:text-green-400'
    if (current < previous) return 'text-red-600 dark:text-red-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  const exportToCSV = (data: any[], filename: string) => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      Object.keys(data[0]).join(",") + "\n" +
      data.map(row => Object.values(row).join(",")).join("\n")
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!session) {
    return (
      <ContentLayout title="📈 Reports & Analytics">
        <div className="text-center py-8">
          <p className="text-secondary">Please sign in to view reports.</p>
        </div>
      </ContentLayout>
    )
  }

  if (!canViewReports) {
    return (
      <ContentLayout title="📈 Reports & Analytics">
        <div className="text-center py-8">
          <p className="text-secondary">You don't have permission to view reports.</p>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="📈 Manager Dashboard & Reports"
      subtitle="Comprehensive analytics and reporting for employee management"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Admin', href: '/admin' },
        { label: 'Reports', isActive: true }
      ]}
      headerActions={
        <div className="flex space-x-3">
          <button
            onClick={() => window.print()}
            className="btn-secondary"
          >
            Print Report
          </button>
          <button
            onClick={() => dashboardData && exportToCSV([dashboardData.employees], 'employee_metrics')}
            className="btn-primary"
          >
            Export Data
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Time Period
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="input w-full"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
                <option value="all">All Time</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Business Filter
              </label>
              <select
                value={selectedBusiness}
                onChange={(e) => setSelectedBusiness(e.target.value)}
                className="input w-full"
              >
                <option value="">All Businesses</option>
                {businesses.map(business => (
                  <option key={business.id} value={business.id}>
                    {business.name} ({business.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button 
                onClick={fetchDashboardData}
                className="btn-secondary w-full"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh Data'}
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-secondary">Loading dashboard data...</p>
          </div>
        ) : !dashboardData ? (
          <div className="text-center py-12">
            <p className="text-secondary">Failed to load dashboard data.</p>
          </div>
        ) : (
          <>
            {/* Employee Overview */}
            <div>
              <h2 className="text-xl font-semibold text-primary mb-4">Employee Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-blue-600 dark:text-blue-300 text-lg font-semibold">👥</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{formatNumber(dashboardData.employees.totalEmployees)}</p>
                      <p className="text-sm text-secondary">Total Employees</p>
                      <p className="text-xs text-secondary">
                        {dashboardData.employees.activeEmployees} active, {dashboardData.employees.inactiveEmployees} inactive
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-green-600 dark:text-green-300 text-lg font-semibold">📈</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{formatNumber(dashboardData.employees.newHiresThisMonth)}</p>
                      <p className="text-sm text-secondary">New Hires (Month)</p>
                      <p className="text-xs text-secondary">
                        {dashboardData.employees.newHiresThisYear} this year
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-800 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-yellow-600 dark:text-yellow-300 text-lg font-semibold">📅</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{dashboardData.employees.averageTenure.toFixed(1)}</p>
                      <p className="text-sm text-secondary">Avg Tenure (Years)</p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-800 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-red-600 dark:text-red-300 text-lg font-semibold">📉</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{formatNumber(dashboardData.employees.terminationsThisMonth)}</p>
                      <p className="text-sm text-secondary">Terminations (Month)</p>
                      <p className="text-xs text-secondary">
                        {dashboardData.employees.terminationsThisYear} this year
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Employee Distribution Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* By Department */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-primary mb-4">Employees by Department</h3>
                  <div className="space-y-3">
                    {dashboardData.employees.employeesByDepartment.map((dept, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-secondary">
                          {dept.department || 'Unassigned'}
                        </span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ 
                                width: `${calculatePercentage(dept.count, dashboardData.employees.totalEmployees)}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-primary w-8">{dept.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* By Business */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-primary mb-4">Employees by Business</h3>
                  <div className="space-y-3">
                    {dashboardData.employees.employeesByBusiness.map((business, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-secondary">{business.businessName}</span>
                          <span className="text-xs text-secondary block capitalize">
                            {business.businessType}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ 
                                width: `${calculatePercentage(business.count, dashboardData.employees.totalEmployees)}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-primary w-8">{business.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Contract Analytics */}
            <div>
              <h2 className="text-xl font-semibold text-primary mb-4">Contract Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-800 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-purple-600 dark:text-purple-300 text-lg font-semibold">📋</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{formatNumber(dashboardData.contracts.totalContracts)}</p>
                      <p className="text-sm text-secondary">Total Contracts</p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-green-600 dark:text-green-300 text-lg font-semibold">✅</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{formatNumber(dashboardData.contracts.activeContracts)}</p>
                      <p className="text-sm text-secondary">Active Contracts</p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-800 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-yellow-600 dark:text-yellow-300 text-lg font-semibold">⏳</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{formatNumber(dashboardData.contracts.pendingContracts)}</p>
                      <p className="text-sm text-secondary">Pending Approval</p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-green-600 dark:text-green-300 text-lg font-semibold">💰</span>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-primary">{formatCurrency(dashboardData.contracts.averageContractValue)}</p>
                      <p className="text-sm text-secondary">Avg Contract Value</p>
                      <p className="text-xs text-secondary">
                        {formatCurrency(dashboardData.contracts.totalContractValue)} total
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Disciplinary Actions */}
            <div>
              <h2 className="text-xl font-semibold text-primary mb-4">Disciplinary Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-800 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-orange-600 dark:text-orange-300 text-lg font-semibold">⚠️</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{formatNumber(dashboardData.disciplinary.totalActions)}</p>
                      <p className="text-sm text-secondary">Total Actions</p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-800 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-red-600 dark:text-red-300 text-lg font-semibold">🔥</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{formatNumber(dashboardData.disciplinary.openActions)}</p>
                      <p className="text-sm text-secondary">Open Actions</p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-800 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-red-600 dark:text-red-300 text-lg font-semibold">🚨</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{formatNumber(dashboardData.disciplinary.overdueActions)}</p>
                      <p className="text-sm text-secondary">Overdue</p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-green-600 dark:text-green-300 text-lg font-semibold">✅</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{formatNumber(dashboardData.disciplinary.resolvedActions)}</p>
                      <p className="text-sm text-secondary">Resolved</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Disciplinary Actions by Type */}
              <div className="card p-6 mb-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Actions by Type</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {dashboardData.disciplinary.actionsByType.map((type, index) => (
                    <div key={index} className="text-center">
                      <p className="text-2xl font-bold text-primary">{type.count}</p>
                      <p className="text-sm text-secondary">{type.type}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Benefits Overview */}
            <div>
              <h2 className="text-xl font-semibold text-primary mb-4">Benefits Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-blue-600 dark:text-blue-300 text-lg font-semibold">🎁</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{formatNumber(dashboardData.benefits.totalBenefitTypes)}</p>
                      <p className="text-sm text-secondary">Benefit Types</p>
                      <p className="text-xs text-secondary">
                        {dashboardData.benefits.activeBenefitTypes} active
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-green-600 dark:text-green-300 text-lg font-semibold">💰</span>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-primary">{formatCurrency(dashboardData.benefits.totalBenefitValue)}</p>
                      <p className="text-sm text-secondary">Total Benefits Value</p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-800 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-purple-600 dark:text-purple-300 text-lg font-semibold">👤</span>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-primary">{formatCurrency(dashboardData.benefits.averageBenefitsPerEmployee)}</p>
                      <p className="text-sm text-secondary">Avg per Employee</p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-primary">Benefits Utilization</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {calculatePercentage(dashboardData.benefits.activeBenefitTypes, dashboardData.benefits.totalBenefitTypes)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button 
                  onClick={() => window.location.href = '/employees'}
                  className="btn-secondary text-center p-4"
                >
                  View All Employees
                </button>
                <button 
                  onClick={() => window.location.href = '/admin/hierarchy'}
                  className="btn-secondary text-center p-4"
                >
                  Manage Hierarchy
                </button>
                <button 
                  onClick={() => window.location.href = '/admin/disciplinary'}
                  className="btn-secondary text-center p-4"
                >
                  Disciplinary Actions
                </button>
                <button 
                  onClick={() => window.location.href = '/admin/benefits'}
                  className="btn-secondary text-center p-4"
                >
                  Benefits Management
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </ContentLayout>
  )
}