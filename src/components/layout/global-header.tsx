'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/contexts/theme-context'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { SessionUser, isSystemAdmin } from '@/lib/permission-utils'

interface GlobalHeaderProps {
  title?: string
  showBreadcrumb?: boolean
}

export function GlobalHeader({ title, showBreadcrumb = true }: GlobalHeaderProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const [showBusinessMenu, setShowBusinessMenu] = useState(false)
  const businessMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Business permissions context
  const {
    currentBusiness,
    isAuthenticated
  } = useBusinessPermissionsContext()

  // Business menu hover handlers
  const handleBusinessMenuEnter = () => {
    if (businessMenuTimeoutRef.current) {
      clearTimeout(businessMenuTimeoutRef.current)
    }
    businessMenuTimeoutRef.current = setTimeout(() => {
      setShowBusinessMenu(true)
    }, 300) // 300ms delay
  }

  const handleBusinessMenuLeave = () => {
    if (businessMenuTimeoutRef.current) {
      clearTimeout(businessMenuTimeoutRef.current)
    }
    businessMenuTimeoutRef.current = setTimeout(() => {
      setShowBusinessMenu(false)
    }, 150) // 150ms delay to hide
  }

  // Get business-specific menu links
  const getBusinessMenuLinks = (businessType: string, currentPathname: string) => {
    const baseLinks = [
      {
        href: `/${businessType}`,
        icon: '🏠',
        label: `${businessType.charAt(0).toUpperCase() + businessType.slice(1)} Home`
      }
    ]

    const businessSpecificLinks = {
      restaurant: [
        { href: `/${businessType}/pos`, icon: '🍽️', label: 'POS System' },
        { href: `/${businessType}/reports`, icon: '📊', label: 'Sales Reports' },
        { href: `/${businessType}/inventory`, icon: '📦', label: 'Inventory' },
        { href: `/${businessType}/menu`, icon: '📋', label: 'Menu Management' },
        { href: `/${businessType}/orders`, icon: '📦', label: 'Orders' }
      ],
      grocery: [
        { href: `/${businessType}/pos`, icon: '🛒', label: 'POS System' },
        { href: `/${businessType}/reports`, icon: '📊', label: 'Sales Reports' },
        { href: `/${businessType}/inventory`, icon: '📦', label: 'Inventory' },
        { href: `/${businessType}/products`, icon: '📦', label: 'Products' },
        { href: `/${businessType}/orders`, icon: '📦', label: 'Orders' }
      ],
      clothing: [
        { href: `/${businessType}/pos`, icon: '👕', label: 'POS System' },
        { href: `/${businessType}/reports`, icon: '📊', label: 'Sales Reports' },
        { href: `/${businessType}/inventory`, icon: '📦', label: 'Inventory' },
        { href: `/${businessType}/products`, icon: '👗', label: 'Products' },
        { href: `/${businessType}/orders`, icon: '📦', label: 'Orders' }
      ],
      hardware: [
        { href: `/${businessType}/pos`, icon: '🔧', label: 'POS System' },
        { href: `/${businessType}/reports`, icon: '📊', label: 'Sales Reports' },
        { href: `/${businessType}/inventory`, icon: '📦', label: 'Inventory' },
        { href: `/${businessType}/products`, icon: '🛠️', label: 'Products' },
        { href: `/${businessType}/orders`, icon: '📦', label: 'Orders' }
      ]
    }

    const allLinks = [
      ...baseLinks,
      ...(businessSpecificLinks[businessType as keyof typeof businessSpecificLinks] || [])
    ]

    // Filter out the current page from the menu
    return allLinks.filter(link => {
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
  const getBusinessNavigationPath = (targetBusinessType: string): string => {
    const currentPath = pathname
    let targetPath = `/${targetBusinessType}` // Default to business homepage

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
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center space-x-4 sm:space-x-8">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs sm:text-sm">BH</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Business Hub</span>
            </Link>

            {showBreadcrumb && <div className="hidden sm:block"><Breadcrumb pathname={pathname} title={title} /></div>}
          </div>

          {/* Right side - Business context, Theme toggle and User menu */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Business context indicator for all users */}
            {session?.user && isAuthenticated && currentBusiness && (
              <div className="relative">
                <Link
                  href={`/${currentBusiness.businessType}`}
                  className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer ml-4"
                  title={`Go to ${currentBusiness.businessName} ${currentBusiness.businessType} business`}
                  onMouseEnter={handleBusinessMenuEnter}
                  onMouseLeave={handleBusinessMenuLeave}
                >
                  <span className="text-blue-600 dark:text-blue-400">🏢</span>
                  <div className="text-sm">
                    <div className="font-medium text-blue-900 dark:text-blue-100 max-w-32 lg:max-w-48 truncate">
                      {currentBusiness.businessName}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 capitalize">
                      {currentBusiness.businessType}
                    </div>
                  </div>
                  {isSystemAdmin(session.user as SessionUser) && (
                    <div className="hidden lg:block text-xs text-blue-500 dark:text-blue-400 bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
                      Admin
                    </div>
                  )}
                </Link>

                {/* Business hover menu */}
                {showBusinessMenu && (
                  <div 
                    className="absolute top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
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
                        {/* Business-specific links */}
                        {getBusinessMenuLinks(currentBusiness.businessType, pathname).map((link, index) => (
                          <Link
                            key={index}
                            href={link.href}
                            className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            onClick={() => setShowBusinessMenu(false)}
                          >
                            <span>{link.icon}</span>
                            <span>{link.label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {session?.user && (
              <>
                <ThemeToggle
                  showMenu={showThemeMenu}
                  setShowMenu={setShowThemeMenu}
                />
                <UserDropdown
                  user={session.user as SessionUser}
                  showMenu={showUserMenu}
                  setShowMenu={setShowUserMenu}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </header>
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
}

function UserDropdown({ user, showMenu, setShowMenu }: UserDropdownProps) {
  const pathname = usePathname()
  const { hasPermission } = useBusinessPermissionsContext()

  const handleSignOut = () => {
    // Clear any stored callback URLs and redirect to home page
    const currentOrigin = window.location.origin
    signOut({ 
      callbackUrl: `${currentOrigin}/`,
      redirect: true 
    }).then(() => {
      // Fallback: if NextAuth doesn't redirect properly, do it manually
      setTimeout(() => {
        if (window.location.pathname !== '/') {
          window.location.href = `${currentOrigin}/`
        }
      }, 100)
    })
    setShowMenu(false)
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
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center space-x-3 text-sm rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
          {getInitials(user.name || user.email || 'User')}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-gray-900 dark:text-white font-medium">{user.name}</p>
          <p className="text-gray-500 dark:text-gray-400 text-xs">{user.email}</p>
        </div>
        <svg 
          className="w-4 h-4 text-gray-400 dark:text-gray-500" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showMenu && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
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
                onClick={() => setShowMenu(false)}
              >
                <div className="flex items-center space-x-2">
                  <span>👤</span>
                  <span>Profile Settings</span>
                </div>
              </Link>
              
              <Link
                href="/dashboard"
                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setShowMenu(false)}
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
                    onClick={() => setShowMenu(false)}
                  >
                    <div className="flex items-center space-x-2">
                      <span>🛠️</span>
                      <span>System Admin</span>
                    </div>
                  </Link>
                  <Link
                    href="/admin/users"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setShowMenu(false)}
                  >
                    <div className="flex items-center space-x-2">
                      <span>👥</span>
                      <span>User Management</span>
                    </div>
                  </Link>
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
                  onClick={() => setShowMenu(false)}
                >
                  <div className="flex items-center space-x-2">
                    <span>🗂️</span>
                    <span>Data Management</span>
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
                  onClick={() => setShowMenu(false)}
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
                  onClick={() => setShowMenu(false)}
                >
                  <div className="flex items-center space-x-2">
                    <span>💳</span>
                    <span>Expense Accounts</span>
                  </div>
                </Link>
              )}

              <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
              
              <Link
                href={getHelpUrl()}
                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setShowMenu(false)}
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
                onClick={() => setShowMenu(false)}
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