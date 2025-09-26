'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { canAccessModule, hasPermission, hasUserPermission, isSystemAdmin, SessionUser } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useNavigation } from '@/contexts/navigation-context'

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
]

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
          const businessList = data.success ? data.businesses : data
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

  // Helper function to group businesses by type
  const groupBusinessesByType = (businessList: Business[]) => {
    const grouped = businessTypeModules.map(module => ({
      type: module.type,
      icon: module.icon,
      businesses: businessList.filter((b: Business) => b.type === module.type)
    }))
    // Remove the filter - show all business types even with 0 count

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

        // Navigate to the business module page
        const businessModulePath = `/${business.type}`
        // console.log(`🔗 Navigating to: ${businessModulePath}`)
        router.push(businessModulePath)
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
        
        {/* Universal Hierarchical Business Navigation */}
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
                <span className="capitalize">{group.type}</span>
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
                      <span className="truncate">{business.name}</span>
                      {currentBusiness?.businessId === business.id && (
                        <span className="text-xs">✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {loadingBusinesses && (
          <div className="text-gray-400 text-sm px-3 py-2">
            Loading businesses...
          </div>
        )}

        {/* Personal Finance - User-level permissions (business-agnostic) */}
  {(hasUserPermission(currentUser, 'canAccessPersonalFinance') || isSystemAdmin(currentUser)) && (
          <div className="pt-2">
            <button
              onClick={() => navigateTo('/personal')}
              className={getLinkClasses('/personal')}
            >
              <span className="text-lg">💰</span>
              <span>Personal Finance</span>
            </button>
          </div>
        )}

        {/* Fleet Management - User-level permissions (business-agnostic) */}
  {(hasUserPermission(currentUser, 'canAccessVehicles') || isSystemAdmin(currentUser)) && (
          <div className="pt-1">
            <button
              onClick={() => navigateTo('/vehicles')}
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
        
        <div className="pt-4 pb-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tools</h3>
        </div>

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

        <Link
          href="/reports"
          className="sidebar-link flex items-center space-x-3"
        >
          <span className="text-lg">📈</span>
          <span>Reports</span>
        </Link>
        
        {/* Employee Management Section */}
  {(hasPermission(currentUser, 'canViewEmployees') || hasPermission(currentUser, 'canManageEmployees') || isSystemAdmin(currentUser)) && (
          <>
            <div className="pt-4 pb-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Employee Management</h3>
            </div>
            
            <Link 
              href="/employees" 
              className="sidebar-link flex items-center space-x-3"
            >
              <span className="text-lg">👤</span>
              <span>Employees</span>
            </Link>
            
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
            
            <Link 
              href="/admin/reports" 
              className="sidebar-link flex items-center space-x-3"
            >
              <span className="text-lg">📊</span>
              <span>HR Reports</span>
            </Link>
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
    </div>
  )
}