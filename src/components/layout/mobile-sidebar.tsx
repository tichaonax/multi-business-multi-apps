'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { hasUserPermission, SessionUser } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

const businessTypeModules = [
  { type: 'restaurant', icon: '🍽️', name: 'Restaurant' },
  { type: 'grocery', icon: '🛒', name: 'Grocery' },
  { type: 'clothing', icon: '👕', name: 'Clothing' },
  { type: 'hardware', icon: '🔧', name: 'Hardware' },
  { type: 'construction', icon: '🏗️', name: 'Construction' },
  { type: 'services', icon: '💼', name: 'Services' },
  { type: 'vehicles', icon: '🚗', name: 'Vehicles' },
  { type: 'retail', icon: '🏪', name: 'Retail' },
  { type: 'consulting', icon: '📊', name: 'Consulting' },
]

const getBusinessTypeIcon = (type: string): string => {
  const module = businessTypeModules.find(m => m.type === type)
  return module?.icon || '🏢'
}

export function MobileSidebar() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set())
  const [esp32IntegrationEnabled, setEsp32IntegrationEnabled] = useState(false)
  const [r710IntegrationEnabled, setR710IntegrationEnabled] = useState(false)

  const {
    businesses,
    currentBusiness,
    currentBusinessId,
    switchBusiness,
    hasPermission: hasBusinessPermission,
    isSystemAdmin: isAdmin,
  } = useBusinessPermissionsContext()

  // Check WiFi integrations for current business
  useEffect(() => {
    const checkWiFiIntegrations = async () => {
      if (!currentBusinessId) {
        setEsp32IntegrationEnabled(false)
        setR710IntegrationEnabled(false)
        return
      }
      try {
        const esp32Response = await fetch(`/api/business/${currentBusinessId}/wifi-tokens`)
        if (esp32Response.ok) {
          const esp32Data = await esp32Response.json()
          setEsp32IntegrationEnabled(esp32Data.success && esp32Data.menuItems && esp32Data.menuItems.length > 0)
        }
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

  if (!session?.user) return null

  const user = session.user as SessionUser

  // Group businesses by type
  const businessesByType: Record<string, typeof businesses> = {}
  businesses.forEach((b: any) => {
    if (!b.isActive) return
    const type = b.businessType
    if (!businessesByType[type]) businessesByType[type] = []
    businessesByType[type].push(b)
  })

  const toggleType = (type: string) => {
    setExpandedTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const handleSelectBusiness = (businessId: string, businessType: string) => {
    switchBusiness(businessId)
    setIsOpen(false)
    window.location.href = `/${businessType}`
  }

  const linkClass = "flex items-center gap-2 px-4 py-2 rounded text-sm text-gray-300 hover:bg-gray-700 transition-colors"

  const navLink = (href: string, icon: string, label: string) => (
    <Link
      key={href}
      href={href}
      className={linkClass}
      onClick={() => setIsOpen(false)}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  )

  // Get business-specific module links for the currently selected business
  const getBusinessModuleLinks = () => {
    if (!currentBusiness) return null
    const bt = currentBusiness.businessType
    const canReport = isAdmin || hasBusinessPermission('canViewWifiReports') || hasBusinessPermission('canAccessFinancialData')
    const canManageMenuPerm = isAdmin || hasBusinessPermission('canManageMenu')
    const canConfigWifi = isAdmin || hasBusinessPermission('canConfigureWifiTokens')
    const canSellWifi = isAdmin || hasBusinessPermission('canSellWifiTokens')
    const canViewOrders = isAdmin || hasBusinessPermission('canEnterManualOrders') || hasBusinessPermission('canAccessFinancialData')

    const wifiLinks = () => (
      <>
        {canConfigWifi && esp32IntegrationEnabled && navLink(`/${bt}/wifi-tokens`, '📡', 'ESP32 Menu Config')}
        {canConfigWifi && r710IntegrationEnabled && navLink(`/${bt}/r710-tokens`, '📶', 'R710 Menu Config')}
        {canSellWifi && esp32IntegrationEnabled && navLink('/wifi-portal/sales', '🎫', 'ESP32 WiFi Sales')}
        {canSellWifi && r710IntegrationEnabled && navLink('/r710-portal/sales', '💵', 'R710 WiFi Sales')}
      </>
    )

    switch (bt) {
      case 'restaurant':
        return (
          <>
            {navLink('/restaurant/pos', '🍽️', 'POS System')}
            {canReport && navLink('/restaurant/reports', '📊', 'Sales Reports')}
            {navLink('/restaurant/inventory', '📦', 'Inventory')}
            {canManageMenuPerm && navLink('/restaurant/menu', '📋', 'Menu Management')}
            {canViewOrders && navLink('/restaurant/orders', '📦', 'Orders')}
            {navLink('/services/list', '🔧', 'Services')}
            {wifiLinks()}
          </>
        )
      case 'grocery':
        return (
          <>
            {navLink('/grocery/pos', '🛒', 'POS System')}
            {canReport && navLink('/grocery/reports', '📊', 'Sales Reports')}
            {navLink('/grocery/inventory', '📦', 'Inventory')}
            {navLink('/grocery/products', '📦', 'Products')}
            {navLink('/clothing/inventory?tab=bales', '📦', 'Bales Inventory')}
            {canViewOrders && navLink('/grocery/orders', '📦', 'Orders')}
            {navLink('/services/list', '🔧', 'Services')}
            {wifiLinks()}
          </>
        )
      case 'clothing':
        return (
          <>
            {navLink('/clothing/pos', '👕', 'POS System')}
            {canReport && navLink('/clothing/reports', '📊', 'Sales Reports')}
            {navLink('/clothing/inventory', '📦', 'Inventory')}
            {navLink('/clothing/products', '👗', 'Products')}
            {navLink('/clothing/inventory?tab=bales', '📦', 'Bales Inventory')}
            {canViewOrders && navLink('/clothing/orders', '📦', 'Orders')}
            {navLink('/services/list', '🔧', 'Services')}
            {wifiLinks()}
          </>
        )
      case 'hardware':
        return (
          <>
            {navLink('/hardware/pos', '🔧', 'POS System')}
            {canReport && navLink('/hardware/reports', '📊', 'Sales Reports')}
            {navLink('/hardware/inventory', '📦', 'Inventory')}
            {navLink('/hardware/products', '🛠️', 'Products')}
            {canViewOrders && navLink('/hardware/orders', '📦', 'Orders')}
            {navLink('/services/list', '🔧', 'Services')}
            {wifiLinks()}
          </>
        )
      case 'services':
        return (
          <>
            {navLink('/universal/pos', '💼', 'POS System')}
            {canReport && navLink('/restaurant/reports', '📊', 'Sales Reports')}
            {navLink('/services/list', '📋', 'Services List')}
            {navLink('/services/categories', '📂', 'Categories')}
            {navLink('/services/suppliers', '🤝', 'Suppliers')}
            {wifiLinks()}
          </>
        )
      case 'construction':
        return (
          <>
            {navLink('/construction', '🏗️', 'Dashboard')}
            {navLink('/construction/suppliers', '🤝', 'Suppliers')}
          </>
        )
      default:
        return (
          <>
            {navLink('/dashboard', '📊', 'Dashboard')}
            {navLink('/business/manage', '⚙️', 'Business Settings')}
          </>
        )
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-20 left-3 z-30 p-2 bg-gray-800 text-white rounded-md shadow-lg hover:bg-gray-700 transition-colors"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsOpen(false)} />

          <div className="relative w-72 bg-gray-800 text-white p-4 overflow-y-auto max-h-full">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-lg font-bold">Business Hub</h1>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-300 p-1"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="space-y-1">
              <Link
                href="/dashboard"
                className="block px-4 py-3 rounded hover:bg-gray-700"
                onClick={() => setIsOpen(false)}
              >
                📊 Dashboard
              </Link>

              {/* Business types with expandable business lists */}
              {Object.keys(businessesByType).length > 0 && (
                <div className="pt-3 pb-1">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-2">Businesses</div>
                </div>
              )}

              {Object.entries(businessesByType).map(([type, typedBusinesses]) => {
                const icon = getBusinessTypeIcon(type)
                const isExpanded = expandedTypes.has(type)

                return (
                  <div key={type}>
                    <button
                      onClick={() => toggleType(type)}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded hover:bg-gray-700 text-left"
                    >
                      <span>
                        {icon} {type.charAt(0).toUpperCase() + type.slice(1)}
                        <span className="ml-2 text-xs text-gray-400">({typedBusinesses.length})</span>
                      </span>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="ml-4 space-y-0.5">
                        {typedBusinesses.map((biz: any) => (
                          <button
                            key={biz.businessId}
                            onClick={() => handleSelectBusiness(biz.businessId, type)}
                            className={`w-full text-left px-4 py-2 rounded text-sm transition-colors ${
                              currentBusinessId === biz.businessId
                                ? 'bg-blue-600/30 text-blue-200 font-medium'
                                : 'text-gray-300 hover:bg-gray-700'
                            }`}
                          >
                            {biz.businessName}
                            {currentBusinessId === biz.businessId && (
                              <span className="ml-2 text-xs text-blue-300">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Current Business Module Links */}
              {currentBusiness && (
                <>
                  <div className="pt-3 pb-1">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-2">
                      {currentBusiness.businessName}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    {getBusinessModuleLinks()}
                  </div>
                </>
              )}

              {/* Business and Personal Finances */}
              <div className="pt-3 pb-1">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-2">Finance & Tools</div>
              </div>

              {(hasUserPermission(user, 'canAccessPersonalFinance') || isAdmin) && (
                <Link
                  href="/personal"
                  className="block px-4 py-2.5 rounded hover:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  💰 Personal Finances
                </Link>
              )}

              {/* Fleet Management */}
              {(hasUserPermission(user, 'canAccessVehicles') || hasUserPermission(user, 'canLogDriverTrips') || hasUserPermission(user, 'canLogDriverMaintenance') || isAdmin) && (
                <button
                  onClick={() => {
                    const isDriver = user &&
                      hasUserPermission(user, 'canLogDriverTrips') &&
                      hasUserPermission(user, 'canLogDriverMaintenance') &&
                      !hasUserPermission(user, 'canAccessPersonalFinance') &&
                      !isAdmin
                    window.location.href = isDriver ? '/driver' : '/vehicles'
                    setIsOpen(false)
                  }}
                  className="block w-full text-left px-4 py-2.5 rounded hover:bg-gray-700"
                >
                  🚗 Fleet Management
                </button>
              )}

              {/* Contractor Management */}
              {(hasUserPermission(user, 'canManagePersonalContractors') || isAdmin) && (
                <Link
                  href="/contractors"
                  className="block px-4 py-2.5 rounded hover:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  👷 Contractors
                </Link>
              )}

              {/* Employees */}
              {(hasBusinessPermission('canManageEmployees') || hasBusinessPermission('canEditEmployees') || hasBusinessPermission('canManageBusinessUsers') || isAdmin) && (
                <Link
                  href="/employees"
                  className="block px-4 py-2.5 rounded hover:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  👤 Employees
                </Link>
              )}

              {/* Reports */}
              {(isAdmin || hasBusinessPermission('canManageBusinessUsers') || hasBusinessPermission('canAccessFinancialData')) && (
                <Link
                  href="/reports"
                  className="block px-4 py-2.5 rounded hover:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  📈 Reports
                </Link>
              )}

              {/* Payroll */}
              {(hasBusinessPermission('canAccessPayroll') || hasBusinessPermission('canManagePayroll') || isAdmin) && (
                <Link
                  href="/payroll"
                  className="block px-4 py-2.5 rounded hover:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  🧾 Payroll
                </Link>
              )}

              {/* Expense Accounts */}
              {(hasUserPermission(user, 'canAccessExpenseAccount') || isAdmin) && (
                <Link
                  href="/expense-accounts"
                  className="block px-4 py-2.5 rounded hover:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  💳 Expense Accounts
                </Link>
              )}

              {/* Categories */}
              {(isAdmin || hasUserPermission(user, 'canCreateBusinessCategories') || hasUserPermission(user, 'canEditBusinessCategories')) && (
                <Link
                  href="/business/categories"
                  className="block px-4 py-2.5 rounded hover:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  📁 Categories
                </Link>
              )}

              {/* Customers */}
              {(isAdmin || hasBusinessPermission('canAccessCustomers') || hasBusinessPermission('canManageCustomers')) && (
                <Link
                  href="/customers"
                  className="block px-4 py-2.5 rounded hover:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  👥 Customers
                </Link>
              )}

              {/* Projects */}
              {(isAdmin || hasUserPermission(user, 'canViewProjects') || hasUserPermission(user, 'canAccessPersonalFinance')) && (
                <Link
                  href="/projects"
                  className="block px-4 py-2.5 rounded hover:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  📋 Projects
                </Link>
              )}

              <Link
                href="/chat"
                className="block px-4 py-2.5 rounded hover:bg-gray-700"
                onClick={() => setIsOpen(false)}
              >
                💬 Team Chat
              </Link>

              {/* Receipt History */}
              <Link
                href={`/universal/receipts${currentBusinessId ? `?businessId=${currentBusinessId}` : ''}`}
                className="block px-4 py-2.5 rounded hover:bg-gray-700"
                onClick={() => setIsOpen(false)}
              >
                🧾 Receipt History
              </Link>

              {/* Suppliers */}
              {(isAdmin || hasBusinessPermission('canViewSuppliers') || hasBusinessPermission('canCreateSuppliers') || hasBusinessPermission('canEditSuppliers')) && (
                <Link
                  href="/business/suppliers"
                  className="block px-4 py-2.5 rounded hover:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  🚚 Suppliers
                </Link>
              )}

              {/* Administration */}
              {(isAdmin || hasBusinessPermission('canManageBusinessUsers') || hasBusinessPermission('canManageBusinessSettings')) && (
                <>
                  <div className="pt-3 pb-1">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-2">Administration</div>
                  </div>

                  {isAdmin && (
                    <Link href="/admin" className="block px-4 py-2.5 rounded hover:bg-gray-700" onClick={() => setIsOpen(false)}>
                      🛠️ System Admin
                    </Link>
                  )}

                  {(isAdmin || hasBusinessPermission('canManageBusinessUsers')) && (
                    <Link href="/business/manage" className="block px-4 py-2.5 rounded hover:bg-gray-700" onClick={() => setIsOpen(false)}>
                      🏢 Business Management
                    </Link>
                  )}

                  {hasBusinessPermission('canManageBusinessUsers') && (
                    <Link href="/admin/users" className="block px-4 py-2.5 rounded hover:bg-gray-700" onClick={() => setIsOpen(false)}>
                      👥 User Management
                    </Link>
                  )}
                </>
              )}

              <div className="pt-4 border-t border-gray-700">
                <button
                  onClick={() => signOut({
                    callbackUrl: `${window.location.origin}/auth/signin`,
                    redirect: true
                  })}
                  className="block w-full text-left px-4 py-3 rounded hover:bg-gray-700"
                >
                  🚪 Sign Out
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
