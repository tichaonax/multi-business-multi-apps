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
import { TestBarcodeGeneratorModal } from '@/components/admin/test-barcode-generator-modal'
import { useTimeDisplay } from '@/hooks/use-time-display'
import { useRentIndicator } from '@/hooks/use-rent-indicator'
import { usePendingActionsCount, usePendingActions } from '@/hooks/use-pending-actions-count'
import { useNotifications } from '@/components/providers/notification-provider'
import HealthIndicator from '@/components/ui/health-indicator'

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
  const [showTestBarcodeGenerator, setShowTestBarcodeGenerator] = useState(false)
  const [showEditBusiness, setShowEditBusiness] = useState(false)
  const [editBusinessInitial, setEditBusinessInitial] = useState<Record<string, any> | null>(null)
  const [showBusinessSwitcher, setShowBusinessSwitcher] = useState(false)
  const [switchingToBusinessId, setSwitchingToBusinessId] = useState<string | null>(null)
  const [businessSwitcherSearch, setBusinessSwitcherSearch] = useState('')
  const { useServerTime, toggleTimeDisplay } = useTimeDisplay()
  const [clockNow, setClockNow] = useState<Date | null>(null)
  const businessMenuOpenedByClick = useRef(false)
  const businessMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const businessMenuOpenedAt = useRef(0)

  // Close all menus on navigation
  useEffect(() => {
    setShowBusinessMenu(false)
    setShowUserMenu(false)
    setShowThemeMenu(false)
  }, [pathname])

  // Live clock
  useEffect(() => {
    setClockNow(new Date())
    const id = setInterval(() => setClockNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

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
  const canSeeGeneralExpenses = isAdmin || hasPermission('canAccessFinancialData')
  const pendingCount = usePendingActionsCount()
  const pendingActions = usePendingActions()
  const { unreadCount: notifUnreadCount, notifications: notifList, markRead, markAllRead } = useNotifications()
  const [showBellPreview, setShowBellPreview] = useState(false)
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [pendingDraftNav, setPendingDraftNav] = useState<{ businessId: string; businessName: string; url: string; title: string } | null>(null)
  const [showUnreadOnly, setShowUnreadOnly] = useState(true)
  const [canPettyCashRequest, setCanPettyCashRequest] = useState(false)

  // Fetch petty cash permission once on mount (system-level, not covered by hasPermission)
  useEffect(() => {
    if (!session) return
    fetch('/api/petty-cash/my-permissions', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j?.canRequest) setCanPettyCashRequest(true) })
      .catch(() => {})
  }, [session])
  const notifRef = useRef<HTMLDivElement>(null)
  const notifHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bellRef = useRef<HTMLDivElement>(null)
  const bellHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
        { href: `/${businessType}/inventory?bulkStock=1`, icon: '📥', label: 'Bulk Stock', permissions: ['canManageInventory'] },
        { href: `/${businessType}/menu`, icon: '📋', label: 'Menu Management', permissions: ['canManageMenu'] },
        { href: `/${businessType}/orders`, icon: '📦', label: 'Orders', permissions: ['canEnterManualOrders', 'canAccessFinancialData'] },
        { href: '/restaurant/meal-program/participants', icon: '👥', label: 'Meal Program · Participants', permissions: ['canManageEmployees', 'canManageMenu', 'canManageInventory'] },
        { href: '/restaurant/meal-program/eligible-items', icon: '🍱', label: 'Meal Program · Items', permissions: ['canManageEmployees', 'canManageMenu', 'canManageInventory'] }
      ],
      grocery: [
        { href: `/${businessType}/pos`, icon: '🛒', label: 'POS System' },
        { href: `/${businessType}/reports`, icon: '📊', label: 'Sales Reports', permissions: ['canViewWifiReports', 'canAccessFinancialData'] },
        { href: `/${businessType}/inventory`, icon: '📦', label: 'Inventory' },
        { href: `/${businessType}/inventory?bulkStock=1`, icon: '📥', label: 'Bulk Stock', permissions: ['canManageInventory'] },
        { href: `/${businessType}/inventory?tab=bales`, icon: '📦', label: 'Bales Inventory' },
        { href: `/${businessType}/products`, icon: '📦', label: 'Products' },
        { href: `/${businessType}/orders`, icon: '📦', label: 'Orders', permissions: ['canEnterManualOrders', 'canAccessFinancialData'] }
      ],
      clothing: [
        { href: `/${businessType}/pos`, icon: '👕', label: 'POS System' },
        { href: `/${businessType}/reports`, icon: '📊', label: 'Sales Reports', permissions: ['canViewWifiReports', 'canAccessFinancialData'] },
        { href: `/${businessType}/inventory`, icon: '📦', label: 'Inventory' },
        { href: `/${businessType}/inventory?bulkStock=1`, icon: '📥', label: 'Bulk Stock', permissions: ['canManageInventory'] },
        { href: '/clothing/inventory?tab=bales', icon: '📦', label: 'Bales Inventory' },
        { href: `/${businessType}/products`, icon: '👗', label: 'Products' },
        { href: `/${businessType}/orders`, icon: '📦', label: 'Orders', permissions: ['canEnterManualOrders', 'canAccessFinancialData'] }
      ],
      hardware: [
        { href: `/${businessType}/pos`, icon: '🔧', label: 'POS System' },
        { href: `/${businessType}/reports`, icon: '📊', label: 'Sales Reports', permissions: ['canViewWifiReports', 'canAccessFinancialData'] },
        { href: `/${businessType}/inventory`, icon: '📦', label: 'Inventory' },  // Salespersons need this for item search
        { href: `/${businessType}/inventory?bulkStock=1`, icon: '📥', label: 'Bulk Stock', permissions: ['canManageInventory'] },
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
      .filter((link, idx, arr) => arr.findIndex(l => l.label === link.label) === idx) // deduplicate same-label accounts

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

  useEffect(() => {
    // Removed debug logging for pendingCashAllocations
  }, [pendingActions])

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

            {/* Live date & time — desktop only */}
            {clockNow && (
              <div className="hidden lg:flex flex-col items-start leading-tight ml-4 border-l border-gray-200 dark:border-gray-700 pl-4">
                <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  {useServerTime
                    ? clockNow.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' })
                    : clockNow.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                </span>
                <span className="text-base font-bold text-gray-900 dark:text-white tabular-nums tracking-tight">
                  {useServerTime
                    ? clockNow.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' })
                    : clockNow.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            )}
            {showBreadcrumb && <div className="hidden sm:block min-w-0 overflow-hidden"><Breadcrumb pathname={pathname} title={title} /></div>}
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
                                            onClick={async () => {
                                              closeBusinessMenu()
                                              const id = currentBusiness?.businessId
                                              if (!id) return
                                              try {
                                                const res = await fetch(`/api/universal/business-config?businessId=${encodeURIComponent(id)}`)
                                                const json = res.ok ? await res.json() : {}
                                                const biz = json?.data
                                                setEditBusinessInitial({
                                                  name: biz?.businessName || currentBusiness.businessName,
                                                  type: biz?.businessType || currentBusiness.businessType,
                                                  description: biz?.businessDescription || '',
                                                  address: biz?.address || '',
                                                  phone: biz?.phone || '',
                                                  ecocashEnabled: biz?.ecocashEnabled ?? false,
                                                  ecocashFeeType: biz?.ecocashFeeType || 'FIXED',
                                                  ecocashFeeValue: biz?.ecocashFeeValue != null ? String(biz.ecocashFeeValue) : '',
                                                  couponsEnabled: biz?.couponsEnabled ?? false,
                                                  promosEnabled: biz?.promosEnabled ?? false,
                                                  receiptReturnPolicy: biz?.receiptReturnPolicy || 'All sales are final, returns not accepted',
                                                  taxEnabled: biz?.taxEnabled ?? false,
                                                  taxIncludedInPrice: biz?.taxIncludedInPrice ?? true,
                                                  taxRate: biz?.taxRate ? String(biz.taxRate) : '',
                                                  taxLabel: biz?.taxLabel || '',
                                                  defaultPage: biz?.defaultPage || '',
                                                  slogan: biz?.slogan || 'Where Customer Is King',
                                                  showSlogan: biz?.showSlogan ?? true,
                                                })
                                              } catch {
                                                setEditBusinessInitial({ name: currentBusiness.businessName, type: currentBusiness.businessType })
                                              }
                                              setShowEditBusiness(true)
                                            }}
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

                        {/* General Expense Account - requires financial data access + account must exist for this business */}
                        {canSeeGeneralExpenses && currentBusiness?.expenseAccounts?.some(ea => ea.id === 'acc-general-expenses') && (
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
                {/* Pending Actions Bell — hover to preview, click to navigate */}
                <div
                    ref={bellRef}
                    className="relative"
                    onMouseEnter={() => {
                      if (bellHideTimer.current) clearTimeout(bellHideTimer.current)
                      setShowBellPreview(true)
                    }}
                    onMouseLeave={() => {
                      bellHideTimer.current = setTimeout(() => setShowBellPreview(false), 150)
                    }}
                  >
                    <Link
                      href="/admin/pending-actions"
                      className="relative flex p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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

                    {/* Hover preview dropdown */}
                    {showBellPreview && pendingActions && (
                      <div className="absolute right-0 top-full mt-1 w-72 rounded-lg border border-border bg-white dark:bg-gray-800 shadow-xl z-50 overflow-hidden">
                        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-border flex items-center justify-between">
                          <span className="text-xs font-semibold text-primary">Pending Actions</span>
                          <span className="text-xs text-secondary">{pendingCount} total</span>
                        </div>
                        <div className="divide-y divide-border max-h-80 overflow-y-auto">
                          {pendingActions.pendingPaymentBatches?.map((b: any) => (
                            <Link key={b.id} href={`/expense-accounts/payment-batches/${b.id}/review`} onClick={() => setShowBellPreview(false)} className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-xs">
                              <span className="mt-0.5 shrink-0">📋</span>
                              <div className="min-w-0">
                                <p className="font-medium text-primary truncate">Payment Batch — {b.business?.name ?? '—'}</p>
                                <p className="text-secondary">
                                  {b.eodDate} · {b._count?.payments ?? 0} payments
                                  {b.cashCount > 0 && <span className="ml-1">· 💵 {b.cashCount}</span>}
                                  {b.ecocashCount > 0 && <span className="ml-1">· 📱 {b.ecocashCount}</span>}
                                  {b.totalAmount != null ? <><span> · </span><span className="text-orange-500 dark:text-orange-400 font-semibold">${Number(b.totalAmount).toFixed(2)}</span></> : ''}
                                </p>
                              </div>
                            </Link>
                          ))}
                          {pendingActions.pendingPettyCash?.map((p: any) => (
                            <Link
                              key={p.id}
                              href={`/petty-cash/${p.id}`}
                              onClick={() => setShowBellPreview(false)}
                              className={`flex items-start gap-2 px-3 py-2 text-xs ${p.priority === 'URGENT' ? 'bg-red-50/60 dark:bg-red-900/15 border-l-2 border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                            >
                              <span className="mt-0.5 shrink-0">{p.priority === 'URGENT' ? '🚨' : '🪙'}</span>
                              <div className="min-w-0 flex-1">
                                <p className={`font-medium truncate ${p.priority === 'URGENT' ? 'text-red-700 dark:text-red-300' : 'text-primary'}`}>
                                  {p.priority === 'URGENT' && <span className="text-red-600 dark:text-red-400 font-bold mr-1">URGENT</span>}
                                  {p.requester?.name ?? '—'}
                                  <span className="ml-1.5 font-normal">{p.paymentChannel === 'ECOCASH' ? '📱 EcoCash' : '💵 Cash'}</span>
                                </p>
                                <p className="text-secondary">{p.business?.name && <span className="font-medium text-primary">{p.business.name} · </span>}{p.purpose} · <span className="text-orange-500 dark:text-orange-400 font-semibold">${Number(p.requestedAmount ?? 0).toFixed(2)}</span></p>
                              </div>
                            </Link>
                          ))}
                          {(pendingActions.outstandingPettyCash?.length ?? 0) > 0 && (
                            <>
                              <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border-t border-border">
                                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                                  💵 Cash In-Hand — {pendingActions.outstandingPettyCash!.length} request{pendingActions.outstandingPettyCash!.length !== 1 ? 's' : ''} · ${Number(pendingActions.outstandingPettyCashTotal ?? 0).toFixed(2)} outstanding
                                </span>
                              </div>
                              {pendingActions.outstandingPettyCash!.map((r) => (
                                <Link key={r.id} href={`/petty-cash/${r.id}`} onClick={() => setShowBellPreview(false)} className="flex items-start gap-2 px-3 py-2 hover:bg-amber-50 dark:hover:bg-amber-900/10 text-xs">
                                  <span className="mt-0.5 shrink-0">💵</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-primary truncate">{r.requesterName} — {r.purpose}</p>
                                    <p className="text-secondary">{r.businessName} · <span className="text-orange-500 dark:text-orange-400 font-medium">${r.remainingBalance.toFixed(2)} remaining</span></p>
                                  </div>
                                </Link>
                              ))}
                            </>
                          )}
                          {pendingActions.pendingCashAllocations?.map((r: any) => {
                            const isGrouped = r.isGrouped === true
                            const cashAllocUrl = isGrouped
                              ? `/${r.business?.type ?? 'restaurant'}/reports/cash-allocation?reportId=${r.id}&businessId=${r.business?.id ?? ''}`
                              : `/${r.business?.type ?? 'restaurant'}/reports/cash-allocation?date=${r.reportDate ? r.reportDate.split('T')[0] : ''}&businessId=${r.business?.id ?? ''}`
                            const dateLabel = isGrouped
                              ? (() => {
                                  const dates: string[] = (r.groupedRun?.dates ?? []).map((d: any) => d.date).sort()
                                  if (dates.length === 0) return `${r._count?.lineItems ?? 0} items`
                                  const fmt = (s: string) => s.slice(5).replace('-', '/')
                                  return dates.length === 1 ? fmt(dates[0]) : `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])} (${dates.length} days)`
                                })()
                              : r.reportDate ? new Date(r.reportDate.split('T')[0] + 'T00:00:00').toLocaleDateString() : '—'
                            return (
                              <Link key={r.id} href={cashAllocUrl} onClick={() => setShowBellPreview(false)} className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-xs">
                                <span className="mt-0.5 shrink-0">{isGrouped ? '📅' : '📊'}</span>
                                <div className="min-w-0">
                                  <p className="font-medium text-primary truncate">{isGrouped ? 'Grouped EOD Catch-Up' : 'Cash Allocation'} — {r.business?.name ?? '—'}</p>
                                  <p className="text-secondary">
                                    {dateLabel}
                                    {r._count?.lineItems === 0
                                      ? <><span> · </span><span className="text-amber-500 dark:text-amber-400">ready to generate</span></>
                                      : null}
                                  </p>
                                  <p className="text-secondary flex flex-wrap gap-x-3 mt-0.5">
                                    {r.cashboxDeposit != null && (
                                      <span>💵 <span className="font-semibold text-blue-600 dark:text-blue-400">${Number(r.cashboxDeposit).toFixed(2)}</span></span>
                                    )}
                                    {r.totalReported > 0 && (
                                      <span>📤 <span className="font-semibold text-emerald-600 dark:text-emerald-400">${Number(r.totalReported).toFixed(2)}</span></span>
                                    )}
                                  </p>
                                </div>
                              </Link>
                            )
                          })}
                          {(pendingActions.pendingStockTakeDrafts?.length ?? 0) > 0 && (
                            <>
                              <div className="px-3 py-1.5 bg-teal-50 dark:bg-teal-900/20 border-t border-border">
                                <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wide">
                                  📦 Bulk Stock — {pendingActions.pendingStockTakeDrafts!.length} draft{pendingActions.pendingStockTakeDrafts!.length !== 1 ? 's' : ''} in progress
                                </span>
                              </div>
                              {pendingActions.pendingStockTakeDrafts!.map((d) => (
                                <button
                                  key={d.id}
                                  onClick={() => {
                                    setShowBellPreview(false)
                                    const url = `/${d.businessType}/inventory?bulkStock=1`
                                    if (d.businessId && currentBusiness?.businessId && d.businessId !== currentBusiness.businessId) {
                                      setPendingDraftNav({ businessId: d.businessId, businessName: d.businessName, url, title: d.title })
                                    } else {
                                      window.location.href = url
                                    }
                                  }}
                                  className="w-full flex items-start gap-2 px-3 py-2 hover:bg-teal-50 dark:hover:bg-teal-900/10 text-xs text-left"
                                >
                                  <span className="mt-0.5 shrink-0">📦</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-primary truncate">{d.title}</p>
                                    <p className="text-secondary">{d.businessName} · <span className="text-teal-600 dark:text-teal-400 font-medium">{d.itemCount} item{d.itemCount !== 1 ? 's' : ''} saved</span></p>
                                  </div>
                                </button>
                              ))}
                            </>
                          )}
                          {pendingActions.pendingSupplierPayments?.map((s: any) => (
                            <Link key={s.id} href="/supplier-payments" onClick={() => setShowBellPreview(false)} className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-xs">
                              <span className="mt-0.5 shrink-0">🏭</span>
                              <div className="min-w-0">
                                <p className="font-medium text-primary truncate">Supplier Payment — {s.supplier?.name ?? '—'}</p>
                                <p className="text-secondary"><span className="text-orange-500 dark:text-orange-400 font-semibold">${Number(s.amount ?? 0).toFixed(2)}</span></p>
                              </div>
                            </Link>
                          ))}
                          {pendingActions.pendingPaymentRequests?.map((r: any) => {
                            const hasUrgent = (r.urgentCount ?? 0) > 0
                            return (
                            <Link key={r.id} href="/admin/pending-actions" onClick={() => setShowBellPreview(false)} className={`flex items-start gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-xs ${hasUrgent ? 'border-l-2 border-red-500' : ''}`}>
                              <span className="mt-0.5 shrink-0">{hasUrgent ? '🚨' : '💳'}</span>
                              <div className="min-w-0">
                                <p className={`font-medium truncate ${hasUrgent ? 'text-red-600 dark:text-red-400' : 'text-primary'}`}>
                                  Payment Requests — {r.accountName ?? '—'}
                                  {hasUrgent && <span className="ml-1.5 text-xs font-bold text-red-600 dark:text-red-400"> URGENT</span>}
                                  {r.cashCount > 0 && <span className="ml-1.5 font-normal">💵 {r.cashCount}</span>}
                                  {r.ecocashCount > 0 && <span className="ml-1.5 font-normal">📱 {r.ecocashCount}</span>}
                                </p>
                                <p className="text-secondary">{r.business?.name && <span className="font-medium text-primary">{r.business.name} · </span>}{r.requestCount ?? r.pendingCount ?? 0} pending{r.totalAmount != null && r.totalAmount > 0 ? <><span> · </span><span className="text-orange-500 dark:text-orange-400 font-semibold">${Number(r.totalAmount).toFixed(2)}</span></> : ''}</p>
                              </div>
                            </Link>
                            )
                          })}
                          {(pendingActions as any).myPendingPayments?.map((r: any) => (
                            <Link key={r.id} href={`/expense-accounts/${r.id}`} onClick={() => setShowBellPreview(false)} className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-xs">
                              <span className="mt-0.5 shrink-0">📤</span>
                              <div className="min-w-0">
                                <p className="font-medium text-primary truncate">My Request — {r.accountName ?? '—'}</p>
                                <p className="text-secondary">
                                  {r.business?.name && <span className="font-medium text-primary">{r.business.name} · </span>}
                                  {r.awaitingCashier
                                    ? <span className="text-amber-500 dark:text-amber-400 font-medium">awaiting cashier</span>
                                    : <span>{r.requestCount ?? 0} queued</span>}
                                  {r.totalAmount != null ? <><span> · </span><span className="text-orange-500 dark:text-orange-400 font-semibold">${Number(r.totalAmount).toFixed(2)}</span></> : ''}
                                </p>
                              </div>
                            </Link>
                          ))}
                          {(pendingActions as any).myApprovedPayments?.map((r: any) => (
                            <Link key={r.id} href={`/expense-accounts/my-payments`} onClick={() => setShowBellPreview(false)} className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-xs border-l-2 border-green-400">
                              <span className="mt-0.5 shrink-0">✅</span>
                              <div className="min-w-0">
                                <p className="font-medium text-green-700 dark:text-green-400 truncate">Payment Approved — Collect Cash</p>
                                <p className="text-secondary">{r.businessName} · <span className="text-green-600 dark:text-green-400 font-semibold">${Number(r.amount).toFixed(2)}</span>{r.categoryName ? ` · ${r.categoryName}` : ''}{r.notes ? ` · ${r.notes}` : ''}</p>
                                {r.payeeName && <p className="text-secondary font-medium">Payee: {r.payeeName}{r.payeePhone ? ` · ${r.payeePhone}` : ''}</p>}
                              </div>
                            </Link>
                          ))}
                          {(pendingActions as any).myApprovedPettyCash?.map((r: any) => (
                            <Link key={r.id} href={`/petty-cash/${r.id}`} onClick={() => setShowBellPreview(false)} className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-xs border-l-2 border-green-400">
                              <span className="mt-0.5 shrink-0">🪙</span>
                              <div className="min-w-0">
                                <p className="font-medium text-green-700 dark:text-green-400 truncate">Petty Cash Approved — Collect Cash</p>
                                <p className="text-secondary">{r.business?.name} · <span className="text-green-600 dark:text-green-400 font-semibold">${Number(r.approvedAmount).toFixed(2)}</span> · {r.purpose}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                        <div className="px-3 py-2 border-t border-border bg-gray-50 dark:bg-gray-700/50">
                          <Link href="/admin/pending-actions" onClick={() => setShowBellPreview(false)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                            View all pending actions →
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                {/* Notifications Bell — shows personal notification history */}
                {(notifUnreadCount > 0 || notifList.length > 0) && (
                  <div
                    ref={notifRef}
                    className="relative"
                    onMouseEnter={() => { if (notifHideTimer.current) clearTimeout(notifHideTimer.current); setShowNotifPanel(true) }}
                    onMouseLeave={() => { notifHideTimer.current = setTimeout(() => setShowNotifPanel(false), 150) }}
                  >
                    <button
                      className="relative flex p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      onClick={() => setShowNotifPanel(v => !v)}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      {notifUnreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                          {notifUnreadCount > 9 ? '9+' : notifUnreadCount}
                        </span>
                      )}
                    </button>

                    {showNotifPanel && (
                      <div className="absolute right-0 top-full mt-1 w-80 rounded-lg border border-border bg-white dark:bg-gray-800 shadow-xl z-50 overflow-hidden">
                        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-border flex items-center gap-2">
                          <span className="text-xs font-semibold text-primary">Notifications</span>
                          {/* Quick-action shortcuts — shown only when user has the relevant permission */}
                          <div className="flex items-center gap-1 ml-1">
                            {canPettyCashRequest && (
                              <a
                                href="/petty-cash/new"
                                title="New Petty Cash Request"
                                onClick={() => setShowNotifPanel(false)}
                                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                              >
                                <span className="text-sm">💸</span>
                              </a>
                            )}
                            {hasPermission('canAccessExpenseAccount') && (
                              <a
                                href="/expense-accounts/quick-payment"
                                title="New Payment Request"
                                onClick={() => setShowNotifPanel(false)}
                                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                              >
                                <span className="text-sm">💳</span>
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-auto">
                            <button
                              onClick={() => setShowUnreadOnly(v => !v)}
                              className={`text-xs px-1.5 py-0.5 rounded border transition-colors whitespace-nowrap ${showUnreadOnly ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700' : 'text-gray-500 dark:text-gray-400 border-transparent hover:border-gray-300'}`}
                            >
                              {showUnreadOnly ? 'Unread' : 'All'}
                            </button>
                            <a href="/admin/pending-actions" onClick={() => setShowNotifPanel(false)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline whitespace-nowrap">Pending Actions</a>
                            {notifUnreadCount > 0 && (
                              <button onClick={() => markAllRead()} className="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">Mark all read</button>
                            )}
                          </div>
                        </div>
                        <div className="divide-y divide-border max-h-80 overflow-y-auto">
                          {(showUnreadOnly ? notifList.filter(n => !n.isRead) : notifList).length === 0 ? (
                            <div className="px-3 py-4 text-xs text-secondary text-center">{showUnreadOnly ? 'No unread notifications' : 'No notifications'}</div>
                          ) : (showUnreadOnly ? notifList.filter(n => !n.isRead) : notifList).map(n => {
                            const isUrgent = n.title?.includes('Urgent') || n.title?.includes('URGENT') || n.message?.includes('🚨')
                            const hasCash = n.message?.includes('💵')
                            const hasEcoCash = n.message?.includes('📱')
                            const showBadges = (n.type === 'PETTY_CASH_SUBMITTED' || n.type === 'PAYMENT_SUBMITTED' || n.type === 'PAYMENT_APPROVED' || n.type === 'PAYMENT_REJECTED') && (hasCash || hasEcoCash || isUrgent)
                            return (
                            <div
                              key={n.id}
                              className={`flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 text-xs ${
                                isUrgent
                                  ? 'bg-red-50/60 dark:bg-red-900/15 border-l-2 border-red-400'
                                  : !n.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                              }`}
                              onClick={() => { markRead(n.id); setShowNotifPanel(false); if (n.linkUrl) window.location.href = n.linkUrl }}
                            >
                              <span className="mt-0.5 shrink-0 text-base">
                                {isUrgent ? '🚨' : n.type === 'PAYMENT_APPROVED' ? '✅' : n.type === 'PAYMENT_REJECTED' ? '↩️' : n.type === 'PAYMENT_SUBMITTED' ? '📋' : n.type === 'PAYMENT_PAID' ? '💰' : n.type === 'PETTY_CASH_SUBMITTED' ? '💸' : n.type === 'PETTY_CASH_APPROVED' ? '🪙' : n.type === 'PETTY_CASH_REJECTED' ? '❌' : n.type === 'CHAT_MESSAGE' ? '💬' : '🔔'}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className={`font-medium truncate ${isUrgent ? 'text-red-700 dark:text-red-300' : !n.isRead ? 'text-blue-700 dark:text-blue-300' : 'text-primary'}`}>{n.title}</p>
                                <p className="text-secondary line-clamp-2">{n.message}</p>
                                {showBadges && (
                                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                                    {isUrgent && <span className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 font-bold px-1.5 py-0.5 rounded text-[10px]">URGENT</span>}
                                    {hasCash && <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 py-0.5 rounded text-[10px]">💵 Cash</span>}
                                    {hasEcoCash && <span className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-1.5 py-0.5 rounded text-[10px]">📱 EcoCash</span>}
                                  </div>
                                )}
                                <p className="text-gray-400 dark:text-gray-500 mt-0.5">{new Date(n.createdAt).toLocaleString()}</p>
                              </div>
                              {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />}
                            </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
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
                  onTestBarcodeGenerator={() => setShowTestBarcodeGenerator(true)}
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

      {/* Test Barcode Generator — admin only, localhost:8080 */}
      {showTestBarcodeGenerator && (
        <TestBarcodeGeneratorModal
          businesses={businesses.filter((b: any) => ['grocery', 'hardware', 'restaurant', 'clothing'].includes(b.businessType))}
          onClose={() => setShowTestBarcodeGenerator(false)}
        />
      )}

      {/* Bulk Stock draft — business switch confirmation */}
      {pendingDraftNav && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Switch Business?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              The draft <span className="font-semibold">&ldquo;{pendingDraftNav.title}&rdquo;</span> belongs to:
            </p>
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-4">{pendingDraftNav.businessName}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              You will be switched to that business to continue the stock job.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPendingDraftNav(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('currentBusinessId', pendingDraftNav.businessId)
                  window.location.href = pendingDraftNav.url
                }}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
              >
                📦 Switch & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Edit Business Modal — no page navigation needed */}
      {showEditBusiness && currentBusiness?.businessId && editBusinessInitial && (
        <BusinessCreationModal
          method="PUT"
          id={currentBusiness.businessId}
          initial={editBusinessInitial}
          onClose={() => { setShowEditBusiness(false); setEditBusinessInitial(null) }}
          onSuccess={async () => {
            setShowEditBusiness(false)
            setEditBusinessInitial(null)
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

  // UUID pattern — skip these segments entirely (use the segment before them as context)
  const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  // Also skip purely numeric IDs and long opaque tokens (>20 chars with no spaces)
  const isOpaqueId = (s: string) => /^\d+$/.test(s) || (!s.includes('-') && s.length > 20)

  const breadcrumbItems = segments
    .map((segment, index) => {
      if (isUuid(segment) || isOpaqueId(segment)) return null
      const href = '/' + segments.slice(0, index + 1).join('/')
      const isLast = index === segments.length - 1
      const displayName = title && isLast ? title : formatSegmentName(segment)
      return { href, name: displayName, isLast: false }
    })
    .filter(Boolean) as Array<{ href: string; name: string; isLast: boolean }>

  // Mark the actual last visible item
  if (breadcrumbItems.length > 0) {
    breadcrumbItems[breadcrumbItems.length - 1].isLast = true
  }

  if (breadcrumbItems.length === 0) return null

  return (
    <nav className="flex items-center space-x-2 text-sm min-w-0 overflow-hidden">
      <Link href="/dashboard" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 shrink-0">
        Home
      </Link>
      {breadcrumbItems.map((item, index) => (
        <div key={item.href} className="flex items-center space-x-2 min-w-0 shrink">
          <span className="text-gray-300 dark:text-gray-600 shrink-0">/</span>
          {item.isLast ? (
            <span className="text-gray-900 dark:text-white font-medium truncate max-w-[180px]">
              {item.name}
            </span>
          ) : (
            <Link 
              href={item.href}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 truncate max-w-[120px]"
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
  onTestBarcodeGenerator?: () => void
}

function UserDropdown({ user, showMenu, setShowMenu, onQuickActivity, onTestBarcodeGenerator }: UserDropdownProps) {
  const pathname = usePathname()
  const { hasPermission, currentBusiness } = useBusinessPermissionsContext()
  const userMenuOpenedByClick = useRef(false)
  const userMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const userMenuOpenedAt = useRef(0)
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/user/profile', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.profilePhotoUrl) setProfilePhotoUrl(data.profilePhotoUrl) })
      .catch(() => {})
  }, [user.id])

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
        <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden bg-blue-600 flex items-center justify-center text-white font-medium text-sm">
          {profilePhotoUrl ? (
            <img
              src={profilePhotoUrl}
              alt={user.name || 'User'}
              className="w-full h-full object-cover"
              onError={() => setProfilePhotoUrl(null)}
            />
          ) : (
            getInitials(user.name || user.email || 'User')
          )}
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
                  {typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1):8080$/.test(window.location.host) && (
                  <>
                  <button
                    onClick={() => { closeUserMenu(); onQuickActivity?.() }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center space-x-2">
                      <span>⚡</span>
                      <span>Quick Activity</span>
                    </div>
                  </button>
                  <button
                    onClick={() => { closeUserMenu(); onTestBarcodeGenerator?.() }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center space-x-2">
                      <span>🏷️</span>
                      <span>Test Barcode Generator</span>
                    </div>
                  </button>
                  </>
                  )}
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
                  <HealthIndicator inline pollInterval={30000} />
                </div>
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  )
}