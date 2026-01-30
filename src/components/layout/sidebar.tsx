'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { canAccessModule, hasPermission, checkPermission, isSystemAdmin, hasUserPermission, SessionUser } from '@/lib/permission-utils'
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
  const [esp32IntegrationEnabled, setEsp32IntegrationEnabled] = useState(false)
  const [r710IntegrationEnabled, setR710IntegrationEnabled] = useState(false)
  const [showWiFiPortalLinks, setShowWiFiPortalLinks] = useState(false)
  const [businessCartCounts, setBusinessCartCounts] = useState<Record<string, number>>({})

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

  // Check if user has WiFi setup permissions (for main WiFi Portal links)
  useEffect(() => {
    const hasWiFiPermissions = isSystemAdmin(currentUser) ||
      checkPermission(currentUser, 'canManageWifiPortal') ||
      checkPermission(currentUser, 'canSetupPortalIntegration') ||
      checkPermission(currentUser, 'canConfigureWifiTokens') ||
      checkPermission(currentUser, 'canSellWifiTokens')

    setShowWiFiPortalLinks(hasWiFiPermissions)
  }, [currentUser])

  // Check WiFi integrations for current business (for business-specific menu/sales links)
  useEffect(() => {
    const checkWiFiIntegrations = async () => {
      if (!currentBusinessId) {
        setEsp32IntegrationEnabled(false)
        setR710IntegrationEnabled(false)
        return
      }

      try {
        // Check ESP32 integration
        const esp32Response = await fetch(`/api/business/${currentBusinessId}/wifi-tokens`)
        if (esp32Response.ok) {
          const esp32Data = await esp32Response.json()
          setEsp32IntegrationEnabled(esp32Data.success && esp32Data.menuItems && esp32Data.menuItems.length > 0)
        }

        // Check R710 integration
        const r710Response = await fetch(`/api/r710/integration?businessId=${currentBusinessId}`)
        if (r710Response.ok) {
          const r710Data = await r710Response.json()
          setR710IntegrationEnabled(r710Data.hasIntegration || false)
        }
      } catch (error) {
        console.error('Failed to check WiFi integrations:', error)
      }
    }

    checkWiFiIntegrations()
  }, [currentBusinessId])

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

  // Check cart counts for all businesses
  useEffect(() => {
    const checkCartCounts = () => {
      const counts: Record<string, number> = {}

      businesses.forEach(business => {
        try {
          const cartKey = `cart-${business.id}`
          const cartData = localStorage.getItem(cartKey)
          if (cartData) {
            const cart = JSON.parse(cartData)
            if (Array.isArray(cart) && cart.length > 0) {
              // Count total items in cart
              const itemCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0)
              counts[business.id] = itemCount
            }
          }
        } catch (error) {
          // Ignore localStorage errors
        }
      })

      setBusinessCartCounts(counts)
    }

    if (businesses.length > 0) {
      checkCartCounts()

      // Listen for storage events to update counts when carts change
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key?.startsWith('cart-')) {
          checkCartCounts()
        }
      }
      window.addEventListener('storage', handleStorageChange)

      // Also poll every 2 seconds to catch same-tab changes
      const interval = setInterval(checkCartCounts, 2000)

      return () => {
        window.removeEventListener('storage', handleStorageChange)
        clearInterval(interval)
      }
    }
  }, [businesses])

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

        console.log(`🔗 [Sidebar] Navigating from ${currentPath} to: ${targetPath}`)

        // Force navigation to the correct route
        await router.push(targetPath)

        // Verify navigation completed - retry if needed
        setTimeout(() => {
          if (window.location.pathname !== targetPath) {
            console.warn(`⚠️ [Sidebar] Navigation didn't complete. Retrying: ${targetPath}`)
            router.push(targetPath)
          }
        }, 100)
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
        {checkPermission(currentUser, 'canAccessFinancialData') && (
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
                        className={`w-full text-left text-sm px-3 py-2 rounded transition-colors relative ${
                          currentBusiness?.businessId === business.id
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col truncate">
                            <div className="flex items-center gap-2">
                              <span className="truncate">{business.name}</span>
                              {/* Cart indicator badge */}
                              {businessCartCounts[business.id] > 0 && (
                                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full min-w-[20px]">
                                  {businessCartCounts[business.id]}
                                </span>
                              )}
                            </div>
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
                {/* Sales Reports - Only for managers/admins, not salespersons */}
                {(isSystemAdmin(currentUser) || checkPermission(currentUser, 'canViewWifiReports') || checkPermission(currentUser, 'canAccessFinancialData')) && (
                  <Link href="/restaurant/reports" className={getLinkClasses('/restaurant/reports')}>
                    <span className="text-lg">📊</span>
                    <span>Sales Reports</span>
                  </Link>
                )}
                {/* Menu Management - Only for managers/admins who can manage menu */}
                {(isSystemAdmin(currentUser) || checkPermission(currentUser, 'canManageMenu')) && (
                  <Link href="/restaurant/menu" className={getLinkClasses('/restaurant/menu')}>
                    <span className="text-lg">📋</span>
                    <span>Menu Management</span>
                  </Link>
                )}
                {/* ESP32 Menu Config - Requires canConfigureWifiTokens */}
                {(isSystemAdmin(currentUser) || checkPermission(currentUser, 'canConfigureWifiTokens')) && esp32IntegrationEnabled && (
                  <Link href="/restaurant/wifi-tokens" className={getLinkClasses('/restaurant/wifi-tokens')}>
                    <span className="text-lg">📡</span>
                    <span>ESP32 Menu Config</span>
                  </Link>
                )}
                {/* R710 Menu Config - Requires canConfigureWifiTokens (NOT canSellWifiTokens) */}
                {(isSystemAdmin(currentUser) || checkPermission(currentUser, 'canConfigureWifiTokens')) && r710IntegrationEnabled && (
                  <Link href="/restaurant/r710-tokens" className={getLinkClasses('/restaurant/r710-tokens')}>
                    <span className="text-lg">📶</span>
                    <span>R710 Menu Config</span>
                  </Link>
                )}
                {/* ESP32 WiFi Sales - For users who can sell tokens */}
                {(isSystemAdmin(currentUser) || checkPermission(currentUser, 'canSellWifiTokens')) && esp32IntegrationEnabled && (
                  <Link href="/wifi-portal/sales" className={getLinkClasses('/wifi-portal/sales')}>
                    <span className="text-lg">🎫</span>
                    <span>ESP32 WiFi Sales</span>
                  </Link>
                )}
                {/* R710 WiFi Sales - For users who can sell tokens */}
                {(isSystemAdmin(currentUser) || checkPermission(currentUser, 'canSellWifiTokens')) && r710IntegrationEnabled && (
                  <Link href="/r710-portal/sales" className={getLinkClasses('/r710-portal/sales')}>
                    <span className="text-lg">💵</span>
                    <span>R710 WiFi Sales</span>
                  </Link>
                )}
              </>
            )}

            {/* Grocery Features */}
            {currentBusiness.businessType === 'grocery' && (
              <>
                <Link href="/grocery/pos" className={getLinkClasses('/grocery/pos')}>
                  <span className="text-lg">🛒</span>
                  <span>POS System</span>
                </Link>
                {/* Sales Reports - Only for managers/admins */}
                {(isSystemAdmin(currentUser) || checkPermission(currentUser, 'canViewWifiReports') || checkPermission(currentUser, 'canAccessFinancialData')) && (
                  <Link href="/restaurant/reports" className={getLinkClasses('/restaurant/reports')}>
                    <span className="text-lg">📊</span>
                    <span>Sales Reports</span>
                  </Link>
                )}
                <Link href="/grocery/products" className={getLinkClasses('/grocery/products')}>
                  <span className="text-lg">📦</span>
                  <span>Products</span>
                </Link>
                {/* ESP32 Menu Config - Requires canConfigureWifiTokens */}
                {(isSystemAdmin(currentUser) || checkPermission(currentUser, 'canConfigureWifiTokens')) && esp32IntegrationEnabled && (
                  <Link href="/grocery/wifi-tokens" className={getLinkClasses('/grocery/wifi-tokens')}>
                    <span className="text-lg">📡</span>
                    <span>ESP32 Menu Config</span>
                  </Link>
                )}
                {/* R710 Menu Config - Requires canConfigureWifiTokens */}
                {(isSystemAdmin(currentUser) || checkPermission(currentUser, 'canConfigureWifiTokens')) && r710IntegrationEnabled && (
                  <Link href="/grocery/r710-tokens" className={getLinkClasses('/grocery/r710-tokens')}>
                    <span className="text-lg">📶</span>
                    <span>R710 Menu Config</span>
                  </Link>
                )}
                {/* ESP32 WiFi Sales - For users who can sell tokens */}
                {(isSystemAdmin(currentUser) || checkPermission(currentUser, 'canSellWifiTokens')) && esp32IntegrationEnabled && (
                  <Link href="/wifi-portal/sales" className={getLinkClasses('/wifi-portal/sales')}>
                    <span className="text-lg">🎫</span>
                    <span>ESP32 WiFi Sales</span>
                  </Link>
                )}
                {/* R710 WiFi Sales - For users who can sell tokens */}
                {(isSystemAdmin(currentUser) || checkPermission(currentUser, 'canSellWifiTokens')) && r710IntegrationEnabled && (
                  <Link href="/r710-portal/sales" className={getLinkClasses('/r710-portal/sales')}>
                    <span className="text-lg">💵</span>
                    <span>R710 WiFi Sales</span>
                  </Link>
                )}
              </>
            )}

            {/* Clothing Features */}
            {currentBusiness.businessType === 'clothing' && (
              <>
                <Link href="/clothing/pos" className={getLinkClasses('/clothing/pos')}>
                  <span className="text-lg">👕</span>
                  <span>POS System</span>
                </Link>
                {/* Sales Reports - Only for managers/admins */}
                {(isSystemAdmin(currentUser) || checkPermission(currentUser, 'canViewWifiReports') || checkPermission(currentUser, 'canAccessFinancialData')) && (
                  <Link href="/restaurant/reports" className={getLinkClasses('/restaurant/reports')}>
                    <span className="text-lg">📊</span>
                    <span>Sales Reports</span>
                  </Link>
                )}
                <Link href="/clothing/products" className={getLinkClasses('/clothing/products')}>
                  <span className="text-lg">👗</span>
                  <span>Products</span>
                </Link>
                {/* ESP32 Menu Config - Requires canConfigureWifiTokens */}
                {(isSystemAdmin(currentUser) || checkPermission(currentUser, 'canConfigureWifiTokens')) && esp32IntegrationEnabled && (
                  <Link href="/clothing/wifi-tokens" className={getLinkClasses('/clothing/wifi-tokens')}>
                    <span className="text-lg">📡</span>
                    <span>ESP32 Menu Config</span>
                  </Link>
                )}
                {/* R710 Menu Config - Requires canConfigureWifiTokens */}
                {(isSystemAdmin(currentUser) || checkPermission(currentUser, 'canConfigureWifiTokens')) && r710IntegrationEnabled && (
                  <Link href="/clothing/r710-tokens" className={getLinkClasses('/clothing/r710-tokens')}>
                    <span className="text-lg">📶</span>
                    <span>R710 Menu Config</span>
                  </Link>
                )}
                {/* ESP32 WiFi Sales - For users who can sell tokens */}
                {(isSystemAdmin(currentUser) || checkPermission(currentUser, 'canSellWifiTokens')) && esp32IntegrationEnabled && (
                  <Link href="/wifi-portal/sales" className={getLinkClasses('/wifi-portal/sales')}>
                    <span className="text-lg">🎫</span>
                    <span>ESP32 WiFi Sales</span>
                  </Link>
                )}
                {/* R710 WiFi Sales - For users who can sell tokens */}
                {(isSystemAdmin(currentUser) || checkPermission(currentUser, 'canSellWifiTokens')) && r710IntegrationEnabled && (
                  <Link href="/r710-portal/sales" className={getLinkClasses('/r710-portal/sales')}>
                    <span className="text-lg">💵</span>
                    <span>R710 WiFi Sales</span>
                  </Link>
                )}
              </>
            )}

            {/* Hardware Features */}
            {currentBusiness.businessType === 'hardware' && (
              <>
                <Link href="/hardware/pos" className={getLinkClasses('/hardware/pos')}>
                  <span className="text-lg">🔧</span>
                  <span>POS System</span>
                </Link>
                {/* Sales Reports - Only for managers/admins */}
                {(isSystemAdmin(currentUser) || checkPermission(currentUser, 'canViewWifiReports') || checkPermission(currentUser, 'canAccessFinancialData')) && (
                  <Link href="/restaurant/reports" className={getLinkClasses('/restaurant/reports')}>
                    <span className="text-lg">📊</span>
                    <span>Sales Reports</span>
                  </Link>
                )}
                <Link href="/hardware/products" className={getLinkClasses('/hardware/products')}>
                  <span className="text-lg">🛠️</span>
                  <span>Products</span>
                </Link>
                {/* ESP32 Menu Config - Requires canConfigureWifiTokens */}
                {(isSystemAdmin(currentUser) || checkPermission(currentUser, 'canConfigureWifiTokens')) && esp32IntegrationEnabled && (
                  <Link href="/hardware/wifi-tokens" className={getLinkClasses('/hardware/wifi-tokens')}>
                    <span className="text-lg">📡</span>
                    <span>ESP32 Menu Config</span>
                  </Link>
                )}
                {/* R710 Menu Config - Requires canConfigureWifiTokens */}
                {(isSystemAdmin(currentUser) || checkPermission(currentUser, 'canConfigureWifiTokens')) && r710IntegrationEnabled && (
                  <Link href="/hardware/r710-tokens" className={getLinkClasses('/hardware/r710-tokens')}>
                    <span className="text-lg">📶</span>
                    <span>R710 Menu Config</span>
                  </Link>
                )}
                {/* ESP32 WiFi Sales - For users who can sell tokens */}
                {(isSystemAdmin(currentUser) || checkPermission(currentUser, 'canSellWifiTokens')) && esp32IntegrationEnabled && (
                  <Link href="/wifi-portal/sales" className={getLinkClasses('/wifi-portal/sales')}>
                    <span className="text-lg">🎫</span>
                    <span>ESP32 WiFi Sales</span>
                  </Link>
                )}
                {/* R710 WiFi Sales - For users who can sell tokens */}
                {(isSystemAdmin(currentUser) || checkPermission(currentUser, 'canSellWifiTokens')) && r710IntegrationEnabled && (
                  <Link href="/r710-portal/sales" className={getLinkClasses('/r710-portal/sales')}>
                    <span className="text-lg">💵</span>
                    <span>R710 WiFi Sales</span>
                  </Link>
                )}
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
  {checkPermission(currentUser, 'canAccessPersonalFinance') && (
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
  {(checkPermission(currentUser, 'canAccessVehicles') || checkPermission(currentUser, 'canLogDriverTrips') || checkPermission(currentUser, 'canLogDriverMaintenance')) && (
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
  {checkPermission(currentUser, 'canManagePersonalContractors') && (
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
        {(checkPermission(currentUser, 'canManageEmployees') || checkPermission(currentUser, 'canEditEmployees') || checkPermission(currentUser, 'canManageBusinessUsers')) && (
          <Link
            href="/employees"
            className="sidebar-link flex items-center space-x-3"
          >
            <span className="text-lg">👤</span>
            <span>Employees</span>
          </Link>
        )}

        {/* Payroll - Only for users with payroll permissions */}
        {checkPermission(currentUser, 'canAccessPayroll') && (
          <Link
            href="/payroll"
            className={getLinkClasses('/payroll')}
          >
            <span className="text-lg">💵</span>
            <span>Payroll</span>
          </Link>
        )}

        {/* Payroll Account - Only for users with payroll account permissions */}
        {checkPermission(currentUser, 'canAccessPayrollAccount') && (
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
                {checkPermission(currentUser, 'canMakePayrollDeposits') && (
                  <Link
                    href="/payroll/account/deposits"
                    className="text-sm text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded flex items-center space-x-2"
                  >
                    <span>💸</span>
                    <span>Deposits</span>
                  </Link>
                )}

                {checkPermission(currentUser, 'canMakePayrollPayments') && (
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

                {checkPermission(currentUser, 'canViewPayrollHistory') && (
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
        {checkPermission(currentUser, 'canAccessExpenseAccount') && (
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
                {checkPermission(currentUser, 'canCreateExpenseAccount') && (
                  <Link
                    href="/expense-accounts/new"
                    className="text-sm text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded flex items-center space-x-2"
                  >
                    <span>➕</span>
                    <span>Create Account</span>
                  </Link>
                )}

                {checkPermission(currentUser, 'canViewExpenseReports') && (
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

        {/* Payee Management - Only for users with payee permissions */}
        {checkPermission(currentUser, 'canViewPayees') && (
          <Link
            href="/payees"
            className={getLinkClasses('/payees')}
          >
            <span className="text-lg">👥</span>
            <span>Payee Management</span>
          </Link>
        )}

        {/* ESP32 WiFi Portal - Only for admins/managers who can setup integration */}
        {(isSystemAdmin(currentUser) || checkPermission(currentUser, 'canSetupPortalIntegration')) && (
          <Link
            href="/wifi-portal"
            className={getLinkClasses('/wifi-portal')}
          >
            <span className="text-lg">📡</span>
            <span>ESP32 WiFi Portal</span>
          </Link>
        )}

        {/* R710 WiFi Portal - Only for admins/managers who can setup integration */}
        {(isSystemAdmin(currentUser) || checkPermission(currentUser, 'canSetupPortalIntegration')) && (
          <Link
            href="/r710-portal"
            className={getLinkClasses('/r710-portal')}
          >
            <span className="text-lg">📶</span>
            <span>R710 WiFi Portal</span>
          </Link>
        )}

        {/* Reports - Only for managers and admins, not drivers */}
        {(checkPermission(currentUser, 'canManageBusinessUsers') || checkPermission(currentUser, 'canAccessFinancialData')) && (
          <Link
            href="/reports"
            className="sidebar-link flex items-center space-x-3"
          >
            <span className="text-lg">📈</span>
            <span>Reports</span>
          </Link>
        )}

        {/* HR Reports - Only for users with actual employee management permissions */}
        {(checkPermission(currentUser, 'canManageEmployees') || checkPermission(currentUser, 'canEditEmployees')) && (
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

        {/* Receipt History - Universal receipt search and reprint */}
        <Link
          href={`/universal/receipts${currentBusinessId ? `?businessId=${currentBusinessId}` : ''}`}
          className={getLinkClasses('/universal/receipts')}
        >
          <span className="text-lg">🧾</span>
          <span>Receipt History</span>
        </Link>

        {/* Business Categories - Cross-business functionality */}
        {(checkPermission(currentUser, 'canCreateBusinessCategories') ||
          checkPermission(currentUser, 'canEditBusinessCategories') ||
          checkPermission(currentUser, 'canDeleteBusinessCategories')) && (
          <Link
            href="/business/categories"
            className={getLinkClasses('/business/categories')}
          >
            <span className="text-lg">📁</span>
            <span>Business Categories</span>
          </Link>
        )}

        {/* Inventory Categories - Business-specific inventory category management */}
        {(checkPermission(currentUser, 'canCreateInventoryCategories') ||
          checkPermission(currentUser, 'canEditInventoryCategories') ||
          checkPermission(currentUser, 'canDeleteInventoryCategories')) && (
          <Link
            href="/business/inventory-categories"
            className={getLinkClasses('/business/inventory-categories')}
          >
            <span className="text-lg">📦</span>
            <span>Inventory Categories</span>
          </Link>
        )}

        {/* Barcode Management - Universal barcode template and print job management */}
        {(checkPermission(currentUser, 'canViewBarcodeTemplates') ||
          checkPermission(currentUser, 'canManageBarcodeTemplates')) && (
          <Link
            href={`/universal/barcode-management${currentBusinessId ? `?businessId=${currentBusinessId}` : ''}`}
            className={getLinkClasses('/universal/barcode-management')}
          >
            <span className="text-lg">🏷️</span>
            <span>Barcode Management</span>
          </Link>
        )}

        {/* Supplier Management - Business-specific supplier management */}
        {(checkPermission(currentUser, 'canViewSuppliers') ||
          checkPermission(currentUser, 'canCreateSuppliers') ||
          checkPermission(currentUser, 'canEditSuppliers')) && (
          <Link
            href="/business/suppliers"
            className={getLinkClasses('/business/suppliers')}
          >
            <span className="text-lg">🚚</span>
            <span>Suppliers</span>
          </Link>
        )}

        {/* Location Management - Business-specific location management */}
        {(checkPermission(currentUser, 'canViewLocations') ||
          checkPermission(currentUser, 'canCreateLocations') ||
          checkPermission(currentUser, 'canEditLocations')) && (
          <Link
            href="/business/locations"
            className={getLinkClasses('/business/locations')}
          >
            <span className="text-lg">📍</span>
            <span>Locations</span>
          </Link>
        )}

        {/* Customer Management - Cross-business functionality */}
        {(checkPermission(currentUser, 'canAccessCustomers') || checkPermission(currentUser, 'canManageCustomers')) && (
          <Link
            href="/customers"
            className={getLinkClasses('/customers')}
          >
            <span className="text-lg">👥</span>
            <span>Customer Management</span>
          </Link>
        )}

        {/* Layby Management - Cross-business functionality */}
        {checkPermission(currentUser, 'canManageLaybys') && (
          <Link
            href="/business/laybys"
            className={getLinkClasses('/business/laybys')}
          >
            <span className="text-lg">🛍️</span>
            <span>Layby Management</span>
          </Link>
        )}

        {/* Project Management - Cross-business functionality */}
  {(checkPermission(currentUser, 'canViewProjects') || checkPermission(currentUser, 'canAccessPersonalFinance')) && (
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
        {(checkPermission(currentUser, 'canManageEmployees') ||
          checkPermission(currentUser, 'canManageJobTitles') ||
          checkPermission(currentUser, 'canEditEmployees') ||
          checkPermission(currentUser, 'canManageBenefitTypes') ||
          checkPermission(currentUser, 'canManageCompensationTypes') ||
          checkPermission(currentUser, 'canManageDisciplinaryActions')) && (
          <>
            <div className="pt-4 pb-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Employee Management</h3>
            </div>

            {checkPermission(currentUser, 'canManageJobTitles') && (
              <Link
                href="/admin/job-titles"
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">💼</span>
                <span>Job Titles</span>
              </Link>
            )}

            {checkPermission(currentUser, 'canEditEmployees') && (
              <Link
                href="/admin/hierarchy"
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">🌳</span>
                <span>Hierarchy</span>
              </Link>
            )}

            {(checkPermission(currentUser, 'canManageBenefitTypes') || checkPermission(currentUser, 'canManageCompensationTypes')) && (
              <Link
                href="/admin/benefits"
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">💰</span>
                <span>Benefits & Compensation</span>
              </Link>
            )}

            {checkPermission(currentUser, 'canManageDisciplinaryActions') && (
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
        
  {(checkPermission(currentUser, 'canManageBusinessUsers') || checkPermission(currentUser, 'canManageBusinessSettings')) && (
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

            {(isSystemAdmin(currentUser) || checkPermission(currentUser, 'canManageWifiPortal')) && (
              <Link
                href={
                  pathname.startsWith('/r710-portal')
                    ? '/admin/connected-clients?system=R710'
                    : pathname.startsWith('/wifi-portal')
                    ? '/admin/connected-clients?system=ESP32'
                    : '/admin/connected-clients'
                }
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">📡</span>
                <span>Connected Clients</span>
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
            
            {checkPermission(currentUser, 'canManageBusinessUsers') && (
              <Link 
                href="/admin/users" 
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">👥</span>
                <span>User Management</span>
              </Link>
            )}
            
            {checkPermission(currentUser, 'canManageBusinessSettings') && (
              <Link 
                href="/admin/settings" 
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">⚙️</span>
                <span>System Settings</span>
              </Link>
            )}
            
            {checkPermission(currentUser, 'canManageBusinessUsers') && (
              <Link 
                href="/business/manage" 
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">🏢</span>
                <span>Business Management</span>
              </Link>
            )}
            
            {checkPermission(currentUser, 'canAccessFinancialData') && (
              <Link
                href="/business/manage/loans"
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">💰</span>
                <span>Business Loans</span>
              </Link>
            )}

            {checkPermission(currentUser, 'canManageBusinessSettings') && (
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