'use client'

import React from 'react'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider } from '@/components/universal'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { isSystemAdmin, hasPermission } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

function HardwareContent({ session, businessId }: { session: any; businessId: string }) {
  const currentUser = session?.user as any
  const canManageLaybys = isSystemAdmin(currentUser) || hasPermission(currentUser, 'canManageLaybys')
  const [stats, setStats] = React.useState<{
    dailySales: number
    ordersToday: number
    inventoryValue: number
    lowStockItems: number
    cutToSizeOrders: number
  } | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/hardware/${businessId}/dashboard`)
        if (response.ok) {
          const data = await response.json()
          setStats(data.data)
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    if (businessId) {
      fetchStats()
    }
  }, [businessId])

  const actions = [
    { label: 'Point of Sale', href: '/hardware/pos', icon: '🛒', description: 'Process customer sales with barcode scanner' },
    { label: 'Orders', href: '/hardware/orders', icon: '📋', description: 'Manage customer orders and project fulfillment' },
    { label: 'Reports', href: '/hardware/reports', icon: '📊', description: 'View sales analytics and business reports' },
    { label: 'Inventory', href: '/hardware/inventory', icon: '📦', description: 'Manage stock levels and bulk orders' },
    { label: 'Cut-to-Size', href: '/hardware/cut-to-size', icon: '✂️', description: 'Custom cutting and measurement orders' },
    { label: 'Suppliers', href: '/business/suppliers', icon: '🚛', description: 'Manage vendor relationships and supplier contacts' },
    { label: 'Locations', href: '/business/locations', icon: '📍', description: 'Storage locations and warehouse organization' },
    { label: 'Projects', href: '/hardware/projects', icon: '🏗️', description: 'Track contractor and bulk projects' },
    { label: 'Tools & Equipment', href: '/hardware/tools', icon: '🔧', description: 'Tool rentals and equipment sales' },
    ...(canManageLaybys ? [{ label: 'Layby Management', href: '/business/laybys', icon: '🛍️', description: 'Customer layby agreements and payments' }] : []),
    { label: 'Employee Management', href: '/hardware/employees', icon: '👥', description: 'Manage hardware store staff and schedules' }
  ]

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const metrics = [
    { 
      label: 'Daily Sales', 
      value: loading ? '...' : formatCurrency(stats?.dailySales || 0), 
      icon: '💰', 
      color: 'text-green-600' 
    },
    { 
      label: 'Orders Today', 
      value: loading ? '...' : (stats?.ordersToday || 0).toString(), 
      icon: '📦', 
      color: 'text-blue-600' 
    },
    { 
      label: 'Inventory Value', 
      value: loading ? '...' : formatCurrency(stats?.inventoryValue || 0), 
      icon: '🏪', 
      color: 'text-purple-600' 
    },
    { 
      label: 'Low Stock Items', 
      value: loading ? '...' : (stats?.lowStockItems || 0).toString(), 
      icon: '⚠️', 
      color: 'text-red-600' 
    },
    { 
      label: 'Cut-to-Size Orders', 
      value: loading ? '...' : (stats?.cutToSizeOrders || 0).toString(), 
      icon: '✂️', 
      color: 'text-orange-600' 
    }
  ]

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {metrics.map((metric, index) => (
          <div key={index} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary">{metric.label}</p>
                <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
              </div>
              <div className="text-2xl">{metric.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-primary mb-4">Hardware Store Operations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group card"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl group-hover:scale-110 transition-transform">
                  {action.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {action.label}
                  </h3>
                  <p className="text-sm text-secondary mt-1">
                    {action.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Hardware-Specific Features */}
      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-6">
        <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-4">🔧 Hardware Store Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4 rounded-lg border border-orange-200 dark:border-orange-800">
            <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">✂️ Cut-to-Size Service</h4>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Custom cutting for lumber, pipes, and materials with precision measurements and waste tracking.
            </p>
          </div>
          <div className="card p-4 rounded-lg border border-orange-200 dark:border-orange-800">
            <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">🏗️ Contractor Accounts</h4>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Bulk pricing, credit accounts, and project-based ordering for professional contractors.
            </p>
          </div>
          <div className="card p-4 rounded-lg border border-orange-200 dark:border-orange-800">
            <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">🔧 Tool Rental</h4>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Power tools and equipment rental with maintenance tracking and availability calendar.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HardwarePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Use the business permissions context for proper business management
  const {
    currentBusiness,
    currentBusinessId,
    isAuthenticated,
    loading: businessLoading,
    businesses
  } = useBusinessPermissionsContext()

  // Check if current business is a hardware business
  const isHardwareBusiness = currentBusiness?.businessType === 'hardware'

  // Redirect to signin if not authenticated
  React.useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  // Show loading while session or business context is loading
  if (status === 'loading' || businessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Don't render if no session or no business access
  if (!session || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need to be logged in to use the hardware store system.</p>
        </div>
      </div>
    )
  }

  // Check if user has any hardware businesses
  const hardwareBusinesses = businesses.filter(b => b.businessType === 'hardware' && b.isActive)
  const hasHardwareBusinesses = hardwareBusinesses.length > 0

  // If no current business selected and user has hardware businesses, show selection prompt
  if (!currentBusiness && hasHardwareBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Hardware Business</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You have access to {hardwareBusinesses.length} hardware business{hardwareBusinesses.length > 1 ? 'es' : ''}.
            Please select one from the sidebar to use the hardware store system.
          </p>
          <div className="space-y-2">
            {hardwareBusinesses.slice(0, 3).map(business => (
              <div key={business.businessId} className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{business.businessName}</p>
                <p className="text-sm text-gray-600">Role: {business.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // If current business is not hardware, show error
  if (currentBusiness && !isHardwareBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Wrong Business Type</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The Hardware Store Dashboard is only available for hardware businesses. Your current business "{currentBusiness.businessName}" is a {currentBusiness.businessType} business.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Please select a hardware business from the sidebar to use this system.
          </p>
        </div>
      </div>
    )
  }

  // If no hardware businesses at all, show message
  if (!hasHardwareBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Hardware Businesses</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You don't have access to any hardware businesses. The Hardware Store system requires access to at least one hardware business.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Contact your administrator if you need access to hardware businesses.
          </p>
        </div>
      </div>
    )
  }

  // At this point, we have a valid hardware business selected
  const businessId = currentBusinessId!

  return (
    <BusinessProvider businessId={businessId}>
      <BusinessTypeRoute requiredBusinessType="hardware">
        <ContentLayout
          title="🔧 Hardware Store Dashboard"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Hardware Store', isActive: true }
          ]}
        >
          <HardwareContent session={session} businessId={businessId} />
        </ContentLayout>
      </BusinessTypeRoute>
    </BusinessProvider>
  )
}
