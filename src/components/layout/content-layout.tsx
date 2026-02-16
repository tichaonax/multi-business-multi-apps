'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ContentLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  breadcrumb?: Array<{
    label: string
    href?: string
    isActive?: boolean
  }>
  headerActions?: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | '7xl' | 'full'
  showBackButton?: boolean
}

export function ContentLayout({
  children,
  title,
  subtitle,
  breadcrumb,
  headerActions,
  maxWidth = '7xl',
  showBackButton = true
}: ContentLayoutProps) {
  const router = useRouter()
  const [shouldShowBackButton, setShouldShowBackButton] = useState(showBackButton)

  const maxWidthClasses = {
    'sm': 'max-w-sm',
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    'full': 'max-w-full'
  }

  // Check if back button should be shown (don't show if it would go to login or on dashboard)
  useEffect(() => {
    if (!showBackButton) {
      setShouldShowBackButton(false)
      return
    }

    // Check browser history and current page
    const handleHistoryCheck = () => {
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname
        const referrer = document.referrer
        const isFromLogin = referrer.includes('/auth/signin') || referrer.includes('/login')
        const historyLength = window.history.length
        const isDashboard = currentPath === '/dashboard'

        // Don't show back button if:
        // 1. On dashboard page (homepage)
        // 2. History is minimal (user just logged in)
        // 3. Referrer is login page
        // 4. This is the first page after login
        setShouldShowBackButton(!isDashboard && !isFromLogin && historyLength > 1)
      }
    }

    handleHistoryCheck()
  }, [showBackButton])

  return (
    <div className={`${maxWidthClasses[maxWidth]} mx-auto py-2 min-w-0 w-full`}>
      {/* Breadcrumb Navigation */}
      {breadcrumb && breadcrumb.length > 0 && (
        <div className="mb-4 overflow-x-auto">
          <nav className="flex whitespace-nowrap min-w-0" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm">
              {breadcrumb.map((item, index) => (
                <li key={index} className="flex items-center">
                  {index > 0 && (
                    <span className="text-gray-300 dark:text-gray-600 mx-2">/</span>
                  )}
                  {item.href && !item.isActive ? (
                    <a
                      href={item.href}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 truncate"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <span className={`${item.isActive ? 'text-primary font-medium' : 'text-secondary'} truncate`}>
                      {item.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>
      )}

      {/* Page Header */}
      {(title || headerActions) && (
        <div className="mb-6">
          <div className="space-y-4">
            {/* Title Section */}
            <div className="min-w-0">
              {title && (
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary break-words">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-1 sm:mt-2 text-sm sm:text-base text-secondary break-words">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Actions Section - Responsive layout */}
            {(headerActions || shouldShowBackButton) && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                {/* Actions take priority on mobile */}
                {headerActions && (
                  <div className="flex flex-wrap gap-2 sm:gap-3 min-w-0">
                    {headerActions}
                  </div>
                )}
                {/* Back button only shown when safe */}
                {shouldShowBackButton && (
                  <button
                    onClick={() => router.back()}
                    className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-secondary bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex-shrink-0"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Page Content */}
      <div className="space-y-6 min-w-0">
        {children}
      </div>
    </div>
  )
}