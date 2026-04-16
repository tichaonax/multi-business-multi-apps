'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { canAccessModule, hasPermission, checkPermission, isSystemAdmin, hasUserPermission, SessionUser } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useNavigation } from '@/contexts/navigation-context'
import { useGlobalCart } from '@/contexts/global-cart-context'
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
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [businessGroups, setBusinessGroups] = useState<BusinessGroup[]>([])
  const [expandedBusinessTypes, setExpandedBusinessTypes] = useState<Set<string>>(new Set())
  const [businessSectionExpanded, setBusinessSectionExpanded] = useState(false)
  const [financeOpsSectionExpanded, setFinanceOpsSectionExpanded] = useState(
    () => pathname.startsWith('/expense-accounts') || pathname.startsWith('/payroll') || pathname.startsWith('/payees') || pathname.startsWith('/reports') || pathname.startsWith('/supplier-payments')
  )
  const [toolsSectionExpanded, setToolsSectionExpanded] = useState(false)
  const [employeeSectionExpanded, setEmployeeSectionExpanded] = useState(false)
  const [adminSectionExpanded, setAdminSectionExpanded] = useState(false)
  const [loadingBusinesses, setLoadingBusinesses] = useState(false)
  const [showRevenueModal, setShowRevenueModal] = useState(false)
  const [esp32IntegrationEnabled, setEsp32IntegrationEnabled] = useState(false)
  const [esp32HasMenuItems, setEsp32HasMenuItems] = useState(false)
  const [grantedAccounts, setGrantedAccounts] = useState<{ id: string; accountName: string; accountNumber: string; permissionLevel: string }[]>([])
  const hasTransferrableAccounts = isSystemAdmin(currentUser) || grantedAccounts.some(a => a.permissionLevel === 'FULL')
  const [r710IntegrationEnabled, setR710IntegrationEnabled] = useState(false)
  const [r710HasMenuItems, setR710HasMenuItems] = useState(false)
  const [showWiFiPortalLinks, setShowWiFiPortalLinks] = useState(false)
  const [businessCartCounts, setBusinessCartCounts] = useState<Record<string, number>>({})
  const [pendingPaymentRequestCount, setPendingPaymentRequestCount] = useState(0)
  const [pendingLoanLockCount, setPendingLoanLockCount] = useState(0)
  const [pendingPettyCashCount, setPendingPettyCashCount] = useState(0)
  const [pendingCashAllocCount, setPendingCashAllocCount] = useState(0)
  const [canApprovePettyCashSys, setCanApprovePettyCashSys] = useState(false)
  const [canRequestPettyCashSys, setCanRequestPettyCashSys] = useState(false)
  const [canApproveCashAllocSys, setCanApproveCashAllocSys] = useState(false)

  // Get business context
  const {
    currentBusiness,
    currentBusinessId,
    hasPermission: hasBusinessPermission,
    isAuthenticated,
    loading: businessLoading,
    businesses: businessMemberships,
    switchBusiness,
    hasPermission
  } = useBusinessPermissionsContext()

  // Get global cart for real-time sidebar badge updates
  const { getCartItemCount: getGlobalCartCount } = useGlobalCart()

  // Fetch user profile photo from linked employee record
  useEffect(() => {
    if (!currentUser?.id) return
    fetch('/api/user/profile', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.profilePhotoUrl) setProfilePhotoUrl(data.profilePhotoUrl) })
      .catch(() => {})
  }, [currentUser?.id])

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

  // Fetch cross-business expense account grants for sidebar
  useEffect(() => {
    if (!currentUser || isSystemAdmin(currentUser)) return
    if (!hasPermission('canAccessExpenseAccount')) return
    fetch('/api/expense-account/my-grants', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.success) setGrantedAccounts(data.data || []) })
      .catch(() => {})
  }, [currentUser])

  // Fetch pending supplier payment request count for badge
  useEffect(() => {
    if (!currentBusinessId || !hasPermission('canViewSupplierPaymentQueue')) {
      setPendingPaymentRequestCount(0)
      return
    }
    fetch(`/api/supplier-payments/requests?businessId=${currentBusinessId}&status=PENDING&limit=1`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { setPendingPaymentRequestCount(data?.pagination?.total ?? 0) })
      .catch(() => {})
  }, [currentBusinessId])

  // Fetch pending loan lock + petty cash counts for sidebar badges
  useEffect(() => {
    if (!currentUser) return
    fetch('/api/admin/pending-actions', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        setPendingLoanLockCount(data.loanLockRequests?.length ?? 0)
        setPendingPettyCashCount(data.pendingPettyCash?.length ?? 0)
        setPendingCashAllocCount(data.pendingCashAllocations?.length ?? 0)
        setPendingPaymentRequestCount((data.pendingPaymentBatches?.length ?? 0) + (data.pendingPaymentRequests?.length ?? 0))
        setCanApprovePettyCashSys(data.canApprovePettyCash ?? false)
        setCanRequestPettyCashSys(data.canRequestPettyCash ?? false)
        setCanApproveCashAllocSys(data.canApproveCashAlloc ?? false)
      })
      .catch(() => {})
  }, [currentUser])

  // Check if user has WiFi setup permissions (for main WiFi Portal links)
  useEffect(() => {
    const hasWiFiPermissions = isSystemAdmin(currentUser) ||
      hasPermission('canManageWifiPortal') ||
      hasPermission('canSetupPortalIntegration') ||
      hasPermission('canConfigureWifiTokens') ||
      hasPermission('canSellWifiTokens')

    setShowWiFiPortalLinks(hasWiFiPermissions)
  }, [currentUser])

  // Check WiFi integrations for current business (for business-specific menu/sales links)
  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    const checkWiFiIntegrations = async () => {
      if (!currentBusinessId) {
        setEsp32IntegrationEnabled(false)
        setEsp32HasMenuItems(false)
        setR710IntegrationEnabled(false)
        setR710HasMenuItems(false)
        return
      }

      try {
        // ESP32: check integration first (200 = enabled, 404 = not set up)
        const esp32IntRes = await fetch(`/api/wifi-portal/integration?businessId=${currentBusinessId}`, { signal })
        const esp32Enabled = esp32IntRes.ok
        setEsp32IntegrationEnabled(esp32Enabled)

        // ESP32: check menu items (only matters for showing Sales links)
        if (esp32Enabled) {
          const esp32MenuRes = await fetch(`/api/business/${currentBusinessId}/wifi-tokens`, { signal })
          if (esp32MenuRes.ok) {
            const esp32MenuData = await esp32MenuRes.json()
            setEsp32HasMenuItems(esp32MenuData.success && esp32MenuData.menuItems?.length > 0)
          }
        } else {
          setEsp32HasMenuItems(false)
        }

        // R710: check integration
        const r710IntRes = await fetch(`/api/r710/integration?businessId=${currentBusinessId}`, { signal })
        const r710Enabled = r710IntRes.ok
        setR710IntegrationEnabled(r710Enabled)

        // R710: check menu items (only matters for showing Sales links)
        if (r710Enabled) {
          const r710MenuRes = await fetch(`/api/business/${currentBusinessId}/r710-tokens`, { signal })
          if (r710MenuRes.ok) {
            const r710MenuData = await r710MenuRes.json()
            setR710HasMenuItems(r710MenuData.success && r710MenuData.menuItems?.length > 0)
          }
        } else {
          setR710HasMenuItems(false)
        }
      } catch (error) {
        if ((error as any)?.name !== 'AbortError') {
          console.error('Failed to check WiFi integrations:', error)
        }
      }
    }

    checkWiFiIntegrations()

    // Re-check whenever a WiFi menu config page saves changes
    window.addEventListener('wifi-menu-updated', checkWiFiIntegrations)
    return () => {
      controller.abort()
      window.removeEventListener('wifi-menu-updated', checkWiFiIntegrations)
    }
  }, [currentBusinessId, pathname])

  // Helper function to group businesses by type - DYNAMIC with "Other" category
  const groupBusinessesByType = (businessList: Business[]) => {
    // Define which types get their own labeled group in the sidebar
    const primaryTypes = ['restaurant', 'grocery', 'clothing', 'hardware', 'construction', 'services', 'retail', 'consulting']

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
          // Check both POS cart and global cart keys
          const posCartData = localStorage.getItem(`cart-${business.id}`)
          const globalCartData = localStorage.getItem(`global-cart-${business.id}`)

          let totalItems = 0
          const countedVariants = new Set<string>()

          // Count POS cart items
          if (posCartData) {
            const posCart = JSON.parse(posCartData)
            if (Array.isArray(posCart)) {
              posCart.forEach((item: any) => {
                const key = item.variantId || item.id
                countedVariants.add(key)
                totalItems += (item.quantity || 1)
              })
            }
          }

          // Count global cart items (avoid duplicates already in POS cart)
          if (globalCartData) {
            const globalCart = JSON.parse(globalCartData)
            if (Array.isArray(globalCart)) {
              globalCart.forEach((item: any) => {
                const key = item.variantId || item.id
                if (!countedVariants.has(key)) {
                  totalItems += (item.quantity || 1)
                }
              })
            }
          }

          if (totalItems > 0) {
            counts[business.id] = totalItems
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
        if (e.key?.startsWith('cart-') || e.key?.startsWith('global-cart-')) {
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
        {hasPermission('canAccessFinancialData') && (
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
                    {/* Cart indicator on collapsed business type — shows when any business in group has items in cart */}
                    {!expandedBusinessTypes.has(group.type) && group.businesses.some(b =>
                      (b.id === currentBusinessId ? getGlobalCartCount() : (businessCartCounts[b.id] || 0)) > 0
                    ) && (
                      <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                    )}
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
                              {/* Cart indicator badge - use global cart for current business (real-time), localStorage for others */}
                              {(() => {
                                const count = business.id === currentBusinessId
                                  ? getGlobalCartCount()
                                  : (businessCartCounts[business.id] || 0)
                                return count > 0 ? (
                                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full min-w-[20px]">
                                    {count}
                                  </span>
                                ) : null
                              })()}
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
            <button
              type="button"
              onClick={() => setBusinessSectionExpanded(prev => !prev)}
              className="w-full flex items-center justify-between pt-4 pb-2 text-left"
            >
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {currentBusiness.businessName}
              </h3>
              <span className="text-gray-400 text-xs">{businessSectionExpanded ? '▼' : '▶'}</span>
            </button>

            {businessSectionExpanded && (<>
            {/* Restaurant Features */}
            {currentBusiness.businessType === 'restaurant' && (
              <>
                <Link href="/restaurant/pos" className={getLinkClasses('/restaurant/pos')}>
                  <span className="text-lg">🍽️</span>
                  <span>POS System</span>
                </Link>
                {/* Sales Reports - Only for managers/admins, not salespersons */}
                {(isSystemAdmin(currentUser) || hasPermission('canViewWifiReports') || hasPermission('canAccessFinancialData')) && (
                  <Link href="/restaurant/reports" className={getLinkClasses('/restaurant/reports')}>
                    <span className="text-lg">📊</span>
                    <span>Sales Reports</span>
                  </Link>
                )}
                {(isSystemAdmin(currentUser) || hasPermission('canRunCashAllocationReport')) && canApproveCashAllocSys && (
                  <Link href="/restaurant/reports/cash-allocation" className={getLinkClasses('/restaurant/reports/cash-allocation')}>
                    <span className="text-lg">💰</span>
                    <span>Cash Allocation</span>
                  </Link>
                )}
                  <Link href="/restaurant/menu" className={getLinkClasses('/restaurant/menu')}>
                    <span className="text-lg">📋</span>
                    <span>Menu Management</span>
                  </Link>
                {/* Business Services */}
                <Link href="/services/list" className={getLinkClasses('/services/list')}>
                  <span className="text-lg">🔧</span>
                  <span>Services</span>
                </Link>
                {/* ESP32 Menu Config - Requires canConfigureWifiTokens */}
                {(isSystemAdmin(currentUser) || hasPermission('canConfigureWifiTokens')) && esp32IntegrationEnabled && (
                  <Link href="/restaurant/wifi-tokens" className={getLinkClasses('/restaurant/wifi-tokens')}>
                    <span className="text-lg">📡</span>
                    <span>ESP32 Menu Config</span>
                  </Link>
                )}
                {/* R710 Menu Config - Requires canConfigureWifiTokens (NOT canSellWifiTokens) */}
                {(isSystemAdmin(currentUser) || hasPermission('canConfigureWifiTokens')) && r710IntegrationEnabled && (
                  <Link href="/restaurant/r710-tokens" className={getLinkClasses('/restaurant/r710-tokens')}>
                    <span className="text-lg">📶</span>
                    <span>R710 Menu Config</span>
                  </Link>
                )}
                {/* ESP32 WiFi Sales - For users who can sell tokens; only when menu items configured */}
                {(isSystemAdmin(currentUser) || hasPermission('canSellWifiTokens')) && esp32IntegrationEnabled && esp32HasMenuItems && (
                  <Link href="/wifi-portal/sales" className={getLinkClasses('/wifi-portal/sales')}>
                    <span className="text-lg">🎫</span>
                    <span>ESP32 WiFi Sales</span>
                  </Link>
                )}
                {/* R710 WiFi Sales - For users who can sell tokens; only when menu items configured */}
                {(isSystemAdmin(currentUser) || hasPermission('canSellWifiTokens')) && r710IntegrationEnabled && r710HasMenuItems && (
                  <Link href="/r710-portal/sales" className={getLinkClasses('/r710-portal/sales')}>
                    <span className="text-lg">💵</span>
                    <span>R710 WiFi Sales</span>
                  </Link>
                )}
                {/* Meal Program — management links only for managers/admins */}
                {(isSystemAdmin(currentUser) || hasPermission('canManageEmployees') || hasPermission('canManageMenu') || hasPermission('canManageInventory')) && (
                  <>
                    <Link href="/restaurant/meal-program/participants" className={getLinkClasses('/restaurant/meal-program/participants')}>
                      <span className="text-lg">👥</span>
                      <span>Meal Program · Participants</span>
                    </Link>
                    <Link href="/restaurant/meal-program/eligible-items" className={getLinkClasses('/restaurant/meal-program/eligible-items')}>
                      <span className="text-lg">🍱</span>
                      <span>Meal Program · Items</span>
                    </Link>
                  </>
                )}
                {(isSystemAdmin(currentUser) || hasPermission('canViewBusiness')) && (
                  <Link href="/restaurant/settings/pos" className={getLinkClasses('/restaurant/settings/pos')}>
                    <span className="text-lg">⚙️</span>
                    <span>POS Settings</span>
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
                {(isSystemAdmin(currentUser) || hasPermission('canViewWifiReports') || hasPermission('canAccessFinancialData')) && (
                  <Link href="/grocery/reports" className={getLinkClasses('/grocery/reports')}>
                    <span className="text-lg">📊</span>
                    <span>Sales Reports</span>
                  </Link>
                )}
                {(isSystemAdmin(currentUser) || hasPermission('canRunCashAllocationReport')) && canApproveCashAllocSys && (
                  <Link href="/grocery/reports/cash-allocation" className={getLinkClasses('/grocery/reports/cash-allocation')}>
                    <span className="text-lg">💰</span>
                    <span>Cash Allocation</span>
                  </Link>
                )}
                <Link href="/grocery/products" className={getLinkClasses('/grocery/products')}>
                  <span className="text-lg">📦</span>
                  <span>Products</span>
                </Link>
                <Link href="/grocery/inventory?tab=bales" className={getLinkClasses('/grocery/inventory')}>
                  <span className="text-lg">📦</span>
                  <span>Bales Inventory</span>
                </Link>
                {/* Business Services */}
                <Link href="/services/list" className={getLinkClasses('/services/list')}>
                  <span className="text-lg">🔧</span>
                  <span>Services</span>
                </Link>
                {/* ESP32 Menu Config - Requires canConfigureWifiTokens */}
                {(isSystemAdmin(currentUser) || hasPermission('canConfigureWifiTokens')) && esp32IntegrationEnabled && (
                  <Link href="/grocery/wifi-tokens" className={getLinkClasses('/grocery/wifi-tokens')}>
                    <span className="text-lg">📡</span>
                    <span>ESP32 Menu Config</span>
                  </Link>
                )}
                {/* R710 Menu Config - Requires canConfigureWifiTokens */}
                {(isSystemAdmin(currentUser) || hasPermission('canConfigureWifiTokens')) && r710IntegrationEnabled && (
                  <Link href="/grocery/r710-tokens" className={getLinkClasses('/grocery/r710-tokens')}>
                    <span className="text-lg">📶</span>
                    <span>R710 Menu Config</span>
                  </Link>
                )}
                {/* ESP32 WiFi Sales - For users who can sell tokens; only when menu items configured */}
                {(isSystemAdmin(currentUser) || hasPermission('canSellWifiTokens')) && esp32IntegrationEnabled && esp32HasMenuItems && (
                  <Link href="/wifi-portal/sales" className={getLinkClasses('/wifi-portal/sales')}>
                    <span className="text-lg">🎫</span>
                    <span>ESP32 WiFi Sales</span>
                  </Link>
                )}
                {/* R710 WiFi Sales - For users who can sell tokens; only when menu items configured */}
                {(isSystemAdmin(currentUser) || hasPermission('canSellWifiTokens')) && r710IntegrationEnabled && r710HasMenuItems && (
                  <Link href="/r710-portal/sales" className={getLinkClasses('/r710-portal/sales')}>
                    <span className="text-lg">💵</span>
                    <span>R710 WiFi Sales</span>
                  </Link>
                )}
                {(isSystemAdmin(currentUser) || hasPermission('canViewBusiness')) && (
                  <Link href="/grocery/settings/pos" className={getLinkClasses('/grocery/settings/pos')}>
                    <span className="text-lg">⚙️</span>
                    <span>POS Settings</span>
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
                {(isSystemAdmin(currentUser) || hasPermission('canViewWifiReports') || hasPermission('canAccessFinancialData')) && (
                  <Link href="/clothing/reports" className={getLinkClasses('/clothing/reports')}>
                    <span className="text-lg">📊</span>
                    <span>Sales Reports</span>
                  </Link>
                )}
                {(isSystemAdmin(currentUser) || hasPermission('canRunCashAllocationReport')) && canApproveCashAllocSys && (
                  <Link href="/clothing/reports/cash-allocation" className={getLinkClasses('/clothing/reports/cash-allocation')}>
                    <span className="text-lg">💰</span>
                    <span>Cash Allocation</span>
                  </Link>
                )}
                <Link href="/clothing/products" className={getLinkClasses('/clothing/products')}>
                  <span className="text-lg">👗</span>
                  <span>Products</span>
                </Link>
                <Link href="/clothing/inventory?tab=bales" className={getLinkClasses('/clothing/inventory')}>
                  <span className="text-lg">📦</span>
                  <span>Bales Inventory</span>
                </Link>
                {/* Business Services */}
                <Link href="/services/list" className={getLinkClasses('/services/list')}>
                  <span className="text-lg">🔧</span>
                  <span>Services</span>
                </Link>
                {/* ESP32 Menu Config - Requires canConfigureWifiTokens */}
                {(isSystemAdmin(currentUser) || hasPermission('canConfigureWifiTokens')) && esp32IntegrationEnabled && (
                  <Link href="/clothing/wifi-tokens" className={getLinkClasses('/clothing/wifi-tokens')}>
                    <span className="text-lg">📡</span>
                    <span>ESP32 Menu Config</span>
                  </Link>
                )}
                {/* R710 Menu Config - Requires canConfigureWifiTokens */}
                {(isSystemAdmin(currentUser) || hasPermission('canConfigureWifiTokens')) && r710IntegrationEnabled && (
                  <Link href="/clothing/r710-tokens" className={getLinkClasses('/clothing/r710-tokens')}>
                    <span className="text-lg">📶</span>
                    <span>R710 Menu Config</span>
                  </Link>
                )}
                {/* ESP32 WiFi Sales - For users who can sell tokens; only when menu items configured */}
                {(isSystemAdmin(currentUser) || hasPermission('canSellWifiTokens')) && esp32IntegrationEnabled && esp32HasMenuItems && (
                  <Link href="/wifi-portal/sales" className={getLinkClasses('/wifi-portal/sales')}>
                    <span className="text-lg">🎫</span>
                    <span>ESP32 WiFi Sales</span>
                  </Link>
                )}
                {/* R710 WiFi Sales - For users who can sell tokens; only when menu items configured */}
                {(isSystemAdmin(currentUser) || hasPermission('canSellWifiTokens')) && r710IntegrationEnabled && r710HasMenuItems && (
                  <Link href="/r710-portal/sales" className={getLinkClasses('/r710-portal/sales')}>
                    <span className="text-lg">💵</span>
                    <span>R710 WiFi Sales</span>
                  </Link>
                )}
                {(isSystemAdmin(currentUser) || hasPermission('canViewBusiness')) && (
                  <Link href="/clothing/settings/pos" className={getLinkClasses('/clothing/settings/pos')}>
                    <span className="text-lg">⚙️</span>
                    <span>POS Settings</span>
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
                {(isSystemAdmin(currentUser) || hasPermission('canViewWifiReports') || hasPermission('canAccessFinancialData')) && (
                  <Link href="/hardware/reports" className={getLinkClasses('/hardware/reports')}>
                    <span className="text-lg">📊</span>
                    <span>Sales Reports</span>
                  </Link>
                )}
                {(isSystemAdmin(currentUser) || hasPermission('canRunCashAllocationReport')) && canApproveCashAllocSys && (
                  <Link href="/hardware/reports/cash-allocation" className={getLinkClasses('/hardware/reports/cash-allocation')}>
                    <span className="text-lg">💰</span>
                    <span>Cash Allocation</span>
                  </Link>
                )}
                <Link href="/hardware/products" className={getLinkClasses('/hardware/products')}>
                  <span className="text-lg">🛠️</span>
                  <span>Products</span>
                </Link>
                {/* Business Services */}
                <Link href="/services/list" className={getLinkClasses('/services/list')}>
                  <span className="text-lg">🔧</span>
                  <span>Services</span>
                </Link>
                {/* ESP32 Menu Config - Requires canConfigureWifiTokens */}
                {(isSystemAdmin(currentUser) || hasPermission('canConfigureWifiTokens')) && esp32IntegrationEnabled && (
                  <Link href="/hardware/wifi-tokens" className={getLinkClasses('/hardware/wifi-tokens')}>
                    <span className="text-lg">📡</span>
                    <span>ESP32 Menu Config</span>
                  </Link>
                )}
                {/* R710 Menu Config - Requires canConfigureWifiTokens */}
                {(isSystemAdmin(currentUser) || hasPermission('canConfigureWifiTokens')) && r710IntegrationEnabled && (
                  <Link href="/hardware/r710-tokens" className={getLinkClasses('/hardware/r710-tokens')}>
                    <span className="text-lg">📶</span>
                    <span>R710 Menu Config</span>
                  </Link>
                )}
                {/* ESP32 WiFi Sales - For users who can sell tokens; only when menu items configured */}
                {(isSystemAdmin(currentUser) || hasPermission('canSellWifiTokens')) && esp32IntegrationEnabled && esp32HasMenuItems && (
                  <Link href="/wifi-portal/sales" className={getLinkClasses('/wifi-portal/sales')}>
                    <span className="text-lg">🎫</span>
                    <span>ESP32 WiFi Sales</span>
                  </Link>
                )}
                {/* R710 WiFi Sales - For users who can sell tokens; only when menu items configured */}
                {(isSystemAdmin(currentUser) || hasPermission('canSellWifiTokens')) && r710IntegrationEnabled && r710HasMenuItems && (
                  <Link href="/r710-portal/sales" className={getLinkClasses('/r710-portal/sales')}>
                    <span className="text-lg">💵</span>
                    <span>R710 WiFi Sales</span>
                  </Link>
                )}
                {(isSystemAdmin(currentUser) || hasPermission('canViewBusiness')) && (
                  <Link href="/hardware/settings/pos" className={getLinkClasses('/hardware/settings/pos')}>
                    <span className="text-lg">⚙️</span>
                    <span>POS Settings</span>
                  </Link>
                )}
              </>
            )}

            {/* Services Features */}
            {currentBusiness.businessType === 'services' && (
              <>
                <Link href="/universal/pos" className={getLinkClasses('/universal/pos')}>
                  <span className="text-lg">💼</span>
                  <span>POS System</span>
                </Link>
                {/* Sales Reports - Only for managers/admins */}
                {(isSystemAdmin(currentUser) || hasPermission('canViewWifiReports') || hasPermission('canAccessFinancialData')) && (
                  <Link href="/restaurant/reports" className={getLinkClasses('/restaurant/reports')}>
                    <span className="text-lg">📊</span>
                    <span>Sales Reports</span>
                  </Link>
                )}
                <Link href="/services/list" className={getLinkClasses('/services/list')}>
                  <span className="text-lg">📋</span>
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
                {/* ESP32 Menu Config - Requires canConfigureWifiTokens */}
                {(isSystemAdmin(currentUser) || hasPermission('canConfigureWifiTokens')) && esp32IntegrationEnabled && (
                  <Link href="/services/wifi-tokens" className={getLinkClasses('/services/wifi-tokens')}>
                    <span className="text-lg">📡</span>
                    <span>ESP32 Menu Config</span>
                  </Link>
                )}
                {/* R710 Menu Config - Requires canConfigureWifiTokens */}
                {(isSystemAdmin(currentUser) || hasPermission('canConfigureWifiTokens')) && r710IntegrationEnabled && (
                  <Link href="/services/r710-tokens" className={getLinkClasses('/services/r710-tokens')}>
                    <span className="text-lg">📶</span>
                    <span>R710 Menu Config</span>
                  </Link>
                )}
                {/* ESP32 WiFi Sales - For users who can sell tokens; only when menu items configured */}
                {(isSystemAdmin(currentUser) || hasPermission('canSellWifiTokens')) && esp32IntegrationEnabled && esp32HasMenuItems && (
                  <Link href="/wifi-portal/sales" className={getLinkClasses('/wifi-portal/sales')}>
                    <span className="text-lg">🎫</span>
                    <span>ESP32 WiFi Sales</span>
                  </Link>
                )}
                {/* R710 WiFi Sales - For users who can sell tokens; only when menu items configured */}
                {(isSystemAdmin(currentUser) || hasPermission('canSellWifiTokens')) && r710IntegrationEnabled && r710HasMenuItems && (
                  <Link href="/r710-portal/sales" className={getLinkClasses('/r710-portal/sales')}>
                    <span className="text-lg">💵</span>
                    <span>R710 WiFi Sales</span>
                  </Link>
                )}
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

            {/* Coupon Management — shown for any business type with coupons enabled */}
            {currentBusiness.couponsEnabled && (isSystemAdmin(currentUser) || hasPermission('canManageCoupons')) && (
              <Link href={`/${currentBusiness.businessType}/coupons`} className={getLinkClasses(`/${currentBusiness.businessType}/coupons`)}>
                <span className="text-lg">🏷️</span>
                <span>Coupon Management</span>
              </Link>
            )}

            {/* Customer Promos — shown for any business type with promos enabled */}
            {currentBusiness.promosEnabled && currentBusinessId && (isSystemAdmin(currentUser) || hasPermission('canManageCoupons')) && (
              <Link
                href={`/universal/promos?businessId=${currentBusinessId}`}
                className={getLinkClasses('/universal/promos')}
              >
                <span className="text-lg">🎁</span>
                <span>Customer Promos</span>
              </Link>
            )}

            {/* Custom Bulk Products — shown for users who can manage inventory */}
            {(isSystemAdmin(currentUser) || hasPermission('canManageInventory')) && (
              <Link href="/inventory/custom-bulk" className={getLinkClasses('/inventory/custom-bulk')}>
                <span className="text-lg">📦</span>
                <span>Custom Bulk Products</span>
              </Link>
            )}

            {/* Petty Cash — shown for users with petty_cash.approve OR petty_cash.request permission */}
            {(canApprovePettyCashSys || canRequestPettyCashSys) && (
              <Link
                href="/petty-cash"
                className={getLinkClasses('/petty-cash')}
              >
                <span className="text-lg">💵</span>
                <span>Petty Cash</span>
                {pendingPettyCashCount > 0 && (
                  <span className="ml-auto bg-orange-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-tight">
                    {pendingPettyCashCount > 99 ? '99+' : pendingPettyCashCount}
                  </span>
                )}
              </Link>
            )}

            {/* Chicken Run */}
            {hasPermission('canManageChickenRun') && (
              <>
                <Link
                  href="/chicken-run"
                  className={getLinkClasses('/chicken-run')}
                >
                  <span className="text-lg">🐔</span>
                  <span>Chicken Run</span>
                </Link>
                {pathname.startsWith('/chicken-run') && (
                  <div className="ml-4 space-y-0.5">
                    <Link
                      href="/chicken-run"
                      className={getLinkClasses('/chicken-run')}
                    >
                      <span className="text-base">📊</span>
                      <span>Dashboard</span>
                    </Link>
                    <Link
                      href="/chicken-run/batches/new"
                      className={getLinkClasses('/chicken-run/batches/new')}
                    >
                      <span className="text-base">➕</span>
                      <span>New Batch</span>
                    </Link>
                    <Link
                      href="/chicken-run/inventory"
                      className={getLinkClasses('/chicken-run/inventory')}
                    >
                      <span className="text-base">🧊</span>
                      <span>Inventory</span>
                    </Link>
                    <Link
                      href="/chicken-run/reports"
                      className={getLinkClasses('/chicken-run/reports')}
                    >
                      <span className="text-base">📈</span>
                      <span>Reports</span>
                    </Link>
                    <Link
                      href="/chicken-run/costs"
                      className={getLinkClasses('/chicken-run/costs')}
                    >
                      <span className="text-base">💰</span>
                      <span>Costs</span>
                    </Link>
                    <Link
                      href="/chicken-run/settings"
                      className={getLinkClasses('/chicken-run/settings')}
                    >
                      <span className="text-base">⚙️</span>
                      <span>Settings</span>
                    </Link>
                  </div>
                )}
              </>
            )}
            </>)}
          </>
        )}

        {/* Only show Finance & Operations section if the user has at least one item inside */}
        {(() => {
          const hasFinanceOpsItems =
            hasPermission('canAccessPersonalFinance') ||
            hasPermission('canAccessVehicles') || hasPermission('canLogDriverTrips') || hasPermission('canLogDriverMaintenance') ||
            hasPermission('canManagePersonalContractors') ||
            hasPermission('canManageEmployees') || hasPermission('canEditEmployees') || hasPermission('canManageBusinessUsers') ||
            isSystemAdmin(currentUser) || hasPermission('canAccessPayroll') || hasPermission('canAccessPayrollAccount') ||
            hasPermission('canViewExpenseReports') ||
            (hasPermission('canAccessExpenseAccount') && grantedAccounts.length > 0) ||
            hasPermission('canViewPayees') ||
            hasPermission('canSetupPortalIntegration') ||
            hasPermission('canAccessFinancialData') ||
            hasPermission('canSubmitSupplierPaymentRequests') ||
            hasPermission('canViewSupplierPaymentQueue')
          if (!hasFinanceOpsItems) return null
          return (
        <button
          type="button"
          onClick={() => setFinanceOpsSectionExpanded(prev => !prev)}
          className="w-full flex items-center justify-between pt-4 pb-2 text-left"
        >
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Finance &amp; Operations</h3>
          <span className="text-gray-400 text-xs">{financeOpsSectionExpanded ? '▼' : '▶'}</span>
        </button>
          )
        })()}

        {financeOpsSectionExpanded && (<>
        {/* Business and Personal Finances - User-level permissions (business-agnostic) */}
  {hasPermission('canAccessPersonalFinance') && (
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
  {(hasPermission('canAccessVehicles') || hasPermission('canLogDriverTrips') || hasPermission('canLogDriverMaintenance')) && (
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
  {hasPermission('canManagePersonalContractors') && (
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
        {/* Employees link moved to Employee Management submenu */}

        {/* Payroll - Only for users with payroll permissions */}
        {(isSystemAdmin(currentUser) || hasPermission('canAccessPayroll')) && (
          <Link
            href="/payroll"
            className={getLinkClasses('/payroll')}
          >
            <span className="text-lg">💵</span>
            <span>Payroll</span>
          </Link>
        )}

        {/* Payroll Account - Only for users with payroll account permissions */}
        {(isSystemAdmin(currentUser) || hasPermission('canAccessPayrollAccount')) && (
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
                {(isSystemAdmin(currentUser) || hasPermission('canMakePayrollDeposits')) && (
                  <Link
                    href="/payroll/account/deposits"
                    className="text-sm text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded flex items-center space-x-2"
                  >
                    <span>💸</span>
                    <span>Deposits</span>
                  </Link>
                )}

                {(isSystemAdmin(currentUser) || hasPermission('canMakePayrollPayments')) && (
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

                {(isSystemAdmin(currentUser) || hasPermission('canViewPayrollHistory')) && (
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

        {/* Tax Tables - all payroll users can view; manage requires canManagePayroll */}
        {(isSystemAdmin(currentUser) || hasPermission('canAccessPayroll')) && (
          <Link
            href="/payroll/tax-tables"
            className={getLinkClasses('/payroll/tax-tables')}
          >
            <span className="text-lg">📊</span>
            <span>Tax Tables</span>
          </Link>
        )}

        {/* Expense Accounts - Only for managers/admins who can view reports */}
        {hasPermission('canViewExpenseReports') && (
          <>
            <Link
              href="/expense-accounts"
              className={getLinkClasses('/expense-accounts')}
            >
              <span className="text-lg">💳</span>
              <span>Expense Accounts</span>
              {pendingPaymentRequestCount > 0 && (
                <span className="ml-auto bg-indigo-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-tight">
                  {pendingPaymentRequestCount > 99 ? '99+' : pendingPaymentRequestCount}
                </span>
              )}
            </Link>

            {/* Expense Accounts Sub-menu - Always visible when Finance & Ops is expanded */}
            {(
              <div className="ml-8 space-y-1 mt-1">
                {hasPermission('canCreateExpenseAccount') && (
                  <Link
                    href="/expense-accounts/new"
                    className="text-sm text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded flex items-center space-x-2"
                  >
                    <span>➕</span>
                    <span>Create Account</span>
                  </Link>
                )}

                {hasPermission('canViewExpenseReports') && (
                  <Link
                    href="/expense-accounts/lenders"
                    className="text-sm text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded flex items-center space-x-2"
                  >
                    <span>🏦</span>
                    <span>Lenders</span>
                  </Link>
                )}

                {(isSystemAdmin(currentUser) || hasPermission('canAccessExpenseAccount')) && (
                  <Link
                    href="/expense-accounts/auto-deposits"
                    className="text-sm text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded flex items-center space-x-2"
                  >
                    <span>💳</span>
                    <span>EOD Auto-Deposits</span>
                  </Link>
                )}

                {(isSystemAdmin(currentUser) || hasPermission('canSubmitPaymentBatch')) && (
                  <Link
                    href="/expense-accounts/payment-batches"
                    className="text-sm text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded flex items-center space-x-2"
                  >
                    <span>📋</span>
                    <span>Payment Batches</span>
                    {pendingPaymentRequestCount > 0 && (
                      <span className="ml-auto bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {pendingPaymentRequestCount}
                      </span>
                    )}
                  </Link>
                )}

                {(isSystemAdmin(currentUser) || hasPermission('canSubmitPaymentBatch')) && (
                  <Link
                    href="/cash-bucket"
                    className="text-sm text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded flex items-center space-x-2"
                  >
                    <span>🪣</span>
                    <span>Cash Bucket</span>
                  </Link>
                )}

                {(isSystemAdmin(currentUser) || hasPermission('canViewCashBucketReport')) && (
                  <Link
                    href="/cash-bucket/report"
                    className="text-sm text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded flex items-center space-x-2"
                  >
                    <span>📊</span>
                    <span>Cash Bucket Report</span>
                  </Link>
                )}

                {hasPermission('canViewExpenseReports') && (
                  <>
                    <Link
                      href="/expense-accounts/reports"
                      className="text-sm text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded flex items-center space-x-2"
                    >
                      <span>📊</span>
                      <span>Reports Hub</span>
                    </Link>
                    <Link
                      href="/expense-accounts/reports/accounts-overview"
                      className="text-xs text-gray-400 hover:text-white hover:bg-gray-800 pl-7 pr-3 py-1.5 rounded flex items-center space-x-2"
                    >
                      <span>🏦</span>
                      <span>Accounts Overview</span>
                    </Link>
                    <Link
                      href="/expense-accounts/reports/loans"
                      className="text-xs text-gray-400 hover:text-white hover:bg-gray-800 pl-7 pr-3 py-1.5 rounded flex items-center space-x-2"
                    >
                      <span>💼</span>
                      <span>Loan Portfolio</span>
                    </Link>
                    <Link
                      href="/expense-accounts/reports/categories"
                      className="text-xs text-gray-400 hover:text-white hover:bg-gray-800 pl-7 pr-3 py-1.5 rounded flex items-center space-x-2"
                    >
                      <span>🏷️</span>
                      <span>Category Analysis</span>
                    </Link>
                    <Link
                      href="/expense-accounts/reports/payees"
                      className="text-xs text-gray-400 hover:text-white hover:bg-gray-800 pl-7 pr-3 py-1.5 rounded flex items-center space-x-2"
                    >
                      <span>👥</span>
                      <span>Payee Analysis</span>
                    </Link>
                    <Link
                      href="/expense-accounts/reports/trends"
                      className="text-xs text-gray-400 hover:text-white hover:bg-gray-800 pl-7 pr-3 py-1.5 rounded flex items-center space-x-2"
                    >
                      <span>📈</span>
                      <span>Monthly Trends</span>
                    </Link>
                    <Link
                      href="/expense-accounts/reports/transfers"
                      className="text-xs text-gray-400 hover:text-white hover:bg-gray-800 pl-7 pr-3 py-1.5 rounded flex items-center space-x-2"
                    >
                      <span>🔄</span>
                      <span>Transfer Report</span>
                    </Link>
                  </>
                )}

                {hasTransferrableAccounts && (
                  <Link
                    href="/expense-accounts/transfer"
                    className={`text-sm px-3 py-2 rounded flex items-center space-x-2 ${pathname === '/expense-accounts/transfer' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}
                  >
                    <span>🔄</span>
                    <span>Transfer Funds</span>
                  </Link>
                )}
              </div>
            )}

          </>
        )}

        {/* Business Accounts */}
        {(isSystemAdmin(currentUser) || hasPermission('canAccessFinancialData')) && (
          <Link
            href="/business-accounts"
            className={getLinkClasses('/business-accounts')}
          >
            <span className="text-lg">🏦</span>
            <span>Business Accounts</span>
          </Link>
        )}

        {/* Supplier Payments */}
        {(hasPermission('canViewSupplierPaymentQueue') || hasPermission('canSubmitSupplierPaymentRequests')) && (
          <>
            <Link
              href={hasPermission('canViewSupplierPaymentQueue') ? '/supplier-payments' : '/supplier-payments/my-requests'}
              className={getLinkClasses('/supplier-payments')}
            >
              <span className="text-lg">🧾</span>
              <span>Supplier Payments</span>
              {pendingPaymentRequestCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-tight">
                  {pendingPaymentRequestCount > 99 ? '99+' : pendingPaymentRequestCount}
                </span>
              )}
            </Link>
            <div className="ml-8 space-y-1 mt-1">
              {hasPermission('canViewSupplierPaymentQueue') && (
                <Link
                  href="/supplier-payments"
                  className="text-sm text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded flex items-center space-x-2"
                >
                  <span>📋</span>
                  <span>Approval Queue</span>
                </Link>
              )}
              {hasPermission('canViewSupplierPaymentReports') && (
                <Link
                  href="/supplier-payments/reports"
                  className="text-sm text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded flex items-center space-x-2"
                >
                  <span>📊</span>
                  <span>Reports</span>
                </Link>
              )}
              {hasPermission('canSubmitSupplierPaymentRequests') && (
                <Link
                  href="/supplier-payments/request"
                  className="text-sm text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded flex items-center space-x-2"
                >
                  <span>➕</span>
                  <span>Submit Request</span>
                </Link>
              )}
              {hasPermission('canSubmitSupplierPaymentRequests') && (
                <Link
                  href="/supplier-payments/my-requests"
                  className="text-sm text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded flex items-center space-x-2"
                >
                  <span>📄</span>
                  <span>My Requests</span>
                </Link>
              )}
            </div>
          </>
        )}

        {/* Cross-business granted accounts — visible to anyone with expense account access */}
        {hasPermission('canAccessExpenseAccount') && grantedAccounts.length > 0 && (
          <div className="ml-8 space-y-1 mt-1">
            <p className="text-xs text-gray-500 px-3 py-1 uppercase tracking-wide">My Accounts</p>
            {grantedAccounts.map(acct => (
              <Link
                key={acct.id}
                href={`/expense-accounts/${acct.id}`}
                className="text-sm text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-2 rounded flex items-center justify-between"
              >
                <span className="truncate">{acct.accountName}</span>
                {acct.permissionLevel === 'VIEW' && (
                  <span className="ml-1 text-xs text-gray-500 flex-shrink-0">view</span>
                )}
              </Link>
            ))}
          </div>
        )}

        {/* Payee Management - Only for users with payee permissions */}
        {hasPermission('canViewPayees') && (
          <Link
            href="/payees"
            className={getLinkClasses('/payees')}
          >
            <span className="text-lg">👥</span>
            <span>Payee Management</span>
          </Link>
        )}

        {/* Loan Repayments - for assigned managers/lenders */}
        {(hasPermission('canAccessPersonalFinance') || hasPermission('canManageBusinessLoans')) && (
          <Link
            href="/loans"
            className={getLinkClasses('/loans')}
          >
            <span className="text-lg">🏦</span>
            <span>Loan Repayments</span>
          </Link>
        )}

        {/* ESP32 WiFi Portal - Only for admins/managers who can setup integration */}
        {(isSystemAdmin(currentUser) || hasPermission('canSetupPortalIntegration')) && (
          <Link
            href="/wifi-portal"
            className={getLinkClasses('/wifi-portal')}
          >
            <span className="text-lg">📡</span>
            <span>ESP32 WiFi Portal</span>
          </Link>
        )}

        {/* R710 WiFi Portal - Only for admins/managers who can setup integration */}
        {(isSystemAdmin(currentUser) || hasPermission('canSetupPortalIntegration')) && (
          <Link
            href="/r710-portal"
            className={getLinkClasses('/r710-portal')}
          >
            <span className="text-lg">📶</span>
            <span>R710 WiFi Portal</span>
          </Link>
        )}

        {/* Reports - Only for managers and admins, not drivers */}
        {(hasPermission('canManageBusinessUsers') || hasPermission('canAccessFinancialData')) && (
          <Link
            href="/reports"
            className="sidebar-link flex items-center space-x-3"
          >
            <span className="text-lg">📈</span>
            <span>Reports</span>
          </Link>
        )}

        {/* HR Reports - Only for users with actual employee management permissions */}
        {(hasPermission('canManageEmployees') || hasPermission('canEditEmployees')) && (
          <Link
            href="/admin/reports"
            className="sidebar-link flex items-center space-x-3"
          >
            <span className="text-lg">📊</span>
            <span>HR Reports</span>
          </Link>
        )}

        {/* Cash Allocation Summary - admin / canViewExpenseReports */}
        {(isSystemAdmin || hasPermission('canManageAllBusinesses') || hasPermission('canViewExpenseReports')) && (
          <Link
            href="/admin/reports/cash-allocation-summary"
            className="sidebar-link flex items-center space-x-3"
          >
            <span className="text-lg">💰</span>
            <span>Cash Allocation</span>
            {pendingCashAllocCount > 0 && (
              <span className="ml-auto bg-blue-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-tight">
                {pendingCashAllocCount > 99 ? '99+' : pendingCashAllocCount}
              </span>
            )}
          </Link>
        )}
        </>)}

        {/* Invoices & Quotations */}
        {(isSystemAdmin(currentUser) || hasPermission('canManageBusinessSettings') || hasPermission('canManageAllBusinesses') || hasPermission('canAccessFinancialData') || hasPermission('canManageEmployees')) && (
          <Link
            href="/admin/invoices"
            className={getLinkClasses('/admin/invoices')}
          >
            <span className="text-lg">📄</span>
            <span>Invoices & Quotes</span>
          </Link>
        )}

        <button
          type="button"
          onClick={() => setToolsSectionExpanded(prev => !prev)}
          className="w-full flex items-center justify-between pt-4 pb-2 text-left"
        >
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tools</h3>
          <span className="text-gray-400 text-xs">{toolsSectionExpanded ? '▼' : '▶'}</span>
        </button>

        {toolsSectionExpanded && (<>
        {/* Receipt History - Universal receipt search and reprint */}
        <Link
          href={`/universal/receipts${currentBusinessId ? `?businessId=${currentBusinessId}` : ''}`}
          className={getLinkClasses('/universal/receipts')}
        >
          <span className="text-lg">🧾</span>
          <span>Receipt History</span>
        </Link>


{/* Business Categories - Cross-business functionality */}
        {(hasPermission('canCreateBusinessCategories') ||
          hasPermission('canEditBusinessCategories') ||
          hasPermission('canDeleteBusinessCategories')) && (
          <Link
            href="/business/categories"
            className={getLinkClasses('/business/categories')}
          >
            <span className="text-lg">📁</span>
            <span>Business Categories</span>
          </Link>
        )}

        {/* Inventory Categories - Business-specific inventory category management */}
        {(hasPermission('canCreateInventoryCategories') ||
          hasPermission('canEditInventoryCategories') ||
          hasPermission('canDeleteInventoryCategories')) && (
          <Link
            href="/business/inventory-categories"
            className={getLinkClasses('/business/inventory-categories')}
          >
            <span className="text-lg">📦</span>
            <span>Inventory Categories</span>
          </Link>
        )}

        {/* Barcode Management - Universal barcode template and print job management */}
        {(isSystemAdmin(currentUser) || hasPermission('canViewBarcodeTemplates') || hasPermission('canManageBarcodeTemplates') || hasUserPermission(currentUser, 'canViewBarcodeTemplates') || hasUserPermission(currentUser, 'canManageBarcodeTemplates')) && (
          <Link
            href={`/universal/barcode-management${currentBusinessId ? `?businessId=${currentBusinessId}` : ''}`}
            className={getLinkClasses('/universal/barcode-management')}
          >
            <span className="text-lg">🏷️</span>
            <span>Barcode Management</span>
          </Link>
        )}

        {/* Supplier Management - Business-specific supplier management */}
        {(hasPermission('canViewSuppliers') ||
          hasPermission('canCreateSuppliers') ||
          hasPermission('canEditSuppliers')) && (
          <Link
            href="/business/suppliers"
            className={getLinkClasses('/business/suppliers')}
          >
            <span className="text-lg">🚚</span>
            <span>Suppliers</span>
          </Link>
        )}

        {/* Individuals Management - Payee individuals (cross-business) */}
        {(isSystemAdmin(currentUser) ||
          hasPermission('canViewPayees') ||
          hasPermission('canCreatePayees') ||
          hasPermission('canEditPayees')) && (
          <Link
            href="/payees"
            className={getLinkClasses('/payees')}
          >
            <span className="text-lg">🧑</span>
            <span>Individuals</span>
          </Link>
        )}

        {/* Contractors Management */}
        {(isSystemAdmin(currentUser) ||
          hasPermission('canManagePersonalContractors') ||
          hasUserPermission(currentUser, 'canManagePersonalContractors')) && (
          <Link
            href="/contractors"
            className={getLinkClasses('/contractors')}
          >
            <span className="text-lg">👷</span>
            <span>Contractors</span>
          </Link>
        )}

        {/* Location Management - Business-specific location management */}
        {(hasPermission('canViewLocations') ||
          hasPermission('canCreateLocations') ||
          hasPermission('canEditLocations')) && (
          <Link
            href="/business/locations"
            className={getLinkClasses('/business/locations')}
          >
            <span className="text-lg">📍</span>
            <span>Locations</span>
          </Link>
        )}

        {/* Customer Management - Cross-business functionality */}
        {(hasPermission('canAccessCustomers') || hasPermission('canManageCustomers')) && (
          <Link
            href="/customers"
            className={getLinkClasses('/customers')}
          >
            <span className="text-lg">👥</span>
            <span>Customer Management</span>
          </Link>
        )}

        {/* Customer Reports */}
        {(hasPermission('canAccessCustomers') || hasPermission('canManageCustomers')) && (
          <Link
            href="/customers/reports"
            className={getLinkClasses('/customers/reports')}
          >
            <span className="text-lg">📊</span>
            <span>Customer Reports</span>
          </Link>
        )}

        {/* Layby Management - Cross-business functionality */}
        {hasPermission('canManageLaybys') && (
          <Link
            href="/business/laybys"
            className={getLinkClasses('/business/laybys')}
          >
            <span className="text-lg">🛍️</span>
            <span>Layby Management</span>
          </Link>
        )}

        {/* Project Management - Cross-business functionality */}
  {(isSystemAdmin(currentUser) || hasPermission('canViewProjects') || hasPermission('canAccessPersonalFinance')) && (
          <Link
            href="/projects"
            className={getLinkClasses('/projects')}
          >
            <span className="text-lg">📋</span>
            <span>Project Management</span>
          </Link>
        )}


        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('chat:open'))}
          className="sidebar-link flex items-center space-x-3 w-full text-left"
        >
          <span className="text-lg">💬</span>
          <span>Team Chat</span>
        </button>
        </>)}

        {/* Employee Management Section - Only for users with actual management permissions */}
        {(hasPermission('canManageEmployees') ||
          hasPermission('canManageJobTitles') ||
          hasPermission('canEditEmployees') ||
          hasPermission('canManageBenefitTypes') ||
          hasPermission('canManageCompensationTypes') ||
          hasPermission('canManageDisciplinaryActions')) && (
          <>
            <button
              type="button"
              onClick={() => setEmployeeSectionExpanded(prev => !prev)}
              className="w-full flex items-center justify-between pt-4 pb-2 text-left"
            >
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Employee Management</h3>
              <span className="text-gray-400 text-xs">{employeeSectionExpanded ? '▼' : '▶'}</span>
            </button>

            {employeeSectionExpanded && (<>
                        {(hasPermission('canManageEmployees') || hasPermission('canEditEmployees') || hasPermission('canManageBusinessUsers')) && (
                          <Link
                            href="/employees"
                            className="sidebar-link flex items-center space-x-3"
                          >
                            <span className="text-lg">👤</span>
                            <span>Employees</span>
                          </Link>
                        )}
            {hasPermission('canManageJobTitles') && (
              <Link
                href="/admin/job-titles"
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">💼</span>
                <span>Job Titles</span>
              </Link>
            )}

            {hasPermission('canEditEmployees') && (
              <Link
                href="/admin/hierarchy"
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">🌳</span>
                <span>Hierarchy</span>
              </Link>
            )}

            {(hasPermission('canManageBenefitTypes') || hasPermission('canManageCompensationTypes')) && (
              <Link
                href="/admin/benefits"
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">💰</span>
                <span>Benefits & Compensation</span>
              </Link>
            )}

            {hasPermission('canManageDisciplinaryActions') && (
              <Link
                href="/admin/disciplinary"
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">⚠️</span>
                <span>Disciplinary Actions</span>
              </Link>
            )}

            {(hasPermission('canManageEmployees') || hasPermission('canEditEmployees')) && (
              <Link
                href="/employees/clock-in"
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">🕐</span>
                <span>Clock-In Management</span>
              </Link>
            )}

            {(hasPermission('canManageEmployees') || hasPermission('canEditEmployees')) && (
              <Link
                href="/employees/absences"
                className={getLinkClasses('/employees/absences')}
              >
                <span className="text-lg">📋</span>
                <span>Absences</span>
              </Link>
            )}


            {(isSystemAdmin(currentUser) || hasPermission('canAccessPerDiem') || hasPermission('canAccessPayroll')) && (
              <Link
                href="/employees/per-diem"
                className={getLinkClasses('/employees/per-diem')}
              >
                <span className="text-lg">🗂️</span>
                <span>Per Diem</span>
              </Link>
            )}
            </>)}
          </>
        )}

  {(hasPermission('canManageBusinessUsers') || hasPermission('canManageBusinessSettings')) && (
          <>
            <button
              type="button"
              onClick={() => setAdminSectionExpanded(prev => !prev)}
              className="w-full flex items-center justify-between pt-4 pb-2 text-left"
            >
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Administration</h3>
              <span className="text-gray-400 text-xs">{adminSectionExpanded ? '▼' : '▶'}</span>
            </button>

            {adminSectionExpanded && (<>
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
                href="/admin/petty-cash-permissions"
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">💵</span>
                <span>Petty Cash Permissions</span>
              </Link>
            )}

            {(isSystemAdmin(currentUser) || hasPermission('canReversePaymentsToPettyCash')) && (
              <Link
                href="/admin/reverse-payments"
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">↩️</span>
                <span>Reverse Payments</span>
              </Link>
            )}

            {(isSystemAdmin(currentUser) || hasPermission('canManageWifiPortal')) && (
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
            
            {hasPermission('canManageBusinessUsers') && (
              <Link 
                href="/admin/users" 
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">👥</span>
                <span>User Management</span>
              </Link>
            )}
            
            {hasPermission('canManageBusinessSettings') && (
              <Link 
                href="/admin/settings" 
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">⚙️</span>
                <span>System Settings</span>
              </Link>
            )}
            
            {hasPermission('canManageBusinessUsers') && (
              <Link 
                href="/business/manage" 
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">🏢</span>
                <span>Business Management</span>
              </Link>
            )}
            
            {hasPermission('canAccessFinancialData') && (
              <Link
                href="/business/manage/loans"
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">💰</span>
                <span>Business Loans</span>
              </Link>
            )}

            {hasPermission('canManageBusinessLoans') && (
              <Link
                href="/admin/loans"
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">🏦</span>
                <span>Loan Repayments</span>
                {pendingLoanLockCount > 0 && (
                  <span className="ml-auto bg-yellow-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-tight">
                    {pendingLoanLockCount > 99 ? '99+' : pendingLoanLockCount}
                  </span>
                )}
              </Link>
            )}

            {hasPermission('canManageBusinessSettings') && (
              <Link
                href="/admin/umbrella-business"
                className="sidebar-link flex items-center space-x-3"
              >
                <span className="text-lg">🏢</span>
                <span>Umbrella Business</span>
              </Link>
            )}
            </>)}

          </>
        )}
      </nav>
      
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-sm font-medium shrink-0">
            {profilePhotoUrl ? (
              <img
                src={profilePhotoUrl}
                alt={currentUser?.name || 'User'}
                className="w-full h-full object-cover"
                onError={() => setProfilePhotoUrl(null)}
              />
            ) : (
              currentUser?.name?.[0]?.toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentUser?.name}</p>
            <p className="text-xs text-gray-400 truncate">{currentUser?.email}</p>
          </div>
        </div>
        <button 
          onClick={() => signOut({ 
            callbackUrl: window.location.origin,
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