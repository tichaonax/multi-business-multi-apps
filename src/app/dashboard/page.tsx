'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { useSession } from 'next-auth/react'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ExpenseDetailModal } from '@/components/personal/expense-detail-modal'
import { OrderDetailModal } from '@/components/restaurant/order-detail-modal'
import { ProjectDetailModal } from '@/components/construction/project-detail-modal'
import { TransactionDetailModal } from '@/components/construction/transaction-detail-modal'
import { BusinessOrderDetailModal } from '@/components/business/business-order-detail-modal'
import { UserEditModal } from '@/components/user-management/user-edit-modal'
import { hasUserPermission, isSystemAdmin, SessionUser } from '@/lib/permission-utils'
import HealthIndicator from '@/components/ui/health-indicator'
import { LaybyAlertsWidget } from '@/components/laybys/layby-alerts-widget'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useAlert } from '@/components/ui/confirm-modal'

export default function Dashboard() {
  const { data: session } = useSession()
  const customAlert = useAlert()
  const { currentBusiness } = useBusinessPermissionsContext()
  const currentUser = session?.user as any
  const businessId = currentBusiness?.businessId
  const [stats, setStats] = useState({
    activeProjects: 0,
    totalRevenue: 0,
    teamMembers: 1,
    pendingTasks: 0
  })
  const [statsLoading, setStatsLoading] = useState<boolean>(true)
  const [showPendingTasks, setShowPendingTasks] = useState<boolean>(false)
  const [pendingTasks, setPendingTasks] = useState<any[]>([])
  const [showRevenueBreakdown, setShowRevenueBreakdown] = useState<boolean>(false)
  const [revenueBreakdown, setRevenueBreakdown] = useState<any>(null)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [activityLoading, setActivityLoading] = useState<boolean>(true)
  const [activitySearchTerm, setActivitySearchTerm] = useState<string>('')
  const [activityFinancialSummary, setActivityFinancialSummary] = useState<any>(null)

  // Activity filter states
  const [activityFilterScope, setActivityFilterScope] = useState<string>('my') // 'my', 'all', 'user', 'business'
  const [activityFilterUserId, setActivityFilterUserId] = useState<string>('')
  const [activityFilterBusinessId, setActivityFilterBusinessId] = useState<string>('')
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [availableBusinesses, setAvailableBusinesses] = useState<any[]>([])
  const [activityDisplayLimit, setActivityDisplayLimit] = useState<number>(8)
  const [showTeamBreakdown, setShowTeamBreakdown] = useState<boolean>(false)
  const [teamBreakdown, setTeamBreakdown] = useState<any>(null)
  const [showActiveProjects, setShowActiveProjects] = useState<boolean>(false)
  const [activeProjects, setActiveProjects] = useState<any>(null)
  const [projectsFilter, setProjectsFilter] = useState<string>('all')

  // Modal states for detail views
  const [selectedExpense, setSelectedExpense] = useState<any>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
  const [selectedBusinessOrderId, setSelectedBusinessOrderId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showExpenseModal, setShowExpenseModal] = useState<boolean>(false)
  const [showOrderModal, setShowOrderModal] = useState<boolean>(false)
  const [showProjectModal, setShowProjectModal] = useState<boolean>(false)
  const [showTransactionModal, setShowTransactionModal] = useState<boolean>(false)
  const [showBusinessOrderModal, setShowBusinessOrderModal] = useState<boolean>(false)
  const [showUserModal, setShowUserModal] = useState<boolean>(false)

  // Fetch available users for filtering (admin only)
  const fetchAvailableUsers = async () => {
    if (session?.user?.role !== 'admin') return

    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const users = await response.json()
        // API returns users directly as array, not wrapped in an object
        setAvailableUsers(Array.isArray(users) ? users : [])
      }
    } catch (error) {
      console.error('Failed to fetch available users:', error)
    }
  }

  // Fetch available businesses for filtering
  const fetchAvailableBusinesses = async () => {
    try {
      const response = await fetch('/api/businesses')
      if (response.ok) {
        const data = await response.json()
        // API returns different structures for admin vs regular users
        // Admin: { businesses: [...] }, Regular: [...] directly
        if (Array.isArray(data)) {
          setAvailableBusinesses(data)
        } else if (data.businesses && Array.isArray(data.businesses)) {
          setAvailableBusinesses(data.businesses)
        } else {
          setAvailableBusinesses([])
        }
      }
    } catch (error) {
      console.error('Failed to fetch available businesses:', error)
    }
  }

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
      } finally {
        setStatsLoading(false)
      }
    }

    if (currentUser) {
      fetchStats()
      fetchRecentActivity()
      fetchAvailableUsers()
      fetchAvailableBusinesses()
    }
  }, [session])

  // Auto-apply filter when scope changes
  useEffect(() => {
    if (currentUser) {
      setActivityLoading(true)
      setActivityDisplayLimit(8) // Reset display limit when filter changes
      fetchRecentActivity()
    }
  }, [activityFilterScope, activityFilterUserId, activityFilterBusinessId])

  // Fetch detailed pending tasks when modal is opened
  const fetchPendingTasksDetails = async () => {
    try {
      const response = await fetch('/api/pending-tasks')
      if (response.ok) {
        const data = await response.json()
        setPendingTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Failed to fetch pending tasks details:', error)
    }
  }

  // Fetch detailed revenue breakdown when modal is opened
  const fetchRevenueBreakdown = async () => {
    try {
      const response = await fetch('/api/dashboard/revenue-breakdown')
      if (response.ok) {
        const data = await response.json()
        setRevenueBreakdown(data)
      }
    } catch (error) {
      console.error('Failed to fetch revenue breakdown:', error)
    }
  }

  // Fetch recent activity
  const fetchRecentActivity = async () => {
    try {
      // Build query parameters for filtering
      const params = new URLSearchParams()
      params.append('scope', activityFilterScope)

      if (activityFilterScope === 'user' && activityFilterUserId) {
        params.append('userId', activityFilterUserId)
      }

      if (activityFilterScope === 'business' && activityFilterBusinessId) {
        params.append('businessId', activityFilterBusinessId)
      }

      const apiUrl = `/api/dashboard/recent-activity?${params.toString()}`

      // Debug logging
      console.log('🔍 Frontend fetchRecentActivity called with:')
      console.log('  - activityFilterScope:', activityFilterScope)
      console.log('  - activityFilterUserId:', activityFilterUserId)
      console.log('  - activityFilterBusinessId:', activityFilterBusinessId)
      console.log('  - apiUrl:', apiUrl)

      const response = await fetch(apiUrl)
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Recent activity API response received:', data)
        setRecentActivity(data.activities || [])
        setActivityFinancialSummary(data.financialSummary || null)
      } else {
        console.error('❌ Recent activity API response failed:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch recent activity:', error)
    } finally {
      setActivityLoading(false)
    }
  }

  // Reset activity filters to default values
  const resetActivityFilters = () => {
    setActivityFilterScope('my')
    setActivityFilterUserId('')
    setActivityFilterBusinessId('')
    setActivityDisplayLimit(8) // Reset display limit as well
  }

  // Fetch team breakdown when modal is opened
  const fetchTeamBreakdown = async () => {
    try {
      const response = await fetch('/api/dashboard/team-breakdown')
      if (response.ok) {
        const data = await response.json()
        setTeamBreakdown(data)
      }
    } catch (error) {
      console.error('Failed to fetch team breakdown:', error)
    }
  }

  const fetchActiveProjects = async (filter: string = 'all') => {
    try {
      const url = `/api/dashboard/active-projects${filter !== 'all' ? `?filter=${filter}` : ''}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setActiveProjects(data)
      }
    } catch (error) {
      console.error('Failed to fetch active projects:', error)
    }
  }

  // Helper function to open appropriate modal based on activity type
  const handleActivityClick = async (activity: any) => {
    // Check if user has access to this activity
    if (activity.linkAccess && !activity.linkAccess.hasAccess) {
      await customAlert({ title: 'Access Denied', description: activity.linkAccess.reason || 'You do not have permission to view this item.' })
      return
    }

    // Extract ID from activity.id (format: "type-id")
    const parts = activity.id.split('-')
    const entityId = parts.slice(1).join('-') // Handle IDs that might contain dashes

    switch (activity.type) {
      case 'expense':
      case 'income':
        // Fetch full expense data on demand before opening modal
        try {
          const response = await fetch(`/api/personal/expenses/${entityId}`)
          if (response.ok) {
            const fullExpenseData = await response.json()
            setSelectedExpense(fullExpenseData)
            setShowExpenseModal(true)
          } else if (response.status === 403) {
            await customAlert({ title: 'Access Denied', description: 'You do not have permission to view this expense.' })
          } else if (response.status === 404) {
            await customAlert({ title: 'Not Found', description: 'Expense not found or has been deleted.' })
          } else {
            await customAlert({ title: 'Load Failed', description: 'Failed to load expense details. Please try again.' })
            console.error('Failed to fetch expense details')
          }
        } catch (error) {
    await customAlert({ title: 'Network Error', description: 'Please check your connection and try again.' })
    console.error('Error fetching expense details:', error)
        }
        break
      case 'order':
        // Check business access for orders
        if (activity.businessInfo && !activity.businessInfo.userHasAccess) {
          await customAlert({ title: 'Access Denied', description: `You do not have access to ${activity.businessInfo.businessName} orders.` })
          return
        }
        setSelectedOrderId(entityId)
        setShowOrderModal(true)
        break
      case 'project':
        setSelectedProjectId(entityId)
        setShowProjectModal(true)
        break
      case 'transaction':
        setSelectedTransactionId(entityId)
        setShowTransactionModal(true)
        break
      case 'business_order':
        setSelectedBusinessOrderId(entityId)
        setShowBusinessOrderModal(true)
        break
      case 'user_created':
        // Fetch user data and open UserEditModal
        try {
          const response = await fetch(`/api/admin/users/${entityId}`)
          if (response.ok) {
            const userData = await response.json()
            setSelectedUser(userData)
            setShowUserModal(true)
            } else if (response.status === 403) {
            await customAlert({ title: 'Access Denied', description: 'You do not have permission to view this user.' })
          } else if (response.status === 404) {
            await customAlert({ title: 'Not Found', description: 'User not found or has been deleted.' })
          } else {
            await customAlert({ title: 'Load Failed', description: 'Failed to load user details. Please try again.' })
            console.error('Failed to fetch user details')
          }
        } catch (error) {
    await customAlert({ title: 'Network Error', description: 'Please check your connection and try again.' })
    console.error('Error fetching user details:', error)
        }
        break
      default:
        console.warn('Unknown activity type:', activity.type)
        // Fallback to link navigation if available
        if (activity.link) {
          window.open(activity.link, '_blank')
        }
    }
  }

  // Helper functions to close modals
  const closeExpenseModal = () => {
    setShowExpenseModal(false)
    setSelectedExpense(null)
  }

  const closeOrderModal = () => {
    setShowOrderModal(false)
    setSelectedOrderId(null)
  }

  const closeProjectModal = () => {
    setShowProjectModal(false)
    setSelectedProjectId(null)
  }

  const closeTransactionModal = () => {
    setShowTransactionModal(false)
    setSelectedTransactionId(null)
  }

  const closeBusinessOrderModal = () => {
    setShowBusinessOrderModal(false)
    setSelectedBusinessOrderId(null)
  }

  const closeUserModal = () => {
    setShowUserModal(false)
    setSelectedUser(null)
  }

  // Auto-refresh stats every 60 seconds
  useEffect(() => {
    if (!session?.user) return

    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to refresh stats:', error)
      }
    }, 60000) // 60 seconds

    return () => clearInterval(interval)
  }, [session])

  // Check if user is a driver (only has driver trip/maintenance permissions)
  const isDriver = currentUser &&
    hasUserPermission(currentUser, 'canLogDriverTrips') &&
    hasUserPermission(currentUser, 'canLogDriverMaintenance') &&
    !hasUserPermission(currentUser, 'canAccessPersonalFinance') &&
    !isSystemAdmin(currentUser)

  return (
    <ProtectedRoute>
      {/* Health Status Indicator */}
      <HealthIndicator position="bottom-right" />

      <MainLayout>
        <ContentLayout
          title={`🏠 Welcome back, ${session?.user?.name}!`}
          subtitle={isDriver
            ? "Your driver dashboard - log trips and maintenance for your authorized vehicles."
            : "Here's what's happening across your business operations today."
          }
          breadcrumb={[
            { label: 'Business Hub', href: '/dashboard' },
            { label: 'Home', isActive: true }
          ]}
        >

        {isDriver ? (
          // Driver-specific dashboard
          <>
            {/* Driver Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
              <Link href="/driver/trips" className="card p-6 hover:shadow-lg transition-shadow text-center">
                <div className="text-4xl mb-3">🚗</div>
                <h3 className="text-lg font-semibold text-primary mb-2">Log Trip</h3>
                <p className="text-sm text-secondary">Record a new trip for your assigned vehicle</p>
              </Link>

              <Link href="/driver/maintenance" className="card p-6 hover:shadow-lg transition-shadow text-center">
                <div className="text-4xl mb-3">🔧</div>
                <h3 className="text-lg font-semibold text-primary mb-2">Log Maintenance</h3>
                <p className="text-sm text-secondary">Report maintenance needs or completed services</p>
              </Link>

              <Link href="/driver" className="card p-6 hover:shadow-lg transition-shadow text-center">
                <div className="text-4xl mb-3">📋</div>
                <h3 className="text-lg font-semibold text-primary mb-2">Driver Portal</h3>
                <p className="text-sm text-secondary">Access your authorized vehicles and portal</p>
              </Link>
            </div>

            {/* Driver Info */}
            <div className="card p-6 mb-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Driver Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-secondary mb-1">Driver Name</p>
                  <p className="font-medium text-primary">{session?.user?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary mb-1">Account Type</p>
                  <p className="font-medium text-primary">Driver Account</p>
                </div>
              </div>
            </div>

            {/* Team Chat Section */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-primary">Team Chat</h3>
                <Link href="/chat" className="btn-primary">
                  Open Chat
                </Link>
              </div>
              <p className="text-secondary">
                Stay connected with your team. Report issues, ask questions, or coordinate with fleet managers.
              </p>
            </div>
          </>
        ) : (
          // Regular dashboard for non-drivers
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div
            className="card p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => {
              setShowRevenueBreakdown(true)
              fetchRevenueBreakdown()
            }}
          >
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary">Total Revenue</p>
                <p className="text-2xl font-bold text-primary">
                  {statsLoading ? '...' : `$${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </p>
              </div>
            </div>
            {stats.totalRevenue > 0 && (
              <div className="mt-2 text-xs text-blue-600">
                Click to view breakdown
              </div>
            )}
          </div>

          <div
            onClick={() => {
              setShowActiveProjects(true)
              fetchActiveProjects(projectsFilter)
            }}
            className="card p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary">Active Projects</p>
                <p className="text-2xl font-bold text-primary">
                  {statsLoading ? '...' : stats.activeProjects}
                </p>
              </div>
            </div>
            {stats.activeProjects > 0 && (
              <div className="mt-2 text-xs text-green-600">
                Click to view details
              </div>
            )}
          </div>
          
          <div
            className="card p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => {
              setShowPendingTasks(true)
              fetchPendingTasksDetails()
            }}
          >
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-2xl">⏰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary">Pending Tasks</p>
                <p className="text-2xl font-bold text-primary">
                  {statsLoading ? '...' : stats.pendingTasks}
                </p>
              </div>
            </div>
            {stats.pendingTasks > 0 && (
              <div className="mt-2 text-xs text-yellow-600">
                Click to view details
              </div>
            )}
          </div>

          <div
            className="card p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => {
              setShowTeamBreakdown(true)
              fetchTeamBreakdown()
            }}
          >
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary">Team Members</p>
                <p className="text-2xl font-bold text-primary">
                  {statsLoading ? '...' : stats.teamMembers}
                </p>
              </div>
            </div>
            {stats.teamMembers > 0 && (
              <div className="mt-2 text-xs text-purple-600">
                Click to view breakdown
              </div>
            )}
          </div>
        </div>

        {/* Layby Alerts Widget */}
        <div className="mt-6">
          <LaybyAlertsWidget businessId={businessId} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 mt-6">
          <div className="card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-primary">Recent Activity</h3>
                {activityFinancialSummary && (
                  <div className="text-sm text-gray-600 mt-1 flex flex-wrap items-center gap-2 sm:gap-4">
                    <span>
                      Revenue: <span className="text-green-600 font-medium">${activityFinancialSummary.totalRevenue.toFixed(2)}</span>
                    </span>
                    <span className="hidden sm:inline">|</span>
                    <span>
                      Expenses: <span className="text-red-600 font-medium">${activityFinancialSummary.totalExpenses.toFixed(2)}</span>
                    </span>
                    <span className="hidden sm:inline">|</span>
                    <span>
                      Net: <span className={`font-medium ${activityFinancialSummary.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${activityFinancialSummary.netAmount.toFixed(2)}
                      </span>
                    </span>
                    {activityFinancialSummary.hasRestrictedData && (
                      <>
                        <span className="hidden sm:inline">|</span>
                        <span className="text-orange-600 text-xs">* Some data restricted</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <span className="text-sm text-gray-500">Last 7 days</span>
            </div>

            {/* Search Input */}
            {recentActivity.length > 0 && (
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search activity..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    value={activitySearchTerm}
                    onChange={(e) => setActivitySearchTerm(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <span className="text-gray-400 text-sm">🔍</span>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Controls */}
            <div className="mb-4 p-3 sm:p-4 card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🔽</span>
                  <span className="text-sm font-medium text-secondary">Filter Activities</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={resetActivityFilters}
                    className="px-2 py-1 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200 border border-gray-200 hover:border-blue-300"
                    title="Reset filters to default"
                  >
                    Reset
                  </button>
                  <span className="text-xs text-secondary">Auto-updates</span>
                </div>
              </div>

              {/* Main Filter Scope */}
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <label className="text-sm font-medium text-primary flex-shrink-0">View:</label>
                <select
                  value={activityFilterScope}
                  onChange={(e) => {
                    const newScope = e.target.value
                    setActivityFilterScope(newScope)
                    if (newScope !== 'user') {
                      setActivityFilterUserId('')
                    }
                    if (newScope !== 'business') {
                      setActivityFilterBusinessId('')
                    }
                  }}
                  className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="my">My Activities</option>
                  {session?.user?.role === 'admin' && <option value="all">All Activities</option>}
                  {session?.user?.role === 'admin' && <option value="user">By User</option>}
                  <option value="business">By Business</option>
                </select>
              </div>

              {/* User Selector (when scope is 'user') */}
              {activityFilterScope === 'user' && session?.user?.role === 'admin' && (
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <label className="text-sm font-medium text-primary flex-shrink-0">User:</label>
                  <select
                    value={activityFilterUserId}
                    onChange={(e) => setActivityFilterUserId(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">Select a user...</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Business Selector (when scope is 'business') */}
              {activityFilterScope === 'business' && (
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <label className="text-sm font-medium text-primary flex-shrink-0">Business:</label>
                  <select
                    value={activityFilterBusinessId}
                    onChange={(e) => setActivityFilterBusinessId(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">Select a business...</option>
                    {availableBusinesses.map((business) => (
                      <option key={business.id} value={business.id}>
                        {business.name} ({business.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Filter Status Indicator */}
              {(activityFilterScope !== 'my' || (activityFilterScope === 'user' && activityFilterUserId) || (activityFilterScope === 'business' && activityFilterBusinessId)) && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="text-xs text-blue-600 flex items-center space-x-1">
                    <span>📊</span>
                    <span>
                      {activityFilterScope === 'all' ? 'Showing all system activities' :
                       activityFilterScope === 'user' && activityFilterUserId ? 'Showing activities for selected user' :
                       activityFilterScope === 'business' && activityFilterBusinessId ? 'Showing activities for selected business' :
                       'Custom filter active'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {activityLoading ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">⏳</div>
                  <p className="text-sm text-gray-500">Loading recent activity...</p>
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="flex items-center space-x-3 py-3 border-b border-gray-100 last:border-b-0">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-sm">🎯</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary">System initialized</p>
                    <p className="text-xs text-gray-500">Welcome to your new business management platform</p>
                  </div>
                  <span className="text-xs text-gray-400">Today</span>
                </div>
              ) : (
                (() => {
                  // Filter activities based on search term
                  const filteredActivities = recentActivity.filter(activity =>
                    activitySearchTerm === '' ||
                    activity.title.toLowerCase().includes(activitySearchTerm.toLowerCase()) ||
                    activity.description.toLowerCase().includes(activitySearchTerm.toLowerCase()) ||
                    activity.module.toLowerCase().includes(activitySearchTerm.toLowerCase()) ||
                    activity.status.toLowerCase().includes(activitySearchTerm.toLowerCase())
                  )

                  const displayActivities = filteredActivities.slice(0, activityDisplayLimit)

                  if (filteredActivities.length === 0 && activitySearchTerm !== '') {
                    return (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-4">🔍</div>
                        <p className="text-sm text-gray-500">No activities found matching "{activitySearchTerm}"</p>
                        <button
                          onClick={() => setActivitySearchTerm('')}
                          className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                        >
                          Clear search
                        </button>
                      </div>
                    )
                  }

                  return displayActivities.map((activity) => {
                    // Check if this activity has modal support
                    const hasModalSupport = ['expense', 'income', 'order', 'project', 'transaction', 'business_order'].includes(activity.type)
                    const isClickable = hasModalSupport || !!activity.link

                    return (
                      <div
                        key={activity.id}
                        onClick={() => isClickable ? handleActivityClick(activity) : undefined}
                        className={`flex items-center space-x-3 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                          isClickable ? 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors rounded-md px-2 -mx-2' : ''
                        }`}
                      >
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm">{activity.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium text-primary truncate ${isClickable ? 'group-hover:text-blue-600' : ''}`}>
                            {activity.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{activity.description}</p>
                          <p className="text-xs text-blue-600 capitalize">{activity.module}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs text-gray-400">
                            {new Date(activity.createdAt).toLocaleDateString()}
                          </span>
                          <div className="text-xs">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                              activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              activity.status === 'active' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {activity.status}
                            </span>
                          </div>
                          {isClickable && (
                            <div className="text-xs text-gray-400 mt-1">
                              {hasModalSupport ? 'Click to view details →' : 'Click to view →'}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                })()
              )}

              {(() => {
                const filteredActivities = recentActivity.filter(activity =>
                  activitySearchTerm === '' ||
                  activity.title.toLowerCase().includes(activitySearchTerm.toLowerCase()) ||
                  activity.description.toLowerCase().includes(activitySearchTerm.toLowerCase()) ||
                  activity.module.toLowerCase().includes(activitySearchTerm.toLowerCase()) ||
                  activity.status.toLowerCase().includes(activitySearchTerm.toLowerCase())
                )

                if (filteredActivities.length > activityDisplayLimit || (activitySearchTerm && filteredActivities.length > 0)) {
                  return (
                    <div className="text-center pt-4 border-t border-gray-100">
                      {activitySearchTerm ? (
                        <div className="text-sm text-gray-600">
                          Showing {Math.min(activityDisplayLimit, filteredActivities.length)} of {filteredActivities.length} matching activities
                          {filteredActivities.length > activityDisplayLimit && (
                            <div className="mt-2">
                              <button
                                onClick={() => setActivityDisplayLimit(prev => prev + 10)}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                              >
                                Load 10 more activities →
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => setActivityDisplayLimit(prev => prev + 10)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Load 10 more activities →
                        </button>
                      )}
                    </div>
                  )
                }
                return null
              })()}
            </div>
          </div>
          
          <div className="card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href="/projects/new" className="p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center">
                <div className="text-2xl mb-2">🏗️</div>
                <p className="text-sm font-medium text-gray-700">New Project</p>
              </Link>
              <Link href="/personal/new" className="p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-center">
                <div className="text-2xl mb-2">📝</div>
                <p className="text-sm font-medium text-gray-700">Add Transaction</p>
              </Link>
              <Link href="/contractors" className="p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors text-center">
                <div className="text-2xl mb-2">🔨</div>
                <p className="text-sm font-medium text-gray-700">Manage Contractors</p>
              </Link>
              <Link href="/reports" className="p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-yellow-300 hover:bg-yellow-50 transition-colors text-center">
                <div className="text-2xl mb-2">📊</div>
                <p className="text-sm font-medium text-gray-700">View Reports</p>
              </Link>
            </div>
          </div>
        </div>
            </>
          )}
        </ContentLayout>
      </MainLayout>

      {/* Pending Tasks Modal */}
      {showPendingTasks && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Pending Tasks ({stats.pendingTasks})
              </h2>
              <button
                onClick={() => setShowPendingTasks(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {pendingTasks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">All caught up!</h3>
                  <p className="text-gray-500 dark:text-gray-400">You have no pending tasks at the moment.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              task.priority === 'high'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                : task.priority === 'medium'
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                                : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            }`}>
                              {task.priority}
                            </span>
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                              {task.module}
                            </span>
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full">
                              {task.type.replace('_', ' ')}
                            </span>
                          </div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">{task.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{task.description}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Created: {new Date(task.createdAt).toLocaleDateString()} at {' '}
                            {new Date(task.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="ml-4 flex flex-col gap-2">
                          {task.type === 'order' && (
                            <Link
                              href={`/restaurant/orders`}
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                              onClick={() => setShowPendingTasks(false)}
                            >
                              View Order
                            </Link>
                          )}
                          {(task.type === 'project_stage' || task.type === 'project_transaction') && (
                            <Link
                              href={`/projects/${task.projectId}`}
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                              onClick={() => setShowPendingTasks(false)}
                            >
                              View Project
                            </Link>
                          )}
                          {(task.type === 'leave_request' || task.type === 'contract_renewal') && (
                            <Link
                              href={`/employees/${task.employeeId}`}
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                              onClick={() => setShowPendingTasks(false)}
                            >
                              View Employee
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Revenue Breakdown Modal */}
      {showRevenueBreakdown && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Revenue Breakdown - ${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <button
                onClick={() => setShowRevenueBreakdown(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {!revenueBreakdown ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📊</div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Loading revenue breakdown...</h3>
                  <p className="text-gray-500 dark:text-gray-400">Please wait while we analyze your revenue sources.</p>
                </div>
              ) : revenueBreakdown.total === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">💰</div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No revenue yet</h3>
                  <p className="text-gray-500 dark:text-gray-400">Start generating revenue by completing orders, projects, or adding income transactions.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Restaurant Revenue */}
                    {revenueBreakdown.restaurant && (
                      <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">🍽️</span>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">Restaurant Orders</h4>
                          </div>
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {revenueBreakdown.restaurant.percentage?.toFixed(1)}%
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Revenue:</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">${revenueBreakdown.restaurant.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Orders:</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{revenueBreakdown.restaurant.count}</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div
                              className="bg-orange-500 h-2 rounded-full"
                              style={{ width: `${revenueBreakdown.restaurant.percentage || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Business Revenue */}
                    {revenueBreakdown.business && (
                      <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">🏪</span>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">Business Sales</h4>
                          </div>
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {revenueBreakdown.businesses.percentage?.toFixed(1)}%
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Revenue:</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">${revenueBreakdown.businesses.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Orders:</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{revenueBreakdown.businesses.count}</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${revenueBreakdown.businesses.percentage || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Project Revenue */}
                    {revenueBreakdown.projects && (
                      <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">🏗️</span>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">Project Income</h4>
                          </div>
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {revenueBreakdown.projects.percentage?.toFixed(1)}%
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Revenue:</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">${revenueBreakdown.projects.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Transactions:</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{revenueBreakdown.projects.count}</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${revenueBreakdown.projects.percentage || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Personal Revenue */}
                    {revenueBreakdown.personal && (
                      <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">👤</span>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">Personal Income</h4>
                          </div>
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {revenueBreakdown.personal.percentage?.toFixed(1)}%
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Revenue:</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">${revenueBreakdown.personal.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Transactions:</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{revenueBreakdown.personal.count}</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div
                              className="bg-purple-500 h-2 rounded-full"
                              style={{ width: `${revenueBreakdown.personal.percentage || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Summary Section */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mt-6">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Revenue Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-orange-600">
                          ${revenueBreakdown.restaurant?.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Restaurant</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          ${revenueBreakdown.businesses?.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Business</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          ${revenueBreakdown.projects?.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Projects</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">
                          ${revenueBreakdown.personal?.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Personal</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Team Breakdown Modal */}
      {showTeamBreakdown && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Team Members Breakdown ({stats.teamMembers} total)
              </h2>
              <button
                onClick={() => setShowTeamBreakdown(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {!teamBreakdown ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">👥</div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Loading team breakdown...</h3>
                  <p className="text-gray-500 dark:text-gray-400">Please wait while we analyze your team structure.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{teamBreakdown.summary?.totalUsers || 0}</div>
                      <div className="text-sm text-blue-800 dark:text-blue-300">Team Members</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{teamBreakdown.summary?.businessCount || 0}</div>
                      <div className="text-sm text-purple-800 dark:text-purple-300">Active Businesses</div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{teamBreakdown.summary?.averageTeamSizePerBusiness || 0}</div>
                      <div className="text-sm text-orange-800 dark:text-orange-300">Avg per Business</div>
                    </div>
                  </div>

                  {/* Business Breakdown */}
                  {teamBreakdown.breakdown?.businessBreakdown && Object.keys(teamBreakdown.breakdown.businessBreakdown).length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Team by Business</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(teamBreakdown.breakdown.businessBreakdown).map(([businessId, business]: [string, any]) => (
                          <div key={businessId} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h5 className="font-medium text-gray-900 dark:text-gray-100">{business.businessName}</h5>
                                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{business.businessType}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{business.users + business.employees}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Total Members</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2 text-center">
                                <div className="font-medium text-blue-600 dark:text-blue-400">{business.users}</div>
                                <div className="text-blue-800 dark:text-blue-300 text-xs">Users</div>
                              </div>
                              <div className="bg-green-50 dark:bg-green-900/20 rounded p-2 text-center">
                                <div className="font-medium text-green-600 dark:text-green-400">{business.employees}</div>
                                <div className="text-green-800 dark:text-green-300 text-xs">Employees</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Role Distribution */}
                  {teamBreakdown.breakdown?.roles && Object.keys(teamBreakdown.breakdown.roles).length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Role Distribution</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(teamBreakdown.breakdown.roles).map(([role, count]: [string, any]) => (
                          <div key={role} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{count}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">{role}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Enhanced System Users List */}
                  {teamBreakdown.breakdown?.users?.list && teamBreakdown.breakdown.users.list.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Team Members ({teamBreakdown.breakdown.users.count})</h4>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg max-h-96 overflow-y-auto">
                        <div className="space-y-3 p-4">
                          {teamBreakdown.breakdown.users.list.map((user: any) => {
                            // Derive a unified list of businesses to render. Keep backwards compatibility with `user.businesses`.
                            const allBusinesses = (user.businesses && user.businesses.length > 0)
                              ? user.businesses.map((b: any, i: number) => ({
                                  id: b.businessName ? `${b.businessName}-${i}` : `b-${i}`,
                                  name: b.businessName,
                                  type: b.businessType,
                                  role: b.role,
                                  isPrimary: user.primaryBusiness && user.primaryBusiness.name === b.businessName
                                }))
                              : [
                                  // primary first (if present)
                                  ...(user.primaryBusiness ? [{
                                    id: user.primaryBusiness.id || `p-${user.id}`,
                                    name: user.primaryBusiness.name,
                                    type: user.primaryBusiness.type,
                                    role: user.primaryBusiness.role,
                                    isPrimary: true
                                  }] : []),
                                  // then other businesses (if any)
                                  ...(user.otherBusinesses || []).map((b: any, i: number) => ({
                                    id: b.id || `${b.name}-${i}`,
                                    name: b.name,
                                    type: b.type,
                                    role: b.role,
                                    isPrimary: false
                                  }))
                                ]

                            return (
                              <div key={user.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                                {/* User Header */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900 dark:text-gray-100">{user.name}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium text-blue-600 dark:text-blue-400 capitalize">{user.role}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {user.businessCount} business{user.businessCount !== 1 ? 'es' : ''}
                                    </div>
                                  </div>
                                </div>

                                {/* Business Assignments - unified list */}
                                <div className="space-y-1">
                                  {allBusinesses && allBusinesses.length > 0 ? (
                                    allBusinesses.map((business: any, idx: number) => (
                                      <div
                                        key={business.id || idx}
                                        className={`${business.isPrimary ? 'flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md' : 'flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md'}`}
                                      >
                                        <div className="flex items-center space-x-2">
                                          <span className={`text-xs px-2 py-1 rounded-full ${business.isPrimary ? 'bg-blue-600 text-white' : 'bg-gray-500 text-white'}`}>{business.isPrimary ? 'PRIMARY' : 'OTHER'}</span>
                                          <span className={`text-sm ${business.isPrimary ? 'text-blue-900 dark:text-blue-100' : 'text-gray-700 dark:text-gray-300'}`}>{business.name}</span>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">{business.type}</div>
                                          <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{business.role}</div>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="p-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md text-center">
                                      <span className="text-xs text-gray-500 dark:text-gray-400">No business assignments</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                          {teamBreakdown.breakdown.users.list.length > 10 && (
                            <div className="text-center pt-2">
                              <Link
                                href="/admin/users"
                                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                                onClick={() => setShowTeamBreakdown(false)}
                              >
                                View all {teamBreakdown.breakdown.users.count} users →
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Employees Section Hidden - Now consolidated under Team Members above */}

                  {/* No data state */}
                  {(!teamBreakdown.breakdown?.users?.list || teamBreakdown.breakdown.users.list.length === 0) &&
                   (!teamBreakdown.breakdown?.employees?.list || teamBreakdown.breakdown.employees.list.length === 0) && (
                    <div className="text-center py-8">
                      <div className="text-6xl mb-4">👥</div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No team members found</h3>
                      <p className="text-gray-500 dark:text-gray-400">Start by adding users or employees to your businesses.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active Projects Modal */}
      {showActiveProjects && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Active Projects ({stats.activeProjects} total)
              </h2>
              <button
                onClick={() => setShowActiveProjects(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              {!activeProjects ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-gray-500 dark:text-gray-400">Loading active projects...</p>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Filter Buttons */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {['all', 'own', 'business', 'personal'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => {
                          setProjectsFilter(filter)
                          fetchActiveProjects(filter)
                        }}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          projectsFilter === filter
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {filter === 'all' ? 'All Projects' :
                         filter === 'own' ? 'My Projects' :
                         filter === 'business' ? 'Business Projects' :
                         'Personal Projects'}
                      </button>
                    ))}
                  </div>
                  {/* Summary Statistics */}
                  {activeProjects.summary && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Budget</div>
                        <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                          ${activeProjects.summary.totalBudget.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                        <div className="text-sm font-medium text-green-700 dark:text-green-300">Total Spent</div>
                        <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                          ${activeProjects.summary.totalSpent.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                        <div className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Total Received</div>
                        <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                          ${activeProjects.summary.totalReceived.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                        <div className="text-sm font-medium text-purple-700 dark:text-purple-300">Avg Progress</div>
                        <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                          {activeProjects.summary.averageProgress.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Projects List */}
                  {activeProjects.projects && activeProjects.projects.length > 0 ? (
                    <div className="space-y-4">
                      {activeProjects.projects.map((project: any) => (
                        <div key={project.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{project.name}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{project.description || 'No description'}</p>
                              <div className="flex items-center mt-2 space-x-4">
                                {project.business ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                                    {project.businesses.businessName} ({project.businesses.businessType})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                    Personal Project
                                  </span>
                                )}
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {project.transactionCount} transaction{project.transactionCount !== 1 ? 's' : ''}
                                </span>
                                {project.createdBy && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    Created by: {project.createdBy.name}
                                    {project.isOwnProject && <span className="text-green-600 dark:text-green-400 ml-1">(You)</span>}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                ${project.totalCost.toLocaleString()}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">Budget</div>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-3">
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                              <span>Progress</span>
                              <span>{project.progressPercentage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(project.progressPercentage, 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Financial Summary */}
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="font-medium text-gray-700 dark:text-gray-300">Spent</div>
                              <div className="text-red-600 dark:text-red-400">${project.totalSpent.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="font-medium text-gray-700 dark:text-gray-300">Received</div>
                              <div className="text-green-600 dark:text-green-400">${project.totalReceived.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="font-medium text-gray-700 dark:text-gray-300">Remaining</div>
                              <div className={project.remainingBudget >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}>
                                ${project.remainingBudget.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-6xl mb-4">📂</div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No active projects</h3>
                      <p className="text-gray-500 dark:text-gray-400">Start by creating your first project to track progress and finances.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modals */}
      <ExpenseDetailModal
        expense={selectedExpense}
        isOpen={showExpenseModal}
        onClose={closeExpenseModal}
        onUpdate={() => {
          // Refresh recent activity after update
          fetchRecentActivity()
        }}
      />

      <OrderDetailModal
        orderId={selectedOrderId}
        isOpen={showOrderModal}
        onClose={closeOrderModal}
        onUpdate={() => {
          // Refresh recent activity after update
          fetchRecentActivity()
        }}
      />

      <ProjectDetailModal
        projectId={selectedProjectId}
        isOpen={showProjectModal}
        onClose={closeProjectModal}
        onUpdate={() => {
          // Refresh recent activity after update
          fetchRecentActivity()
        }}
      />

      <TransactionDetailModal
        transactionId={selectedTransactionId}
        isOpen={showTransactionModal}
        onClose={closeTransactionModal}
        onUpdate={() => {
          // Refresh recent activity after update
          fetchRecentActivity()
        }}
      />

      <BusinessOrderDetailModal
        orderId={selectedBusinessOrderId}
        isOpen={showBusinessOrderModal}
        onClose={closeBusinessOrderModal}
        onUpdate={() => {
          // Refresh recent activity after update
          fetchRecentActivity()
        }}
      />

      {selectedUser && session?.user && (
        <UserEditModal
          user={selectedUser}
          currentUser={session.user}
          onClose={closeUserModal}
          onSuccess={(message) => {
            // Refresh recent activity after update
            fetchRecentActivity()
            // Could show success message if needed
            console.log('User updated:', message)
          }}
          onError={async (error) => {
            // Handle error - show modal alert
            await customAlert({ title: 'Error', description: String(error) })
            console.error('User update error:', error)
          }}
        />
      )}
    </ProtectedRoute>
  )
}