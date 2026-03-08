'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/theme-context'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { SessionUser, isSystemAdmin } from '@/lib/permission-utils'
import { MiniCart } from '@/components/global/mini-cart'
import { TestPrintModal } from '@/components/printing/test-print-modal'
import { BusinessCreationModal } from '@/components/user-management/business-creation-modal'
import { QuickActivityModal } from '@/components/admin/quick-activity-modal'
import { useTimeDisplay } from '@/hooks/use-time-display'
import { useRentIndicator } from '@/hooks/use-rent-indicator'
import { usePendingActionsCount } from '@/hooks/use-pending-actions-count'

interface GlobalHeaderProps {
  title?: string
  showBreadcrumb?: boolean
}

export function GlobalHeader({ title, showBreadcrumb = true }: GlobalHeaderProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const [showBusinessMenu, setShowBusinessMenu] = useState(false)
  const [showTestPrint, setShowTestPrint] = useState(false)
  const [showQuickActivity, setShowQuickActivity] = useState(false)
  const [showEditBusiness, setShowEditBusiness] = useState(false)
  const [showBusinessSwitcher, setShowBusinessSwitcher] = useState(false)
  const [switchingToBusinessId, setSwitchingToBusinessId] = useState<string | null>(null)
  const [businessSwitcherSearch, setBusinessSwitcherSearch] = useState('')
  const { useServerTime, toggleTimeDisplay } = useTimeDisplay()
  const businessMenuOpenedByClick = useRef(false)
  const businessMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const businessMenuOpenedAt = useRef(0)

  // Close all menus on navigation
  useEffect(() => {
    setShowBusinessMenu(false)
    setShowUserMenu(false)
    setShowThemeMenu(false)
  }, [pathname])

  // Business permissions context
  const {
    currentBusiness,
    isAuthenticated,
    hasPermission,
    businesses,
    switchBusiness,
    refreshBusinesses,
  } = useBusinessPermissionsContext()

  const user = session?.user as SessionUser
  const isAdmin = isSystemAdmin(user)
  const pendingCount = usePendingActionsCount()

  // Rent account indicator
  const rentIndicator = useRentIndicator(currentBusiness?.businessId)

  // Explicitly close business menu and cancel any pending hover timeouts
  const closeBusinessMenu = () => {
    if (businessMenuTimeoutRef.current) {
      clearTimeout(businessMenuTimeoutRef.current)
      businessMenuTimeoutRef.current = null
    }
    businessMenuOpenedByClick.current = false
    setShowBusinessMenu(false)
    setShowBusinessSwitcher(false)
    setBusinessSwitcherSearch('')
  }

  // Switch to another business, preserving the current module where supported
  const handleSwitchBusiness = async (targetBusinessId: string, targetBusinessType: string) => {
    // Close both dropdowns immediately so the UI feels responsive
    closeBusinessMenu()
    setSwitchingToBusinessId(targetBusinessId)

    // Compute the target path NOW — before switchBusiness() updates currentBusiness
    // in context, which would corrupt the expense-account name-matching logic.
    const targetBiz = businesses.find(b => b.businessId === targetBusinessId) ?? null
    const targetPath = getBusinessNavigationPath(targetBusinessType, targetBiz)

    try {
      await switchBusiness(targetBusinessId)
      window.location.href = targetPath
    } catch {
      setSwitchingToBusinessId(null)
    }
  }

  // Business menu hover handlers (desktop only)
  const handleBusinessMenuEnter = () => {
    if (businessMenuTimeoutRef.current) {
      clearTimeout(businessMenuTimeoutRef.current)
      businessMenuTimeoutRef.current = null
    }
    // Only open on hover if not already opened by click
    if (!businessMenuOpenedByClick.current && !showBusinessMenu) {
      businessMenuTimeoutRef.current = setTimeout(() => {
        setShowBusinessMenu(true)
      }, 300) // 300ms delay
    }
  }

  const handleBusinessMenuLeave = () => {
    if (businessMenuTimeoutRef.current) {
      clearTimeout(businessMenuTimeoutRef.current)
      businessMenuTimeoutRef.current = null
    }
    // Don't auto-close if opened by click — user must click away or select
    if (businessMenuOpenedByClick.current) return
    businessMenuTimeoutRef.current = setTimeout(() => {
      setShowBusinessMenu(false)
    }, 150) // 150ms delay to hide
  }

  // Get business-specific menu links with permission checks
  const getBusinessMenuLinks = (businessType: string, currentPathname: string) => {
    // Define links with their required permissions
    type MenuLink = {
      href: string
      icon: string
      label: string
      permissions?: string[]  // Required permissions (OR logic - any one grants access)
    }

    const baseLinks: MenuLink[] = [
      {
        href: `/${businessType}`,
        icon: '🏠',
        label: `${businessType.charAt(0).toUpperCase() + businessType.slice(1)} Home`
      }
    ]

    const businessSpecificLinks: Record<string, MenuLink[]> = {
      restaurant: [
        { href: `/${businessType}/pos`, icon: '🍽️', label: 'POS System' },
        { href: `/${businessType}/reports`, icon: '📊', label: 'Sales Reports', permissions: ['canViewWifiReports', 'canAccessFinancialData'] },
        { href: `/${businessType}/inventory`, icon: '📦', label: 'Inventory' },  // Salespersons need this for item search
        { href: `/${businessType}/menu`, icon: '📋', label: 'Menu Management', permissions: ['canManageMenu'] },
        { href: `/${businessType}/orders`, icon: '📦', label: 'Orders', permissions: ['canEnterManualOrders', 'canAccessFinancialData'] },
        { href: '/restaurant/meal-program/participants', icon: '👥', label: 'Meal Program · Participants', permissions: ['canManageEmployees', 'canManageMenu', 'canManageInventory'] },
        { href: '/restaurant/meal-program/eligible-items', icon: '🍱', label: 'Meal Program · Items', permissions: ['canManageEmployees', 'canManageMenu', 'canManageInventory'] }
      ],
      grocery: [
        { href: `/${businessType}/pos`, icon: '🛒', label: 'POS System' },
        { href: `/${businessType}/reports`, icon: '📊', label: 'Sales Reports', permissions: ['canViewWifiReports', 'canAccessFinancialData'] },
        { href: `/${businessType}/inventory`, icon: '📦', label: 'Inventory' },
        { href: '/clothing/inventory?tab=bales', icon: '📦', label: 'Bales Inventory' },
        { href: `/${businessType}/products`, icon: '📦', label: 'Products' },
        { href: `/${businessType}/orders`, icon: '📦', label: 'Orders', permissions: ['canEnterManualOrders', 'canAccessFinancialData'] }
      ],
      clothing: [
        { href: `/${businessType}/pos`, icon: '👕', label: 'POS System' },
        { href: `/${businessType}/reports`, icon: '📊', label: 'Sales Reports', permissions: ['canViewWifiReports', 'canAccessFinancialData'] },
        { href: `/${businessType}/inventory`, icon: '📦', label: 'Inventory' },
        { href: '/clothing/inventory?tab=bales', icon: '📦', label: 'Bales Inventory' },
        { href: `/${businessType}/products`, icon: '👗', label: 'Products' },
        { href: `/${businessType}/orders`, icon: '📦', label: 'Orders', permissions: ['canEnterManualOrders', 'canAccessFinancialData'] }
      ],
      hardware: [
        { href: `/${businessType}/pos`, icon: '🔧', label: 'POS System' },
        { href: `/${businessType}/reports`, icon: '📊', label: 'Sales Reports', permissions: ['canViewWifiReports', 'canAccessFinancialData'] },
        { href: `/${businessType}/inventory`, icon: '📦', label: 'Inventory' },  // Salespersons need this for item search
        { href: `/${businessType}/products`, icon: '🛠️', label: 'Products' },
        { href: `/${businessType}/orders`, icon: '📦', label: 'Orders', permissions: ['canEnterManualOrders', 'canAccessFinancialData'] }
      ],
      services: [
        { href: '/universal/pos', icon: '💼', label: 'POS System' },
        { href: `/${businessType}/reports`, icon: '📊', label: 'Sales Reports', permissions: ['canViewWifiReports', 'canAccessFinancialData'] },
        { href: `/${businessType}/list`, icon: '📋', label: 'Services List' },
        { href: `/${businessType}/categories`, icon: '📂', label: 'Categories' }
      ]
    }

    // Expense account links - one per account linked to this business
    // General Expenses account requires canAccessFinancialData permission
    const canSeeGeneralExpenses = isAdmin || hasPermission('canAccessFinancialData')
    // Extract the meaningful account type label from the raw DB account name.
    // Account names are always "{biz name} {type}" or "{biz name} - {type}".
    // Known types are matched by suffix — completely independent of the business name,
    // so renaming the business never breaks labels.
    const KNOWN_ACCOUNT_TYPES = [
      'R710 WiFi Token Sales',
      'ESP32 WiFi Token Sales',
      'WiFi Token Revenue',
      'WiFi Token Sales',
      'Rent Account',
      'General Expenses',
      'Expense Account',
    ]
    const accountTypeLabel = (name: string): string => {
      for (const type of KNOWN_ACCOUNT_TYPES) {
        if (name.toLowerCase().endsWith(type.toLowerCase())) return type
      }
      // Fallback: strip everything up to and including the last " - " separator
      const dashIdx = name.lastIndexOf(' - ')
      if (dashIdx !== -1) return name.slice(dashIdx + 3).trim()
      return name
    }

    const expenseLinks: MenuLink[] = (currentBusiness?.expenseAccounts || [])
      .filter(ea => ea.id !== 'acc-general-expenses' || canSeeGeneralExpenses)
      .map(ea => ({
        href: `/expense-accounts/${ea.id}`,
        icon: '💳',
        label: accountTypeLabel(ea.accountName),
        permissions: ['canAccessExpenseAccount']
      }))

    // Coupon management link - only if business has coupons enabled
    const couponLinks: MenuLink[] = currentBusiness?.couponsEnabled
      ? [{ href: `/${businessType}/coupons`, icon: '🏷️', label: 'Coupons', permissions: ['canManageCoupons'] }]
      : []

    const allLinks = [
      ...baseLinks,
      ...(businessSpecificLinks[businessType] || []),
      ...couponLinks,
      ...expenseLinks
    ]

    // Filter based on permissions and current page
    return allLinks.filter(link => {
      // Check permissions first (admin always has access)
      if (link.permissions && link.permissions.length > 0) {
        const hasAccess = isAdmin || link.permissions.some(perm => hasPermission(perm as any))
        if (!hasAccess) return false
      }
      // If we're on the exact business home page, exclude the home link
      if (currentPathname === `/${businessType}` && link.href === `/${businessType}`) {
        return false
      }

      // If we're on a specific module page, exclude that module from the menu
      const pathSegments = currentPathname.split('/').filter(Boolean)
      if (pathSegments.length >= 2 && pathSegments[0] === businessType) {
        const currentModule = pathSegments[1]
        // Check if this link matches the current module
        if (link.href === `/${businessType}/${currentModule}`) {
          return false
        }
        // Special case for reports - exclude if we're on any reports page
        if (currentModule === 'reports' && link.href.startsWith(`/${businessType}/reports`)) {
          return false
        }
      }

      return true
    })
  }

  // Function to get navigation path that preserves current module when switching businesses
  const getBusinessNavigationPath = (targetBusinessType: string, targetBiz?: { businessId: string; expenseAccounts?: { id: string; accountName: string }[] } | null): string => {
    const currentPath = pathname
    let targetPath = `/${targetBusinessType}` // Default to business homepage

    // ── Cross-module paths ──────────────────────────────────────────────────
    // Expense account detail page — navigate to the equivalent account in the target business
    if (currentPath.startsWith('/expense-accounts/')) {
      const accounts = targetBiz?.expenseAccounts
      if (!accounts?.length) return `/${targetBusinessType}`

      // Extract the canonical account type key from a raw DB account name.
      // Matches known type suffixes so this is fully rename-proof.
      const KNOWN_ACCOUNT_TYPES = [
        'R710 WiFi Token Sales',
        'ESP32 WiFi Token Sales',
        'WiFi Token Revenue',
        'WiFi Token Sales',
        'General Expenses',
        'Expense Account',
      ]
      const accountTypeKey = (name: string): string => {
        for (const type of KNOWN_ACCOUNT_TYPES) {
          if (name.toLowerCase().endsWith(type.toLowerCase())) return type.toLowerCase()
        }
        const dashIdx = name.lastIndexOf(' - ')
        if (dashIdx !== -1) return name.slice(dashIdx + 3).trim().toLowerCase()
        return name.toLowerCase()
      }

      // Identify the current account by ID and match to same type in target business
      const currentAccountId = currentPath.split('/').filter(Boolean)[1]
      const currentAccount = currentBusiness?.expenseAccounts?.find(ea => ea.id === currentAccountId)

      if (currentAccount) {
        const currentKey = accountTypeKey(currentAccount.accountName)
        const matched = accounts.find(ea => accountTypeKey(ea.accountName) === currentKey)
        return `/expense-accounts/${(matched ?? accounts[0]).id}`
      }

      return `/expense-accounts/${accounts[0].id}`
    }

    // Business account detail page — navigate to target business's account page
    if (currentPath.startsWith('/business-accounts/')) {
      return targetBiz?.businessId ? `/business-accounts/${targetBiz.businessId}` : `/${targetBusinessType}`
    }

    // Check if we're currently on a business-specific module page
    const businessModules = ['pos', 'reports', 'inventory', 'products', 'menu', 'orders', 'employees', 'suppliers', 'customers']
    const pathSegments = currentPath.split('/').filter(Boolean)

    if (pathSegments.length >= 2) {
      const currentBusinessType = pathSegments[0]
      const currentModule = pathSegments[1]

      // If we're on a business module page, preserve the module for the new business
      if (businessModules.includes(currentModule) && ['restaurant', 'grocery', 'clothing', 'hardware'].includes(currentBusinessType)) {
        // Special handling for reports - they all use the same universal component
        if (currentModule === 'reports') {
          // Preserve the full reports sub-path (e.g., sales-analytics, dashboard, etc.)
          const reportsSubPath = pathSegments.slice(2).join('/') // Get everything after /businessType/reports/
          targetPath = reportsSubPath ? `/${targetBusinessType}/reports/${reportsSubPath}` : `/${targetBusinessType}/reports`
        } else {
          // For other modules, check if the target business supports this module
          const supportedModules = {
            restaurant: ['pos', 'reports', 'inventory', 'menu', 'orders', 'employees', 'suppliers', 'customers'],
            grocery: ['pos', 'reports', 'inventory', 'products', 'orders', 'employees', 'suppliers', 'customers'],
            clothing: ['pos', 'reports', 'inventory', 'products', 'orders', 'employees', 'suppliers', 'customers'],
            hardware: ['pos', 'reports', 'inventory', 'products', 'orders', 'employees', 'suppliers', 'customers']
          }

          if (supportedModules[targetBusinessType as keyof typeof supportedModules]?.includes(currentModule)) {
            targetPath = `/${targetBusinessType}/${currentModule}`
          }
        }
      }
    }

    return targetPath
  }

  return (
    <>
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center space-x-2 sm:space-x-8 min-w-0 shrink">
            <Link href="/dashboard" className="flex items-center space-x-1 sm:space-x-2 shrink-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs sm:text-sm">BH</span>
              </div>
              <span className="hidden sm:inline text-xl font-bold text-gray-900 dark:text-white">Business Hub</span>
            </Link>

            {showBreadcrumb && <div className="hidden sm:block"><Breadcrumb pathname={pathname} title={title} /></div>}
          </div>

          {/* Right side - Business context, Theme toggle and User menu */}
          <div className="flex items-center space-x-1 sm:space-x-4 shrink-0">
            {/* Business context indicator for all users */}
            {session?.user && isAuthenticated && currentBusiness && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (showBusinessMenu) {
                      closeBusinessMenu()
                    } else {
                      if (businessMenuTimeoutRef.current) {
                        clearTimeout(businessMenuTimeoutRef.current)
                        businessMenuTimeoutRef.current = null
                      }
                      // Close other menus
                      setShowUserMenu(false)
                      setShowThemeMenu(false)
                      businessMenuOpenedByClick.current = true
                      businessMenuOpenedAt.current = Date.now()
                      setShowBusinessMenu(true)
                    }
                  }}
                  className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer ml-2 sm:ml-4"
                  title={
                    rentIndicator.hasRentAccount
                      ? `${currentBusiness.businessName} · Rent fund: $${rentIndicator.balance.toFixed(2)} (${rentIndicator.fundingPercent}% of $${rentIndicator.monthlyRentAmount.toFixed(2)}) · Due day ${rentIndicator.rentDueDay}`
                      : `${currentBusiness.businessName} - ${currentBusiness.businessType}`
                  }
                  onMouseEnter={handleBusinessMenuEnter}
                  onMouseLeave={handleBusinessMenuLeave}
                >
                  <span className="text-blue-600 dark:text-blue-400 text-sm sm:text-base">🏢</span>
                  <div className="text-xs sm:text-sm text-left">
                    <div className="font-medium text-blue-900 dark:text-blue-100 max-w-20 sm:max-w-32 lg:max-w-48 truncate">
                      {currentBusiness.businessName}
                    </div>
                    <div className="hidden sm:block text-xs text-blue-600 dark:text-blue-400 capitalize">
                      {currentBusiness.businessType}
                    </div>
                  </div>
                  {/* Rent account funding indicator dot */}
                  {rentIndicator.hasRentAccount && rentIndicator.indicator && (
                    <span
                      className={`shrink-0 w-2 h-2 rounded-full ${
                        rentIndicator.indicator === 'green' ? 'bg-green-500' :
                        rentIndicator.indicator === 'orange' ? 'bg-orange-400' :
                        'bg-red-500'
                      }`}
                      title={`Rent fund: ${rentIndicator.fundingPercent}%`}
                    />
                  )}
                  <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {isSystemAdmin(session.user as SessionUser) && (
                    <div className="hidden lg:block text-xs text-blue-500 dark:text-blue-400 bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
                      Admin
                    </div>
                  )}
                </button>

                {/* Business dropdown menu */}
                {showBusinessMenu && (
                  <>
                    {/* Overlay only when opened by click — hover uses mouseLeave instead */}
                    {businessMenuOpenedByClick.current && (
                      <div className="fixed inset-0 z-40" onClick={() => {
                        // Ignore clicks within 200ms of opening to prevent flash-close
                        if (Date.now() - businessMenuOpenedAt.current < 200) return
                        closeBusinessMenu()
                      }} />
                    )}
                    <div
                      className="fixed left-12 right-2 sm:absolute sm:left-auto sm:right-auto top-14 sm:top-full mt-0 sm:mt-2 sm:w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
                      onMouseEnter={handleBusinessMenuEnter}
                      onMouseLeave={handleBusinessMenuLeave}
                    >
                    <div className="py-2">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {currentBusiness.businessName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {currentBusiness.businessType} Business
                        </p>
                      </div>
                      
                      <div className="py-1">
                        {/* ── Quick Business Switcher ── */}
                        {(() => {
                          const otherBusinesses = businesses.filter(
                            b => b.businessId !== currentBusiness.businessId && b.isActive
                          )
                          if (otherBusinesses.length === 0) return null
                          const isSingle = otherBusinesses.length === 1
                          return (
                            <>
                              {isSingle ? (
                                // Single other business — one-click direct switch
                                <button
                                  disabled={!!switchingToBusinessId}
                                  onClick={() => handleSwitchBusiness(otherBusinesses[0].businessId, otherBusinesses[0].businessType)}
                                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 transition-colors w-full text-left disabled:opacity-60"
                                >
                                  <span className={switchingToBusinessId === otherBusinesses[0].businessId ? 'animate-spin inline-block' : ''}>
                                    {switchingToBusinessId === otherBusinesses[0].businessId ? '⟳' : '🔄'}
                                  </span>
                                  <span className="truncate">Switch to {otherBusinesses[0].businessName}</span>
                                  <span className="ml-auto text-xs capitalize text-gray-400 dark:text-gray-500 shrink-0">{otherBusinesses[0].businessType}</span>
                                </button>
                              ) : (
                                // Multiple businesses — accordion
                                <>
                                  <button
                                    onClick={() => setShowBusinessSwitcher(prev => !prev)}
                                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <span>🔄</span>
                                      <span>Switch Business</span>
                                    </div>
                                    <svg
                                      className={`w-3 h-3 text-gray-400 transition-transform duration-150 ${showBusinessSwitcher ? 'rotate-180' : ''}`}
                                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                  {showBusinessSwitcher && (
                                    <div className="border-y border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                                      {/* Current business indicator — with edit shortcut for permitted users */}
                                      <div className="flex items-center gap-2 px-6 py-1.5">
                                        <span className="text-green-500 text-xs shrink-0">✓</span>
                                        <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{currentBusiness.businessName}</span>
                                        <span className="ml-auto capitalize text-gray-300 dark:text-gray-600 text-xs shrink-0">{currentBusiness.businessType}</span>
                                        {(isSystemAdmin(session.user as SessionUser) || hasPermission('canEditBusiness')) && (
                                          <button
                                            onClick={() => { closeBusinessMenu(); setShowEditBusiness(true) }}
                                            title="Edit this business"
                                            className="shrink-0 ml-1 p-0.5 rounded text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
                                            </svg>
                                          </button>
                                        )}
                                      </div>
                                      {/* Search — only when > 3 other businesses */}
                                      {otherBusinesses.length > 3 && (
                                        <div className="px-3 pb-1.5">
                                          <div className="relative">
                                            <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                                            </svg>
                                            <input
                                              type="text"
                                              value={businessSwitcherSearch}
                                              onChange={e => setBusinessSwitcherSearch(e.target.value)}
                                              placeholder="Search businesses…"
                                              autoFocus
                                              className="w-full pl-6 pr-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                            />
                                          </div>
                                        </div>
                                      )}
                                      {/* Other businesses — scrollable when > 3 */}
                                      <div className={otherBusinesses.length > 3 ? 'overflow-y-auto max-h-48' : ''}>
                                        {(() => {
                                          const q = businessSwitcherSearch.trim().toLowerCase()
                                          const filtered = q
                                            ? otherBusinesses.filter(b =>
                                                b.businessName.toLowerCase().includes(q) ||
                                                b.businessType.toLowerCase().includes(q)
                                              )
                                            : otherBusinesses
                                          if (filtered.length === 0) {
                                            return (
                                              <p className="px-6 py-2 text-xs text-gray-400 dark:text-gray-500 italic">No businesses match</p>
                                            )
                                          }
                                          return filtered.map(biz => (
                                            <button
                                              key={biz.businessId}
                                              disabled={!!switchingToBusinessId}
                                              onClick={() => handleSwitchBusiness(biz.businessId, biz.businessType)}
                                              className="flex items-center gap-2 w-full px-6 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 transition-colors text-left disabled:opacity-60"
                                            >
                                              <span className={`shrink-0 ${switchingToBusinessId === biz.businessId ? 'animate-spin inline-block' : ''}`}>
                                                {switchingToBusinessId === biz.businessId ? '⟳' : '🏢'}
                                              </span>
                                              <span className="truncate">{biz.businessName}</span>
                                              <span className="ml-auto capitalize text-gray-400 dark:text-gray-500 shrink-0">{biz.businessType}</span>
                                            </button>
                                          ))
                                        })()}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                              <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                            </>
                          )
                        })()}

                        {/* Business-specific links */}
                        {getBusinessMenuLinks(currentBusiness.businessType, pathname).map((link, index) => (
                          <button
                            key={index}
                            className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full text-left"
                            onClick={() => {
                              closeBusinessMenu()
                              router.push(link.href)
                            }}
                          >
                            <span>{link.icon}</span>
                            <span>{link.label}</span>
                          </button>
                        ))}

                        {/* Test Print - available to all business members */}
                        {hasPermission('canViewBusiness') && (
                          <>
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                            <button
                              className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full text-left"
                              onClick={() => {
                                closeBusinessMenu()
                                setShowTestPrint(true)
                              }}
                            >
                              <span>🖨️</span>
                              <span>Test Print</span>
                            </button>
                          </>
                        )}

                        {/* Expense Reports Hub */}
                        {(isAdmin || hasPermission('canViewExpenseReports')) && (
                          <>
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                            <button
                              className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full text-left"
                              onClick={() => {
                                closeBusinessMenu()
                                router.push('/expense-accounts/reports')
                              }}
                            >
                              <span>📊</span>
                              <span>Expense Reports Hub</span>
                            </button>
                          </>
                        )}

                        {/* General Expense Account - requires financial data access */}
                        {(isAdmin || hasPermission('canAccessFinancialData')) && hasPermission('canAccessExpenseAccount') && (
                          <>
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                            <button
                              className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full text-left"
                              onClick={() => {
                                closeBusinessMenu()
                                router.push('/expense-accounts/acc-general-expenses')
                              }}
                            >
                              <span>💳</span>
                              <span>General Expenses</span>
                            </button>
                          </>
                        )}

                        {/* Business Account - financial data access */}
                        {(isAdmin || hasPermission('canAccessFinancialData')) && (
                          <>
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                            <button
                              className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full text-left"
                              onClick={() => {
                                closeBusinessMenu()
                                router.push(`/business-accounts/${currentBusiness.businessId}`)
                              }}
                            >
                              <span>🏦</span>
                              <span>Business Account</span>
                            </button>
                          </>
                        )}

                        {/* Business address and phone - non-clickable info at bottom */}
                        {(currentBusiness.address || currentBusiness.phone) && (
                          <>
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                            <div className="px-4 py-2 pointer-events-none">
                              {currentBusiness.address && (
                                <p className="text-xs text-blue-600 dark:text-blue-400">
                                  📍 {currentBusiness.address}
                                </p>
                              )}
                              {currentBusiness.phone && (
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                  📞 {currentBusiness.phone}
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  </>
                )}
              </div>
            )}
            {session?.user && (
              <>
                {/* Pending Actions Bell — shown when user has any pending actions */}
                {pendingCount > 0 && (
                  <Link
                    href="/admin/pending-actions"
                    className="relative p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title={pendingCount > 0 ? `${pendingCount} pending action${pendingCount !== 1 ? 's' : ''}` : 'No pending actions'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {pendingCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </span>
                    )}
                  </Link>
                )}
                {/* Mini Cart */}
                <MiniCart />
                <ThemeToggle
                  showMenu={showThemeMenu}
                  setShowMenu={setShowThemeMenu}
                />
                {/* UTC / Local time toggle */}
                <button
                  onClick={toggleTimeDisplay}
                  className={`px-2 py-1 text-[11px] font-semibold rounded border transition-colors ${
                    useServerTime
                      ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700'
                      : 'bg-gray-100 text-gray-500 border-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  title={useServerTime ? 'Showing UTC (server time) — click for local time' : 'Showing local time — click for UTC (server time)'}
                >
                  {useServerTime ? 'UTC' : 'Local'}
                </button>
                <UserDropdown
                  user={session.user as SessionUser}
                  showMenu={showUserMenu}
                  setShowMenu={setShowUserMenu}
                  onQuickActivity={() => setShowQuickActivity(true)}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </header>

      {/* Test Print Modal */}
      {showTestPrint && currentBusiness?.businessId && (
        <TestPrintModal
          businessId={currentBusiness.businessId}
          onClose={() => setShowTestPrint(false)}
        />
      )}

      {/* Quick Activity Simulator — admin only */}
      {showQuickActivity && (
        <QuickActivityModal
          businesses={businesses}
          onClose={() => setShowQuickActivity(false)}
        />
      )}

      {/* Inline Edit Business Modal — no page navigation needed */}
      {showEditBusiness && currentBusiness?.businessId && (
        <BusinessCreationModal
          method="PUT"
          id={currentBusiness.businessId}
          onClose={() => setShowEditBusiness(false)}
          onSuccess={async () => {
            setShowEditBusiness(false)
            await refreshBusinesses()
          }}
          onError={() => {}}
        />
      )}
    </>
  )
}

interface BreadcrumbProps {
  pathname: string
  title?: string
}

function Breadcrumb({ pathname, title }: BreadcrumbProps) {
  const segments = pathname.split('/').filter(Boolean)

  // If we're on the dashboard page, just show "Home" without any additional breadcrumb items
  if (pathname === '/dashboard') {
    return (
      <nav className="flex items-center space-x-2 text-sm">
        <span className="text-gray-900 dark:text-white font-medium">Home</span>
      </nav>
    )
  }

  const breadcrumbItems = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const isLast = index === segments.length - 1
    const displayName = title && isLast ? title : formatSegmentName(segment)

    return {
      href,
      name: displayName,
      isLast
    }
  })

  if (breadcrumbItems.length === 0) return null

  return (
    <nav className="flex items-center space-x-2 text-sm">
      <Link href="/dashboard" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
        Home
      </Link>
      {breadcrumbItems.map((item, index) => (
        <div key={item.href} className="flex items-center space-x-2">
          <span className="text-gray-300 dark:text-gray-600">/</span>
          {item.isLast ? (
            <span className="text-gray-900 dark:text-white font-medium">
              {item.name}
            </span>
          ) : (
            <Link 
              href={item.href}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {item.name}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}

function formatSegmentName(segment: string): string {
  // Special case: "dashboard" should be "Home"
  if (segment.toLowerCase() === 'dashboard') {
    return 'Home'
  }

  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

interface ThemeToggleProps {
  showMenu: boolean
  setShowMenu: (show: boolean) => void
}

function ThemeToggle({ showMenu, setShowMenu }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const getThemeIcon = () => {
    if (theme === 'system') return '⚙️'
    if (resolvedTheme === 'dark') return '🌙'
    return '☀️'
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Toggle theme"
      >
        <span className="text-lg">{getThemeIcon()}</span>
      </button>

      {showMenu && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            <div className="py-1">
              <button
                onClick={() => {
                  setTheme('light')
                  setShowMenu(false)
                }}
                className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  theme === 'light' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>☀️</span>
                <span>Light</span>
                {theme === 'light' && <span className="ml-auto">✓</span>}
              </button>
              
              <button
                onClick={() => {
                  setTheme('dark')
                  setShowMenu(false)
                }}
                className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  theme === 'dark' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>🌙</span>
                <span>Dark</span>
                {theme === 'dark' && <span className="ml-auto">✓</span>}
              </button>
              
              <button
                onClick={() => {
                  setTheme('system')
                  setShowMenu(false)
                }}
                className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  theme === 'system' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>⚙️</span>
                <span>System</span>
                {theme === 'system' && <span className="ml-auto">✓</span>}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface UserDropdownProps {
  user: SessionUser
  showMenu: boolean
  setShowMenu: (show: boolean) => void
  onQuickActivity?: () => void
}

function UserDropdown({ user, showMenu, setShowMenu, onQuickActivity }: UserDropdownProps) {
  const pathname = usePathname()
  const { hasPermission, currentBusiness } = useBusinessPermissionsContext()
  const userMenuOpenedByClick = useRef(false)
  const userMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const userMenuOpenedAt = useRef(0)

  const closeUserMenu = () => {
    if (userMenuTimeoutRef.current) {
      clearTimeout(userMenuTimeoutRef.current)
      userMenuTimeoutRef.current = null
    }
    userMenuOpenedByClick.current = false
    setShowMenu(false)
  }

  const handleUserMenuEnter = () => {
    if (userMenuTimeoutRef.current) {
      clearTimeout(userMenuTimeoutRef.current)
      userMenuTimeoutRef.current = null
    }
    if (!userMenuOpenedByClick.current && !showMenu) {
      userMenuTimeoutRef.current = setTimeout(() => {
        setShowMenu(true)
      }, 300)
    }
  }

  const handleUserMenuLeave = () => {
    if (userMenuTimeoutRef.current) {
      clearTimeout(userMenuTimeoutRef.current)
      userMenuTimeoutRef.current = null
    }
    if (userMenuOpenedByClick.current) return
    userMenuTimeoutRef.current = setTimeout(() => {
      setShowMenu(false)
    }, 150)
  }

  const handleSignOut = () => {
    const currentOrigin = window.location.origin
    signOut({
      callbackUrl: currentOrigin,
      redirect: true
    }).then(() => {
      setTimeout(() => {
        if (!window.location.pathname.startsWith('/auth')) {
          window.location.href = `${currentOrigin}/auth/signin`
        }
      }, 100)
    })
    closeUserMenu()
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2)
  }

  const getHelpUrl = () => {
    // Map different page patterns to help documentation
    if (pathname.includes('/admin/users')) return '/help/user-management'
    if (pathname.includes('/admin')) return '/help/administration'
    if (pathname.includes('/personal')) return '/help/personal-finance'
    if (pathname.includes('/construction')) return '/help/construction'
    if (pathname.includes('/restaurant')) return '/help/restaurant'
    if (pathname.includes('/grocery')) return '/help/grocery'
    if (pathname.includes('/clothing')) return '/help/clothing'
    if (pathname.includes('/business')) return '/help/business-management'
    return '/help/general'
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (showMenu) {
            closeUserMenu()
          } else {
            if (userMenuTimeoutRef.current) {
              clearTimeout(userMenuTimeoutRef.current)
              userMenuTimeoutRef.current = null
            }
            userMenuOpenedByClick.current = true
            userMenuOpenedAt.current = Date.now()
            setShowMenu(true)
          }
        }}
        onMouseEnter={handleUserMenuEnter}
        onMouseLeave={handleUserMenuLeave}
        className="flex items-center space-x-1 sm:space-x-3 text-sm rounded-md p-1 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm shrink-0">
          {getInitials(user.name || user.email || 'User')}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-gray-900 dark:text-white font-medium">{user.name}</p>
          <p className="text-gray-500 dark:text-gray-400 text-xs">{user.email}</p>
        </div>
        <svg
          className="hidden sm:block w-4 h-4 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showMenu && (
        <>
          {/* Overlay only when opened by click — hover uses mouseLeave instead */}
          {userMenuOpenedByClick.current && (
            <div
              className="fixed inset-0 z-10"
              onClick={() => {
                if (Date.now() - userMenuOpenedAt.current < 200) return
                closeUserMenu()
              }}
            />
          )}
          <div
            className="fixed right-2 sm:absolute sm:right-0 mt-2 w-[calc(100vw-1rem)] sm:w-56 max-w-xs bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20"
            onMouseEnter={handleUserMenuEnter}
            onMouseLeave={handleUserMenuLeave}
          >
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Role: {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
              </p>
            </div>
            
            <div className="py-1">
              <Link
                href="/profile"
                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => closeUserMenu()}
              >
                <div className="flex items-center space-x-2">
                  <span>👤</span>
                  <span>Profile Settings</span>
                </div>
              </Link>
              
              <Link
                href="/dashboard"
                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => closeUserMenu()}
              >
                <div className="flex items-center space-x-2">
                  <span>📊</span>
                  <span>Dashboard</span>
                </div>
              </Link>

              {isSystemAdmin(user) && (
                <>
                  <Link
                    href="/admin"
                    className="block px-4 py-2 text-sm text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 font-semibold"
                    onClick={() => closeUserMenu()}
                  >
                    <div className="flex items-center space-x-2">
                      <span>🛠️</span>
                      <span>System Admin</span>
                    </div>
                  </Link>
                  <Link
                    href="/admin/users"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => closeUserMenu()}
                  >
                    <div className="flex items-center space-x-2">
                      <span>👥</span>
                      <span>User Management</span>
                    </div>
                  </Link>
                  <button
                    onClick={() => { closeUserMenu(); onQuickActivity?.() }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center space-x-2">
                      <span>⚡</span>
                      <span>Quick Activity</span>
                    </div>
                  </button>
                </>
              )}

              {(
                isSystemAdmin(user) ||
                hasPermission('canExportBusinessData') ||
                hasPermission('canImportBusinessData') ||
                hasPermission('canBackupBusiness') ||
                hasPermission('canRestoreBusiness')
              ) && (
                <Link
                  href="/admin/data-management"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => closeUserMenu()}
                >
                  <div className="flex items-center space-x-2">
                    <span>🗂️</span>
                    <span>Data Management</span>
                  </div>
                </Link>
              )}

              {/* Printer Management link - visible to admins and business owners */}
              {(isSystemAdmin(user) || currentBusiness?.role === 'business-owner') && (
                <Link
                  href="/admin/printers"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => closeUserMenu()}
                >
                  <div className="flex items-center space-x-2">
                    <span>🖨️</span>
                    <span>Printer Management</span>
                  </div>
                </Link>
              )}

              {/* Business Management link - visible to system admins and users with business management permissions */}
              {(
                isSystemAdmin(user) ||
                hasPermission('canManageBusinessUsers') ||
                hasPermission('canManageBusinessSettings')
              ) && (
                <Link
                  href="/business/manage"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => closeUserMenu()}
                >
                  <div className="flex items-center space-x-2">
                    <span>🏢</span>
                    <span>Business Management</span>
                  </div>
                </Link>
              )}

              {/* Expense Accounts link - visible to users who can access expense accounts or admins */}
              {(
                isSystemAdmin(user) ||
                hasPermission('canAccessExpenseAccount')
              ) && (
                <Link
                  href="/expense-accounts"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => closeUserMenu()}
                >
                  <div className="flex items-center space-x-2">
                    <span>💳</span>
                    <span>Expense Accounts</span>
                  </div>
                </Link>
              )}

              {/* Business Account link - visible to users with financial data access or admins */}
              {(
                isSystemAdmin(user) ||
                hasPermission('canAccessFinancialData')
              ) && (
                <Link
                  href={`/business-accounts/${currentBusiness?.businessId ?? ''}`}
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => closeUserMenu()}
                >
                  <div className="flex items-center space-x-2">
                    <span>🏦</span>
                    <span>Business Account</span>
                  </div>
                </Link>
              )}

              <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
              
              <Link
                href={getHelpUrl()}
                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => closeUserMenu()}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="flex items-center space-x-2">
                  <span>❓</span>
                  <span>Help & Documentation</span>
                </div>
              </Link>
              
              <Link
                href="/support"
                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => closeUserMenu()}
              >
                <div className="flex items-center space-x-2">
                  <span>📧</span>
                  <span>Contact Support</span>
                </div>
              </Link>

              <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
              
              <button
                onClick={handleSignOut}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="flex items-center space-x-2">
                  <span>🚪</span>
                  <span>Sign Out</span>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}