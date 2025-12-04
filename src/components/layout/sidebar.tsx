'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { canAccessModule, hasPermission, hasUserPermission, isSystemAdmin, SessionUser } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useNavigation } from '@/contexts/navigation-context'
import { BusinessRevenueBreakdownModal } from '@/components/dashboard/business-revenue-breakdown-modal'

interface Business {
  id: string
  name: string
  type: string
}

interface BusinessGroup {
  type: string
  icon: string
  businesses: Business[]
}

const modules: { name: string; path: string; module: 'construction' | 'restaurant' | 'grocery' | 'clothing' | 'hardware' | 'vehicles'; icon: string }[] = [
  { name: 'Construction', path: '/construction', module: 'construction', icon: '🏗️' },
  { name: 'Restaurant', path: '/restaurant', module: 'restaurant', icon: '🍽️' },
  { name: 'Grocery', path: '/grocery', module: 'grocery', icon: '🛒' },
  { name: 'Clothing', path: '/clothing', module: 'clothing', icon: '👕' },
  { name: 'Hardware', path: '/hardware', module: 'hardware', icon: '🔧' },
  { name: 'Vehicles', path: '/vehicles', module: 'vehicles', icon: '🚗' },
]

const businessTypeModules = [
  { type: 'restaurant', icon: '🍽️', name: 'Restaurant' },
  { type: 'grocery', icon: '🛒', name: 'Grocery' },
  { type: 'clothing', icon: '👕', name: 'Clothing' },
  { type: 'hardware', icon: '🔧', name: 'Hardware' },
  { type: 'construction', icon: '🏗️', name: 'Construction' },
  { type: 'services', icon: '💼', name: 'Services' },
  { type: 'retail', icon: '🏪', name: 'Retail' },
  { type: 'consulting', icon: '📊', name: 'Consulting' },
]

// Helper function to get icon for any business type
const getBusinessTypeIcon = (type: string): string => {
  const module = businessTypeModules.find(m => m.type === type)
  return module?.icon || '🏢' // Default icon for unknown types
}

// Helper function to get display name for any business type
const getBusinessTypeName = (type: string): string => {
  if (type === 'other') return 'Other Businesses'
  const module = businessTypeModules.find(m => m.type === type)
  return module?.name || type.charAt(0).toUpperCase() + type.slice(1) // Capitalize first letter for unknown types
}

export function Sidebar() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { navigateTo } = useNavigation()
  // normalize session user early to avoid repeating casts later
  const currentUser = session?.user as any
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [businessGroups, setBusinessGroups] = useState<BusinessGroup[]>([])
  const [expandedBusinessTypes, setExpandedBusinessTypes] = useState<Set<string>>(new Set())
  const [loadingBusinesses, setLoadingBusinesses] = useState(false)
  const [showRevenueModal, setShowRevenueModal] = useState(false)

  // Get business context
  const {
    currentBusiness,
    currentBusinessId,
    hasPermission: hasBusinessPermission,
    isAuthenticated,
    loading: businessLoading,
    businesses: businessMemberships,
    switchBusiness
  } = useBusinessPermissionsContext()

  // Use businesses from BusinessPermissionsContext instead of separate API call
  useEffect(() => {
    const user = currentUser as SessionUser
    if (!user) return

    setLoadingBusinesses(true)

    // For system admins, fetch all businesses
    if (isSystemAdmin(user)) {
      fetch('/api/businesses')
        .then(res => res.json())
        .then(data => {
          // API returns { businesses, isAdmin }
          const businessList = data.businesses || []
          if (businessList && Array.isArray(businessList)) {
            setBusinesses(businessList)
            groupBusinessesByType(businessList)
          }
        })
        .catch(console.error)
        .finally(() => setLoadingBusinesses(false))
    } else {
      // For regular users, use memberships from context (no additional API call)
      if (businessMemberships && businessMemberships.length > 0) {
        const userBusinesses = businessMemberships.map(membership => ({
          id: membership.businessId,
          name: membership.businessName,
          type: membership.businessType,
          description: '',
          isActive: membership.isActive
        }))
        setBusinesses(userBusinesses)
        groupBusinessesByType(userBusinesses)
      }
      setLoadingBusinesses(false)
    }
  }, [session?.user, businessMemberships])

  // Helper function to group businesses by type - DYNAMIC with "Other" category
  const groupBusinessesByType = (businessList: Business[]) => {
    // Define which types have full feature sets (dedicated pages)
    const primaryTypes = ['restaurant', 'grocery', 'clothing', 'hardware', 'construction', 'services']

    // Get all unique business types from actual businesses
    const uniqueTypes = Array.from(new Set(businessList.map((b: Business) => b.type)))

    // Separate primary types from other types
    const primaryTypesPresent = uniqueTypes.filter(type => primaryTypes.includes(type))
    const otherTypes = uniqueTypes.filter(type => !primaryTypes.includes(type))

    // Create groups for primary types
    const grouped = primaryTypesPresent.map(type => ({
      type: type,
      icon: getBusinessTypeIcon(type),
      businesses: businessList.filter((b: Business) => b.type === type)
    }))

    // If there are "other" types, create an "Other" group
    if (otherTypes.length > 0) {
      const otherBusinesses = businessList.filter((b: Business) => otherTypes.includes(b.type))
      grouped.push({
        type: 'other',
        icon: '🏢', // Generic building icon for "Other"
        businesses: otherBusinesses
      })
    }

    // Sort by type name for consistent display (but "other" should be last)
    grouped.sort((a, b) => {
      if (a.type === 'other') return 1
      if (b.type === 'other') return -1
      return a.type.localeCompare(b.type)
    })

    setBusinessGroups(grouped)
  }

  // Auto-expand current business type (separate effect to prevent unnecessary re-fetching)
  useEffect(() => {
    if (currentBusiness?.businessType && businesses.length > 0) {
      setExpandedBusinessTypes(new Set([currentBusiness.businessType]))
    }
  }, [currentBusiness?.businessType, businesses.length])

  // Debug logging removed to improve performance

  if (!currentUser || !isAuthenticated) return null


  // Helper function to determine if a link is active
  const isActiveLink = (href: string): boolean => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  // Helper function to get link classes with active state
  const getLinkClasses = (href: string): string => {
    const baseClasses = "sidebar-link flex items-center space-x-3"
    const activeClasses = "bg-blue-600 text-white border-l-4 border-blue-400"
    const inactiveClasses = "text-gray-300 hover:text-white hover:bg-gray-800"

    return isActiveLink(href)
      ? `${baseClasses} ${activeClasses}`
      : `${baseClasses} ${inactiveClasses}`
  }

  // Helper functions for admin sidebar
  const toggleBusinessType = (businessType: string) => {
    const newExpanded = new Set(expandedBusinessTypes)
    if (newExpanded.has(businessType)) {
      newExpanded.delete(businessType)
    } else {
      // Only allow one expanded at a time
      newExpanded.clear()
      newExpanded.add(businessType)
    }
    setExpandedBusinessTypes(newExpanded)
  }

  const handleBusinessClick = async (business: Business) => {
    if (switchBusiness) {
      try {
        // Switch to the business
        await switchBusiness(business.id)
        // console.log(`🔄 Switched to business: ${business.name} (${business.type})`)

        // Track last accessed business for future logins
        try {
          const response = await fetch('/api/user/last-accessed-business', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              businessId: business.id,
              businessType: business.type,
            }),
          })

          if (response.ok) {
            // console.log(`📝 Tracked last accessed business: ${business.name}`)
          } else {
            // console.warn('Failed to track last accessed business')
          }
        } catch (trackError) {
          // console.warn('Error tracking last accessed business:', trackError)
        }

        // Determine navigation path - preserve current module if applicable
        const currentPath = pathname

        // Define business types with universal module support (inventory, products, pos, reports, orders, employees, suppliers, customers)
        const universalModuleBusinessTypes = ['restaurant', 'grocery', 'clothing', 'hardware']
        const allPrimaryBusinessTypes = ['restaurant', 'grocery', 'clothing', 'hardware', 'construction', 'services']
        const hasDedicatedPages = allPrimaryBusinessTypes.includes(business.type)

        // Define universal modules shared across restaurant, grocery, clothing, hardware
        const universalModules = ['inventory', 'products', 'pos', 'reports', 'orders', 'employees', 'suppliers', 'customers']

        // Default path: use business type page if it exists, otherwise go to dashboard
        let targetPath = hasDedicatedPages ? `/${business.type}` : '/dashboard'

        // Parse current path to extract business type and module
        const pathSegments = currentPath.split('/').filter(Boolean)

        if (pathSegments.length >= 2) {
          const currentBusinessType = pathSegments[0]
          const currentModule = pathSegments[1]

          // Check if both current and target businesses support universal modules
          const currentSupportsUniversal = universalModuleBusinessTypes.includes(currentBusinessType)
          const targetSupportsUniversal = universalModuleBusinessTypes.includes(business.type)

          // If switching between universal module businesses and on a universal module, preserve it
          if (currentSupportsUniversal && targetSupportsUniversal && universalModules.includes(currentModule)) {
            // Special handling for reports - preserve full sub-path
            if (currentModule === 'reports') {
              const reportsSubPath = pathSegments.slice(2).join('/')
              targetPath = reportsSubPath ? `/${business.type}/reports/${reportsSubPath}` : `/${business.type}/reports`
            } else {
              // For restaurant, 'menu' is specific to restaurant only (not in universalModules)
              // For inventory/products/pos/orders/employees/suppliers/customers, preserve across all four types
              targetPath = `/${business.type}/${currentModule}`
            }
          }
          // Special case: if current business is restaurant and on 'menu', target is another universal business
          else if (currentBusinessType === 'restaurant' && currentModule === 'menu' && targetSupportsUniversal) {
            // Don't preserve 'menu' - go to target business homepage
            targetPath = `/${business.type}`
          }
          // If switching from universal module business to construction/services, use default (homepage)
          else if (currentSupportsUniversal && !targetSupportsUniversal) {
            // targetPath already set to default
          }
        }

        // console.log(`🔗 Navigating from ${currentPath} to: ${targetPath}`)
        router.push(targetPath)
      } catch (error) {
        console.error('Failed to switch business:', error)
      }
    }
  }

  // Force re-render when business context changes
  // console.log('🔄 Sidebar Render - Current Business Context:', {
  //   currentBusinessId: currentBusiness?.businessId,
  //   currentBusinessName: currentBusiness?.businessName,
  //   currentBusinessType: currentBusiness?.businessType,
  //   loading: businessLoading,
  //   isAdmin: isSystemAdmin(currentUser)
  // })

  // Function to check if user can access module in current business context
  const canAccessModuleInBusiness = (module: 'construction' | 'restaurant' | 'grocery' | 'clothing' | 'hardware' | 'vehicles'): boolean => {
    // System admins always have access
    if (isSystemAdmin(currentUser)) {
      return true
    }

    // If no current business, fall back to old permission system
    if (!currentBusiness) {
      return canAccessModule(currentUser, module)
    }

    // Check if current business type matches the module
    // Only show modules that match the current business type
    const businessType = currentBusiness.businessType?.toLowerCase()

    // Direct module matching based on business type
    switch (module) {
      case 'restaurant':
        return businessType === 'restaurant'
      case 'grocery':
        return businessType === 'grocery'
      case 'construction':
        return businessType === 'construction'
      case 'clothing':
        return businessType === 'clothing'
      case 'hardware':
        return businessType === 'hardware'
      case 'vehicles':
        return businessType === 'vehicles'
      default:
        return false
    }
  }

  return (
    <div className="w-full h-full bg-gray-900 text-white flex flex-col shadow-xl">
      <div className="p-4 xl:p-6 border-b border-gray-700">
        <h1 className="text-xl xl:text-2xl font-bold text-blue-400">Business Hub</h1>
        <p className="text-xs xl:text-sm text-gray-400 mt-1">Multi-Platform Management</p>
        {currentBusiness && (
          <div className="mt-3 p-2 bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-400">Current Business:</p>
            <p className="text-sm text-white font-medium truncate">{currentBusiness.businessName}</p>
          </div>
        )}
      </div>
      
  <nav className="flex-1 p-4 space-y-1 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent pr-2 max-h-[calc(100vh-4rem)]">
        <Link
          href="/dashboard"
          className="sidebar-link flex items-center space-x-3"
        >
          <span className="text-lg">📊</span>
          <span>Dashboard</span>
        </Link>

        {/* Business Revenue Breakdown - Only for users with financial data access */}
        {(isSystemAdmin(currentUser) || hasPermission(currentUser, 'canAccessFinancialData')) && (
          <button
            onClick={() => setShowRevenueModal(true)}
            className="sidebar-link flex items-center space-x-3 w-full text-left"
          >
            <span className="text-lg">💰</span>
            <span>Business Revenue Breakdown</span>
          </button>
        )}

        {/* Universal Hierarchical Business Navigation - Available to ALL users */}
        {businessGroups.length > 0 && (
          <>
            <div className="pt-4 pb-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Business Types</h3>
            </div>

            {businessGroups.map((group) => (
              <div key={group.type} className="mb-1">
                {/* Business Type Header - Collapsible */}
                <button
                  onClick={() => toggleBusinessType(group.type)}
                  className="w-full sidebar-link flex items-center space-x-3 justify-between hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{group.icon}</span>
                    <span>{getBusinessTypeName(group.type)}</span>
                    <span className="text-xs text-gray-400">({group.businesses.length})</span>
                  </div>
                  <span className="text-sm text-gray-400">
                    {expandedBusinessTypes.has(group.type) ? '▼' : '▶'}
                  </span>
                </button>

                {/* Business List - Show when expanded */}
                {expandedBusinessTypes.has(group.type) && (
                  <div className="ml-6 mt-1 space-y-1">
                    {group.businesses.map((business) => (
                      <button
                        key={business.id}
                        onClick={() => handleBusinessClick(business)}
                        className={`w-full text-left text-sm px-3 py-2 rounded transition-colors ${
                          currentBusiness?.businessId === business.id
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col truncate">
                            <span className="truncate">{business.name}</span>
                            {/* Show business type badge for "Other" category */}
                            {group.type === 'other' && (
                              <span className="text-xs text-gray-400 capitalize">
                                {getBusinessTypeIcon(business.type)} {getBusinessTypeName(business.type)}
                              </span>
                            )}
                          </div>
                          {currentBusiness?.businessId === business.id && (
                            <span className="text-xs ml-2">✓</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {loadingBusinesses && (
          <div className="text-gray-400 text-sm px-3 py-2">
            Loading businesses...
          </div>
        )}

        {/* Business-Type-Specific Features */}
        {currentBusiness && (
          <>
            <div className="pt-4 pb-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {currentBusiness.businessName}
              </h3>
            </div>

            {/* Restaurant Features */}
            {currentBusiness.businessType === 'restaurant' && (
              <>
                <Link href="/restaurant/pos" className={getLinkClasses('/restaurant/pos')}>
                  <span className="text-lg">🍽️</span>
                  <span>POS System</span>
                </Link>
                <Link href="/restaurant/reports" className={getLinkClasses('/restaurant/reports')}>
                  <span className="text-lg">📊</span>
                  <span>Sales Reports</span>
                </Link>
                <Link href="/restaurant/menu" className={getLinkClasses('/restaurant/menu')}>
                  <span className="text-lg">📋</span>
                  <span>Menu Management</span>
                </Link>
              </>
            )}

            {/* Grocery Features */}
            {currentBusiness.businessType === 'grocery' && (
              <>
                <Link href="/grocery/pos" className={getLinkClasses('/grocery/pos')}>
                  <span className="text-lg">🛒</span>
                  <span>POS System</span>
                </Link>
                <Link href="/restaurant/reports" className={getLinkClasses('/restaurant/reports')}>
                  <span className="text-lg">📊</span>
                  <span>Sales Reports</span>
                </Link>
                <Link href="/grocery/products" className={getLinkClasses('/grocery/products')}>
                  <span className="text-lg">📦</span>
                  <span>Products</span>
                </Link>
              </>
            )}

            {/* Clothing Features */}
            {currentBusiness.businessType === 'clothing' && (
              <>
                <Link href="/clothing/pos" className={getLinkClasses('/clothing/pos')}>
                  <span className="text-lg">👕</span>
                  <span>POS System</span>
                </Link>
                <Link href="/restaurant/reports" className={getLinkClasses('/restaurant/reports')}>
                  <span className="text-lg">📊</span>
                  <span>Sales Reports</span>
                </Link>
                <Link href="/clothing/products" className={getLinkClasses('/clothing/products')}>
                  <span className="text-lg">👗</span>
                  <span>Products</span>
                </Link>
              </>
            )}

            {/* Hardware Features */}
            {currentBusiness.businessType === 'hardware' && (
              <>
                <Link href="/hardware/pos" className={getLinkClasses('/hardware/pos')}>
                  <span className="text-lg">🔧</span>
                  <span>POS System</span>
                </Link>
                <Link href="/restaurant/reports" className={getLinkClasses('/restaurant/reports')}>
                  <span className="text-lg">📊</span>
                  <span>Sales Reports</span>
                </Link>
                <Link href="/hardware/products" className={getLinkClasses('/hardware/products')}>
                  <span className="text-lg">🛠️</span>
                  <span>Products</span>
                </Link>
              </>
            )}

            {/* Services Features */}
            {currentBusiness.businessType === 'services' && (
              <>
                <Link href="/services/list" className={getLinkClasses('/services/list')}>
                  <span className="text-lg">💼</span>
                  <span>Services List</span>
                </Link>
                <Link href="/services/categories" className={getLinkClasses('/services/categories')}>
                  <span className="text-lg">📂</span>
                  <span>Categories</span>
                </Link>
                <Link href="/services/suppliers" className={getLinkClasses('/services/suppliers')}>
                  <span className="text-lg">🤝</span>
                  <span>Suppliers</span>
                </Link>
              </>
            )}

            {/* Default Features for Other Business Types (retail, consulting, etc.) */}
            {!['restaurant', 'grocery', 'clothing', 'hardware', 'services', 'construction'].includes(currentBusiness.businessType) && (
              <>
                <Link href="/dashboard" className={getLinkClasses('/dashboard')}>
                  <span className="text-lg">📊</span>
                  <span>Dashboard</span>
                </Link>
                <Link href="/business/manage" className={getLinkClasses('/business/manage')}>
                  <span className="text-lg">⚙️</span>
                  <span>Business Settings</span>
                </Link>
                <div className="px-3 py-2 text-xs text-gray-400">
                  <div className="flex items-center gap-2 mb-2">
                    <span>{getBusinessTypeIcon(currentBusiness.businessType)}</span>
                    <span className="capitalize">{getBusinessTypeName(currentBusiness.businessType)} Business</span>
                  </div>
                  <p className="text-gray-500">
                    Dedicated features for {getBusinessTypeName(currentBusiness.businessType).toLowerCase()} businesses are coming soon.
                  </p>
                </div>
              </>
            )}
          </>
        )}

        {/* Business and Personal Finances - User-level permissions (business-agnostic) */}
  {(hasUserPermission(currentUser, 'canAccessPersonalFinance') || isSystemAdmin(currentUser)) && (
          <div className="pt-2">
            <button
              onClick={() => navigateTo('/personal')}
              className={getLinkClasses('/personal')}
            >
              <span className="text-lg">💰</span>
              <span>Business and Personal Finances</span>
            </button>
          </div>
        )}

        {/* Fleet Management - User-level permissions (business-agnostic) */}
  {(hasUserPermission(currentUser, 'canAccessVehicles') || hasUserPermission(currentUser, 'canLogDriverTrips') || hasUserPermission(currentUser, 'canLogDriverMaintenance') || isSystemAdmin(currentUser)) && (
          <div className="pt-1">
            <button
              onClick={() => {
                // Drivers go to driver portal, others go to full vehicle management
                const isDriver = currentUser &&
                  hasUserPermission(currentUser, 'canLogDriverTrips') &&
                  hasUserPermission(currentUser, 'canLogDriverMaintenance') &&
                  !hasUserPermission(currentUser, 'canAccessPersonalFinance') &&
                  !isSystemAdmin(currentUser)

                navigateTo(isDriver ? '/driver' : '/vehicles')
              }}
              className={getLinkClasses('/vehicles')}
            >
              <span className="text-lg">🚗</span>
              <span>Fleet Management</span>
            </button>
          </div>
        )}

        {/* Contractor Management - User-level permissions (business-agnostic) */}
  {(hasUserPermission(currentUser, 'canManagePersonalContractors') || isSystemAdmin(currentUser)) && (
          <div className="pt-1">
            <button
              onClick={() => navigateTo('/contractors')}
              className={getLinkClasses('/contractors')}
            >
              <span className="text-lg">👷</span>
              <span>Contractor Management</span>
            </button>
          </div>
        )}

        {/* Individual Access Items - Only for actual managers and system admins, NOT promoted drivers */}

        {/* Employees - Only for users with management permissions, not just viewing */}
        {(hasPermission(currentUser, 'canManageEmployees') || hasPermission(currentUser, 'canEditEmployees') || hasPermission(currentUser, 'canManageBusinessUsers') || isSystemAdmin(currentUser)) && (
          <Link
            href="/employees"
            className="sidebar-link flex items-center space-x-3"
          >
            <span className="text-lg">👤</span>
            <span>Employees</span>
          </Link>
        )}

        {/* Payroll - Only for users with payroll permissions */}
        {(hasPermission(currentUser, 'canAccessPayroll') || isSystemAdmin(currentUser)) && (
          <Link
            href="/payroll"
            className={getLinkClasses('/payroll')}
          >
            <span className="text-lg">💵</span>
            <span>Payroll</span>
          </Link>
        )}

        {/* Payroll Account - Only for users with payroll account permissions */}
        {(hasUserPermission(currentUser, 'canAccessPayrollAccount') || isSystemAdmin(currentUser)) && (
          <>
            <Link
              href="/payroll/account"
              className={getLinkClasses('/payroll/account')}
            >
              <span className="text-lg">💰</span>
              <span>Payroll Account</span>
            </Link>

            {/* Payroll Account Sub-menu - Show when on payroll account pages */}
            {pathname.startsWith('/payroll/account') && (
              <div className="ml-8 space-y-1 mt-1">
                {(hasUserPermission(currentUser, 'canMakePayrollDeposits') || isSystemAdmin(currentUser)) && (
                  <Link
                    href="/payroll/account/deposits"
                    className="text-sm text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded flex items-center space-x-2"
                  >
                    <span>💸</span>
                    <span>Deposits</span>
                  </Link>
                )}

                {(hasUserPermission(currentUser, 'canMakePayrollPayments') || isSystemAdmin(currentUser)) && (
                  <>
                    <Link
                      href="/payroll/account/payments"
                      className="text-sm text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded flex items-center space-x-2"
                    >
                      <span>💳</span>
                      <span>Batch Payments</span>
                    </Link>

                    <Link
                      href="/payroll/account/payments/advance"
                      className="text-sm text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded flex items-center space-x-2"
                    >
                      <span>⚡</span>
                      <span>Salary Advance</span>
                    </Link>
                  </>
                )}

                {(hasUserPermission(currentUser, 'canViewPayrollHistory') || isSystemAdmin(currentUser)) && (
                  <Link
                    href="/payroll/account/payments/history"
                    className="text-sm text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded flex items-center space-x-2"
                  >
                    <span>📜</span>
                    <span>Payment History</span>
                  </Link>
                )}
              </div>
            )}
          </>
        )}

        {/* Expense Accounts - Only for users with expense account permissions */}
        {(hasUserPermission(currentUser, 'canAccessExpenseAccount') || isSystemAdmin(currentUser)) && (
          <>
            <Link
              href="/expense-accounts"
              className={getLinkClasses('/expense-accounts')}
            >
              <span className="text-lg">💳</span>
              <span>Expense Accounts</span>
            </Link>

            {/* Expense Accounts Sub-menu - Show when on expense account pages */}
            {pathname.startsWith('/expense-accounts') && (
              <div className="ml-8 space-y-1 mt-1">
                {(hasUserPermission(currentUser, 'canCreateExpenseAccount') || isSystemAdmin(currentUser)) && (
                  <Link
                    href="/expense-accounts/new"
                    className="text-sm text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded flex items-center space-x-2"
                  >
                    <span>➕</span>
                    <span>Create Account</span>
                  </Link>
                )}

                {(hasUserPermission(currentUser, 'canViewExpenseReports') || isSystemAdmin(currentUser)) && (
                  <Link
                    href="/expense-accounts/reports"
                    className="text-sm text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded flex items-center space-x-2"
                  >
                    <span>📊</span>
                    <span>All Reports</span>
                  </Link>
                )}
              </div>
            )}
          </>
        )}

        {/* Reports - Only for managers and admins, not drivers */}
        {(isSystemAdmin(currentUser) || hasPermission(currentUser, 'canManageBusinessUsers') || hasPermission(currentUser, 'canAccessFinancialData')) && (
          <Link
            href="/reports"
            className="sidebar-link flex items-center space-x-3"
          >
            <span className="text-lg">📈</span>
            <span>Reports</span>
          </Link>
        )}

        {/* HR Reports - Only for users with actual employee management permissions */}
        {(isSystemAdmin(currentUser) || hasPermission(currentUser, 'canManageEmployees') || hasPermission(currentUser, 'canEditEmployees')) && (
          <Link
            href="/admin/reports"
            className="sidebar-link flex items-center space-x-3"
          >
            <span className="text-lg">📊</span>
            <span>HR Reports</span>
          </Link>
        )}

        <div className="pt-4 pb-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tools</h3>
        </div>

        {/* Business Categories - Cross-business functionality */}
        {(isSystemAdmin(currentUser) ||
          hasUserPermission(currentUser, 'canCreateBusinessCategories') ||
          hasUserPermission(currentUser, 'canEditBusinessCategories') ||
          hasUserPermission(currentUser, 'canDeleteBusinessCategories')) && (
          <Link
            href="/business/categories"
            className={getLinkClasses('/business/categories')}
          >
            <span className="text-lg">📁</span>
            <span>Business Categories</span>
          </Link>
        )}

        {/* Inventory Categories - Business-specific inventory category management */}
        {(isSystemAdmin(currentUser) ||
          hasUserPermission(currentUser, 'canCreateInventoryCategories') ||
          hasUserPermission(currentUser, 'canEditInventoryCategories') ||
          hasUserPermission(currentUser, 'canDeleteInventoryCategories')) && (
          <Link
            href="/business/inventory-categories"
            className={getLinkClasses('/business/inventory-categories')}
          >
            <span className="text-lg">📦</span>
            <span>Inventory Categories</span>
          </Link>
        )}

        {/* Supplier Management - Business-specific supplier management */}
        {(isSystemAdmin(currentUser) ||
          hasBusinessPermission('canViewSuppliers') ||
          hasBusinessPermission('canCreateSuppliers') ||
          hasBusinessPermission('canEditSuppliers')) && (
          <Link
            href="/business/suppliers"
            className={getLinkClasses('/business/suppliers')}
          >
            <span className="text-lg">🚚</span>
            <span>Suppliers</span>
          </Link>
        )}

        {/* Location Management - Business-specific location management */}
        {(isSystemAdmin(currentUser) ||
          hasBusinessPermission('canViewLocations') ||
          hasBusinessPermission('canCreateLocations') ||
          hasBusinessPermission('canEditLocations')) && (
          <Link
            href="/business/locations"
            className={getLinkClasses('/business/locations')}
          >
            <span className="text-lg">📍</span>
            <span>Locations</span>
          </Link>
        )}

        {/* Customer Management - Cross-business functionality */}
        {(isSystemAdmin(currentUser) || hasPermission(currentUser, 'canAccessCustomers') || hasPermission(currentUser, 'canManageCustomers')) && (
          <Link
            href="/customers"
            className={getLinkClasses('/customers')}
          >
            <span className="text-lg">👥</span>
            <span>Customer Management</span>
          </Link>
        )}

        {/* Layby Management - Cross-business functionality */}
        {(isSystemAdmin(currentUser) || hasPermission(currentUser, 'canManageLaybys')) && (
          <Link
            href="/business/laybys"
            className={getLinkClasses('/business/laybys')}
          >
            <span className="text-lg">🛍️</span>
            <span>Layby Management</span>
          </Link>
        )}

        {/* Project Management - Cross-business functionality */}
  {(isSystemAdmin(currentUser) || hasUserPermission(currentUser, 'canViewProjects') || hasUserPermission(currentUser, 'canAccessPersonalFinance')) && (
          <Link
            href="/projects"
            className={getLinkClasses('/projects')}
          >
            <span className="text-lg">📋</span>
            <span>Project Management</span>
          </Link>
        )}

        <Link
          href="/chat"
          className="sidebar-link flex items-center space-x-3"
        >
          <span className="text-lg">💬</span>
          <span>Team Chat</span>
        </Link>

        {/* Employee Management Section - Only for users with actual management permissions */}
        {(hasPermission(currentUser, 'canManageEmployees') ||
          hasPermission(currentUser, 'canManageJobTitles') ||
          hasPermission(currentUser, 'canEditEmployees') ||
          hasPermission(currentUser, 'canManageBenefitTypes') ||
          hasPermission(currentUser, 'canManageCompensationTypes') ||
          hasPermission(currentUser, 'canManageDisciplinaryActions') ||
          isSystemAdmin(currentUser)) && (
          <>
            <div className="pt-4 pb-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Employee Management</h3>
            </div>

            {hasPermission(currentUser, 'canManageJobTitles') && (
              <Link
                href="/admin/job-titles"
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">💼</span>
                <span>Job Titles</span>
              </Link>
            )}

            {hasPermission(currentUser, 'canEditEmployees') && (
              <Link
                href="/admin/hierarchy"
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">🌳</span>
                <span>Hierarchy</span>
              </Link>
            )}

            {(hasPermission(currentUser, 'canManageBenefitTypes') || hasPermission(currentUser, 'canManageCompensationTypes')) && (
              <Link
                href="/admin/benefits"
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">💰</span>
                <span>Benefits & Compensation</span>
              </Link>
            )}

            {hasPermission(currentUser, 'canManageDisciplinaryActions') && (
              <Link
                href="/admin/disciplinary"
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">⚠️</span>
                <span>Disciplinary Actions</span>
              </Link>
            )}
          </>
        )}
        
  {(isSystemAdmin(currentUser) || hasPermission(currentUser, 'canManageBusinessUsers') || hasPermission(currentUser, 'canManageBusinessSettings')) && (
          <>
            <div className="pt-4 pb-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Administration</h3>
            </div>
            
            {isSystemAdmin(currentUser) && (
              <Link
                href="/admin"
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">🛠️</span>
                <span>System Administration</span>
              </Link>
            )}

            {isSystemAdmin(currentUser) && (
              <Link
                href="/admin/personal-finance"
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">💰</span>
                <span>Global Finance</span>
              </Link>
            )}

            {isSystemAdmin(currentUser) && (
              <Link
                href="/admin/contractors"
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">👷</span>
                <span>Global Contractors</span>
              </Link>
            )}
            
            {hasPermission(currentUser, 'canManageBusinessUsers') && (
              <Link 
                href="/admin/users" 
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">👥</span>
                <span>User Management</span>
              </Link>
            )}
            
            {hasPermission(currentUser, 'canManageBusinessSettings') && (
              <Link 
                href="/admin/settings" 
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">⚙️</span>
                <span>System Settings</span>
              </Link>
            )}
            
            {(isSystemAdmin(currentUser) || hasPermission(currentUser, 'canManageBusinessUsers')) && (
              <Link 
                href="/business/manage" 
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">🏢</span>
                <span>Business Management</span>
              </Link>
            )}
            
            {(isSystemAdmin(currentUser) || hasPermission(currentUser, 'canAccessFinancialData')) && (
              <Link
                href="/business/manage/loans"
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">💰</span>
                <span>Business Loans</span>
              </Link>
            )}

            {(isSystemAdmin(currentUser) || hasPermission(currentUser, 'canManageBusinessSettings')) && (
              <Link
                href="/admin/umbrella-business"
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">🏢</span>
                <span>Umbrella Business</span>
              </Link>
            )}
          </>
        )}
      </nav>
      
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
            {currentUser?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentUser?.name}</p>
            <p className="text-xs text-gray-400 truncate">{currentUser?.email}</p>
          </div>
        </div>
        <button 
          onClick={() => signOut({ 
            callbackUrl: `${window.location.origin}/auth/signin`,
            redirect: true 
          })}
          className="w-full text-left text-sm text-gray-400 hover:text-white transition-colors py-1"
        >
          🚪 Sign Out
        </button>
      </div>
      
      <BusinessRevenueBreakdownModal
        isOpen={showRevenueModal}
        onClose={() => setShowRevenueModal(false)}
      />
    </div>
  )
}