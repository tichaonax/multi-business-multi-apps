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

  // Collapsible section states
  const [employeeSectionOpen, setEmployeeSectionOpen] = useState(false)
  const [toolsSectionOpen, setToolsSectionOpen] = useState(false)
  const [adminSectionOpen, setAdminSectionOpen] = useState(false)

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

  const close = () => setIsOpen(false)

  const linkClass = "flex items-center gap-2 px-4 py-2 rounded text-sm text-gray-300 hover:bg-gray-700 transition-colors"
  const sectionLinkClass = "block px-4 py-2.5 rounded hover:bg-gray-700"

  const navLink = (href: string, icon: string, label: string) => (
    <Link key={href} href={href} className={linkClass} onClick={close}>
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
    const canCashAlloc = isAdmin || hasBusinessPermission('canRunCashAllocationReport')

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
            {canCashAlloc && navLink('/restaurant/reports/cash-allocation', '💰', 'Cash Allocation')}
            {navLink('/restaurant/inventory', '📦', 'Inventory')}
            {(isAdmin || hasBusinessPermission('canManageInventory')) && navLink('/restaurant/inventory/initialize', '🍳', 'Prep Initialization')}
            {(isAdmin || hasBusinessPermission('canManageInventory')) && navLink('/restaurant/inventory/config', '⚙️', 'Prep Track Config')}
            {canManageMenuPerm && navLink('/restaurant/menu', '📋', 'Menu Management')}
            {(isAdmin || hasBusinessPermission('canManageEmployees') || hasBusinessPermission('canManageMenu') || hasBusinessPermission('canManageInventory')) && (
              <>
                {navLink('/restaurant/meal-program/participants', '🍱', 'Meal Participants')}
                {navLink('/restaurant/meal-program/eligible-items', '✅', 'Eligible Items')}
              </>
            )}
            {(isAdmin || hasBusinessPermission('canViewBusiness')) && navLink('/restaurant/settings/pos', '⚙️', 'POS Settings')}
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
            {canCashAlloc && navLink('/grocery/reports/cash-allocation', '💰', 'Cash Allocation')}
            {navLink('/grocery/inventory', '📦', 'Inventory')}
            {navLink('/grocery/products', '📦', 'Products')}
            {navLink('/grocery/inventory?tab=bales', '📦', 'Bales Inventory')}
            {(isAdmin || hasBusinessPermission('canViewBusiness')) && navLink('/grocery/settings/pos', '⚙️', 'POS Settings')}
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
            {canCashAlloc && navLink('/clothing/reports/cash-allocation', '💰', 'Cash Allocation')}
            {navLink('/clothing/inventory', '📦', 'Inventory')}
            {navLink('/clothing/products', '👗', 'Products')}
            {navLink('/clothing/inventory?tab=bales', '📦', 'Bales Inventory')}
            {(isAdmin || hasBusinessPermission('canViewBusiness')) && navLink('/clothing/settings/pos', '⚙️', 'POS Settings')}
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
            {canCashAlloc && navLink('/hardware/reports/cash-allocation', '💰', 'Cash Allocation')}
            {navLink('/hardware/inventory', '📦', 'Inventory')}
            {navLink('/hardware/products', '🛠️', 'Products')}
            {(isAdmin || hasBusinessPermission('canViewBusiness')) && navLink('/hardware/settings/pos', '⚙️', 'POS Settings')}
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

  const SectionHeader = ({ label, isOpen: open, onToggle }: { label: string; isOpen: boolean; onToggle: () => void }) => (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 pt-3 pb-1 text-left"
    >
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )

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
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={close} />

          <div className="relative w-72 bg-gray-800 text-white p-4 overflow-y-auto max-h-full">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-lg font-bold">Business Hub</h1>
              <button onClick={close} className="text-white hover:text-gray-300 p-1" aria-label="Close menu">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="space-y-1">
              <Link href="/dashboard" className="block px-4 py-3 rounded hover:bg-gray-700" onClick={close}>
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
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            {currentBusinessId === biz.businessId && <span className="ml-2 text-xs text-blue-300">✓</span>}
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

              {/* ── Finance & Operations ── */}
              <div className="pt-3 pb-1">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-2">Finance & Operations</div>
              </div>

              {(hasUserPermission(user, 'canAccessPersonalFinance') || isAdmin) && (
                <Link href="/personal" className={sectionLinkClass} onClick={close}>💰 Personal Finances</Link>
              )}

              {(hasBusinessPermission('canAccessPayroll') || hasBusinessPermission('canManagePayroll') || isAdmin) && (
                <Link href="/payroll" className={sectionLinkClass} onClick={close}>🧾 Payroll</Link>
              )}

              {(isAdmin || hasBusinessPermission('canAccessPayrollAccount')) && (
                <Link href="/payroll/account" className={sectionLinkClass} onClick={close}>💰 Payroll Account</Link>
              )}

              {(isAdmin || hasBusinessPermission('canAccessPayroll')) && (
                <Link href="/payroll/tax-tables" className={sectionLinkClass} onClick={close}>📊 Tax Tables</Link>
              )}

              {(hasUserPermission(user, 'canAccessExpenseAccount') || isAdmin) && (
                <Link href="/expense-accounts" className={sectionLinkClass} onClick={close}>💳 Expense Accounts</Link>
              )}

              {hasBusinessPermission('canCreateExpenseAccount') && (
                <Link href="/expense-accounts/new" className={`${sectionLinkClass} pl-8 text-sm`} onClick={close}>➕ Create Account</Link>
              )}

              {hasBusinessPermission('canViewExpenseReports') && (
                <Link href="/expense-accounts/lenders" className={`${sectionLinkClass} pl-8 text-sm`} onClick={close}>🏦 Lenders</Link>
              )}

              {(isAdmin || hasBusinessPermission('canAccessExpenseAccount')) && (
                <Link href="/expense-accounts/auto-deposits" className={`${sectionLinkClass} pl-8 text-sm`} onClick={close}>💳 EOD Auto-Deposits</Link>
              )}

              {(isAdmin || hasBusinessPermission('canSubmitPaymentBatch')) && (
                <Link href="/expense-accounts/payment-batches" className={sectionLinkClass} onClick={close}>📋 Payment Batches</Link>
              )}

              {(isAdmin || hasBusinessPermission('canSubmitPaymentBatch')) && (
                <Link href="/cash-bucket" className={sectionLinkClass} onClick={close}>🪣 Cash Bucket</Link>
              )}

              {(isAdmin || hasBusinessPermission('canViewCashBucketReport')) && (
                <Link href="/cash-bucket/report" className={sectionLinkClass} onClick={close}>📊 Cash Bucket Report</Link>
              )}

              {hasBusinessPermission('canViewExpenseReports') && (
                <Link href="/expense-accounts/reports" className={sectionLinkClass} onClick={close}>📊 Expense Reports</Link>
              )}

              {hasBusinessPermission('canViewExpenseReports') && (
                <Link href="/expense-accounts/reports/accounts-overview" className={`${sectionLinkClass} pl-8 text-sm`} onClick={close}>🏦 Accounts Overview</Link>
              )}

              {hasBusinessPermission('canViewExpenseReports') && (
                <Link href="/expense-accounts/reports/loans" className={`${sectionLinkClass} pl-8 text-sm`} onClick={close}>💼 Loan Portfolio</Link>
              )}

              {hasBusinessPermission('canViewExpenseReports') && (
                <Link href="/expense-accounts/reports/categories" className={`${sectionLinkClass} pl-8 text-sm`} onClick={close}>🏷️ Category Analysis</Link>
              )}

              {hasBusinessPermission('canViewExpenseReports') && (
                <Link href="/expense-accounts/reports/payees" className={`${sectionLinkClass} pl-8 text-sm`} onClick={close}>👥 Payee Analysis</Link>
              )}

              {hasBusinessPermission('canViewExpenseReports') && (
                <Link href="/expense-accounts/reports/trends" className={`${sectionLinkClass} pl-8 text-sm`} onClick={close}>📈 Monthly Trends</Link>
              )}

              {hasBusinessPermission('canViewExpenseReports') && (
                <Link href="/expense-accounts/reports/transfers" className={`${sectionLinkClass} pl-8 text-sm`} onClick={close}>🔄 Transfer Report</Link>
              )}

              {(isAdmin || hasBusinessPermission('canAccessFinancialData')) && (
                <Link href="/business-accounts" className={sectionLinkClass} onClick={close}>🏦 Business Accounts</Link>
              )}

              {(hasBusinessPermission('canViewSupplierPaymentQueue') || hasBusinessPermission('canSubmitSupplierPaymentRequests')) && (
                <Link
                  href={hasBusinessPermission('canViewSupplierPaymentQueue') ? '/supplier-payments' : '/supplier-payments/my-requests'}
                  className={sectionLinkClass}
                  onClick={close}
                >
                  🧾 Supplier Payments
                </Link>
              )}

              {hasBusinessPermission('canSubmitSupplierPaymentRequests') && (
                <Link href="/supplier-payments/request" className={sectionLinkClass} onClick={close}>➕ Submit Supplier Request</Link>
              )}

              {hasBusinessPermission('canViewPayees') && (
                <Link href="/payees" className={sectionLinkClass} onClick={close}>👥 Payee Management</Link>
              )}

              {(hasUserPermission(user, 'canAccessPersonalFinance') || hasBusinessPermission('canManageBusinessLoans')) && (
                <Link href="/loans" className={sectionLinkClass} onClick={close}>🏦 Loan Repayments</Link>
              )}

              {(isAdmin || hasBusinessPermission('canManageBusinessUsers') || hasBusinessPermission('canAccessFinancialData')) && (
                <Link href="/reports" className={sectionLinkClass} onClick={close}>📈 Reports</Link>
              )}

              {(hasBusinessPermission('canManageEmployees') || hasBusinessPermission('canEditEmployees')) && (
                <Link href="/admin/reports" className={sectionLinkClass} onClick={close}>📊 HR Reports</Link>
              )}

              {(isAdmin || hasBusinessPermission('canManageAllBusinesses') || hasBusinessPermission('canViewExpenseReports')) && (
                <Link href="/admin/reports/cash-allocation-summary" className={sectionLinkClass} onClick={close}>💰 Cash Allocation Summary</Link>
              )}

              {(isAdmin || hasBusinessPermission('canSetupPortalIntegration')) && (
                <Link href="/wifi-portal" className={sectionLinkClass} onClick={close}>📡 ESP32 WiFi Portal</Link>
              )}

              {(isAdmin || hasBusinessPermission('canSetupPortalIntegration')) && (
                <Link href="/r710-portal" className={sectionLinkClass} onClick={close}>📶 R710 WiFi Portal</Link>
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
                    close()
                  }}
                  className="block w-full text-left px-4 py-2.5 rounded hover:bg-gray-700"
                >
                  🚗 Fleet Management
                </button>
              )}

              {/* ── Employee Management (collapsible) ── */}
              {(hasBusinessPermission('canManageEmployees') || hasBusinessPermission('canEditEmployees') || hasBusinessPermission('canManageBusinessUsers') || hasBusinessPermission('canManageJobTitles') || hasBusinessPermission('canManageBenefitTypes') || hasBusinessPermission('canManageCompensationTypes') || hasBusinessPermission('canManageDisciplinaryActions') || isAdmin) && (
                <>
                  <SectionHeader label="Employee Management" isOpen={employeeSectionOpen} onToggle={() => setEmployeeSectionOpen(p => !p)} />
                  {employeeSectionOpen && (
                    <div className="space-y-0.5">
                      {(hasBusinessPermission('canManageEmployees') || hasBusinessPermission('canEditEmployees') || hasBusinessPermission('canManageBusinessUsers') || isAdmin) && (
                        <Link href="/employees" className={sectionLinkClass} onClick={close}>👤 Employees</Link>
                      )}
                      {hasBusinessPermission('canManageJobTitles') && (
                        <Link href="/admin/job-titles" className={sectionLinkClass} onClick={close}>💼 Job Titles</Link>
                      )}
                      {hasBusinessPermission('canEditEmployees') && (
                        <Link href="/admin/hierarchy" className={sectionLinkClass} onClick={close}>🌳 Hierarchy</Link>
                      )}
                      {(hasBusinessPermission('canManageBenefitTypes') || hasBusinessPermission('canManageCompensationTypes')) && (
                        <Link href="/admin/benefits" className={sectionLinkClass} onClick={close}>💰 Benefits & Compensation</Link>
                      )}
                      {hasBusinessPermission('canManageDisciplinaryActions') && (
                        <Link href="/admin/disciplinary" className={sectionLinkClass} onClick={close}>⚠️ Disciplinary Actions</Link>
                      )}
                      {(hasBusinessPermission('canManageEmployees') || hasBusinessPermission('canEditEmployees')) && (
                        <Link href="/employees/clock-in" className={sectionLinkClass} onClick={close}>🕐 Clock-In Management</Link>
                      )}
                      {(hasBusinessPermission('canManageEmployees') || hasBusinessPermission('canEditEmployees')) && (
                        <Link href="/employees/absences" className={sectionLinkClass} onClick={close}>📋 Absences</Link>
                      )}
                      {(isAdmin || hasBusinessPermission('canAccessPerDiem') || hasBusinessPermission('canAccessPayroll')) && (
                        <Link href="/employees/per-diem" className={sectionLinkClass} onClick={close}>🗂️ Per Diem</Link>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ── Tools (collapsible) ── */}
              <SectionHeader label="Tools" isOpen={toolsSectionOpen} onToggle={() => setToolsSectionOpen(p => !p)} />
              {toolsSectionOpen && (
                <div className="space-y-0.5">
                  <Link
                    href={`/universal/receipts${currentBusinessId ? `?businessId=${currentBusinessId}` : ''}`}
                    className={sectionLinkClass}
                    onClick={close}
                  >
                    🧾 Receipt History
                  </Link>

                  {(isAdmin || hasUserPermission(user, 'canCreateBusinessCategories') || hasUserPermission(user, 'canEditBusinessCategories')) && (
                    <Link href="/business/categories" className={sectionLinkClass} onClick={close}>📁 Business Categories</Link>
                  )}

                  {(hasBusinessPermission('canCreateInventoryCategories') || hasBusinessPermission('canEditInventoryCategories') || hasBusinessPermission('canDeleteInventoryCategories')) && (
                    <Link href="/business/inventory-categories" className={sectionLinkClass} onClick={close}>📦 Inventory Categories</Link>
                  )}

                  {(isAdmin || hasBusinessPermission('canViewBarcodeTemplates') || hasBusinessPermission('canManageBarcodeTemplates') || hasUserPermission(user, 'canViewBarcodeTemplates') || hasUserPermission(user, 'canManageBarcodeTemplates')) && (
                    <Link
                      href={`/universal/barcode-management${currentBusinessId ? `?businessId=${currentBusinessId}` : ''}`}
                      className={sectionLinkClass}
                      onClick={close}
                    >
                      🏷️ Barcode Management
                    </Link>
                  )}

                  {(isAdmin || hasBusinessPermission('canViewSuppliers') || hasBusinessPermission('canCreateSuppliers') || hasBusinessPermission('canEditSuppliers')) && (
                    <Link href="/business/suppliers" className={sectionLinkClass} onClick={close}>🚚 Suppliers</Link>
                  )}

                  {(isAdmin || hasBusinessPermission('canViewPayees') || hasBusinessPermission('canCreatePayees') || hasBusinessPermission('canEditPayees')) && (
                    <Link href="/payees" className={sectionLinkClass} onClick={close}>🧑 Individuals</Link>
                  )}

                  {(isAdmin || hasUserPermission(user, 'canManagePersonalContractors')) && (
                    <Link href="/contractors" className={sectionLinkClass} onClick={close}>👷 Contractors</Link>
                  )}

                  {(hasBusinessPermission('canViewLocations') || hasBusinessPermission('canCreateLocations') || hasBusinessPermission('canEditLocations')) && (
                    <Link href="/business/locations" className={sectionLinkClass} onClick={close}>📍 Locations</Link>
                  )}

                  {(isAdmin || hasBusinessPermission('canAccessCustomers') || hasBusinessPermission('canManageCustomers')) && (
                    <Link href="/customers" className={sectionLinkClass} onClick={close}>👥 Customers</Link>
                  )}

                  {(isAdmin || hasBusinessPermission('canAccessCustomers') || hasBusinessPermission('canManageCustomers')) && (
                    <Link href="/customers/reports" className={sectionLinkClass} onClick={close}>📊 Customer Reports</Link>
                  )}

                  {hasBusinessPermission('canManageLaybys') && (
                    <Link href="/business/laybys" className={sectionLinkClass} onClick={close}>🛍️ Layby Management</Link>
                  )}

                  {(isAdmin || hasBusinessPermission('canViewStockAlerts') || hasBusinessPermission('canManageExpiryActions')) && (
                    <Link href="/expiry" className={sectionLinkClass} onClick={close}>🗓️ Expiry Management</Link>
                  )}

                  {(isAdmin || hasBusinessPermission('canManageAssets')) && (
                    <Link href="/assets" className={sectionLinkClass} onClick={close}>🏷️ Assets</Link>
                  )}

                  {currentBusiness?.requireSalespersonEod && (
                    currentBusiness?.role === 'salesperson' ||
                    (currentBusiness?.role === 'grocery-associate' && currentBusiness?.businessType === 'grocery')
                  ) && (
                    <>
                      <Link href="/eod/submit" className={sectionLinkClass} onClick={close}>📤 Submit EOD Report</Link>
                      <Link href="/eod/history" className={sectionLinkClass} onClick={close}>📋 My EOD History</Link>
                    </>
                  )}

                  {(isAdmin || hasBusinessPermission('canCloseBooks')) && currentBusiness?.requireSalespersonEod && (
                    <Link href="/eod/manager" className={sectionLinkClass} onClick={close}>📋 Staff EOD Status</Link>
                  )}

                  {(isAdmin || hasBusinessPermission('canCloseBooks') || hasBusinessPermission('canAccessFinancialData')) && currentBusiness?.requireSalespersonEod && (
                    <Link href="/reports/eod-discrepancy" className={sectionLinkClass} onClick={close}>📊 EOD Discrepancy</Link>
                  )}

                  {(isAdmin || hasUserPermission(user, 'canViewProjects') || hasUserPermission(user, 'canAccessPersonalFinance')) && (
                    <Link href="/projects" className={sectionLinkClass} onClick={close}>📋 Projects</Link>
                  )}


                  <button
                    type="button"
                    className="block w-full text-left px-4 py-2.5 rounded hover:bg-gray-700"
                    onClick={() => { close(); window.dispatchEvent(new CustomEvent('chat:open')) }}
                  >
                    💬 Team Chat
                  </button>
                </div>
              )}

              {/* ── Administration (collapsible) ── */}
              {(isAdmin || hasBusinessPermission('canManageBusinessUsers') || hasBusinessPermission('canManageBusinessSettings')) && (
                <>
                  <SectionHeader label="Administration" isOpen={adminSectionOpen} onToggle={() => setAdminSectionOpen(p => !p)} />
                  {adminSectionOpen && (
                    <div className="space-y-0.5">
                      {isAdmin && (
                        <Link href="/admin" className={sectionLinkClass} onClick={close}>🛠️ System Admin</Link>
                      )}
                      {isAdmin && (
                        <Link href="/admin/petty-cash-permissions" className={sectionLinkClass} onClick={close}>💵 Petty Cash Permissions</Link>
                      )}
                      {(isAdmin || hasBusinessPermission('canReversePaymentsToPettyCash')) && (
                        <Link href="/admin/reverse-payments" className={sectionLinkClass} onClick={close}>↩️ Reverse Payments</Link>
                      )}
                      {(isAdmin || hasBusinessPermission('canManageWifiPortal')) && (
                        <Link href="/admin/connected-clients" className={sectionLinkClass} onClick={close}>📡 Connected Clients</Link>
                      )}
                      {isAdmin && (
                        <Link href="/admin/personal-finance" className={sectionLinkClass} onClick={close}>💰 Global Finance</Link>
                      )}
                      {isAdmin && (
                        <Link href="/admin/contractors" className={sectionLinkClass} onClick={close}>👷 Global Contractors</Link>
                      )}
                      {(isAdmin || hasBusinessPermission('canManageBusinessUsers')) && (
                        <Link href="/admin/users" className={sectionLinkClass} onClick={close}>👥 User Management</Link>
                      )}
                      {hasBusinessPermission('canManageBusinessSettings') && (
                        <Link href="/admin/settings" className={sectionLinkClass} onClick={close}>⚙️ System Settings</Link>
                      )}
                      {(isAdmin || hasBusinessPermission('canManageBusinessUsers')) && (
                        <Link href="/business/manage" className={sectionLinkClass} onClick={close}>🏢 Business Management</Link>
                      )}
                      {hasBusinessPermission('canAccessFinancialData') && (
                        <Link href="/business/manage/loans" className={sectionLinkClass} onClick={close}>💰 Business Loans</Link>
                      )}
                      {hasBusinessPermission('canManageBusinessLoans') && (
                        <Link href="/admin/loans" className={sectionLinkClass} onClick={close}>🏦 Loan Repayments</Link>
                      )}
                      {hasBusinessPermission('canManageBusinessSettings') && (
                        <Link href="/admin/umbrella-business" className={sectionLinkClass} onClick={close}>🏢 Umbrella Business</Link>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="pt-4 border-t border-gray-700">
                <button
                  onClick={() => signOut({ callbackUrl: window.location.origin, redirect: true })}
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
