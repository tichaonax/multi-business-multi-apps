'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useState } from 'react'
import { canAccessModule, hasPermission, hasUserPermission, isSystemAdmin, SessionUser } from '@/lib/permission-utils'

const modules: { name: string; path: string; module: 'construction' | 'restaurant' | 'grocery' | 'clothing' | 'hardware' | 'vehicles'; icon: string }[] = [
  { name: 'Construction', path: '/construction', module: 'construction', icon: '🏗️' },
  { name: 'Restaurant', path: '/restaurant', module: 'restaurant', icon: '🍽️' },
  { name: 'Grocery', path: '/grocery', module: 'grocery', icon: '🛒' },
  { name: 'Clothing', path: '/clothing', module: 'clothing', icon: '👕' },
  { name: 'Hardware', path: '/hardware', module: 'hardware', icon: '🔧' },
  { name: 'Vehicles', path: '/vehicles', module: 'vehicles', icon: '🚗' },
]

export function MobileSidebar() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)

  if (!session?.user) return null

  const user = session.user as SessionUser

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-20 left-3 z-50 p-2 bg-gray-800 text-white rounded-md shadow-lg hover:bg-gray-700 transition-colors"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsOpen(false)} />

          <div className="relative w-64 sm:w-72 bg-gray-800 text-white p-4 overflow-y-auto max-h-full">
            <div className="flex justify-between items-center mb-6 sm:mb-8">
              <h1 className="text-lg sm:text-xl font-bold">Business Hub</h1>
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
            
            <nav className="space-y-2">
              <Link
                href="/dashboard"
                className="block px-4 py-3 rounded hover:bg-gray-700"
                onClick={() => setIsOpen(false)}
              >
                📊 Dashboard
              </Link>

              {/* Business modules - Only for managers and admins, NOT promoted drivers */}
              {(isSystemAdmin(user) || hasPermission(user, 'canManageBusinessUsers') || hasPermission(user, 'canManageEmployees') || hasPermission(user, 'canEditEmployees') || hasPermission(user, 'canAccessFinancialData')) && modules.map((module) => {
                if (!canAccessModule(user, module.module)) return null

                return (
                  <Link
                    key={module.path}
                    href={module.path}
                    className="block px-4 py-3 rounded hover:bg-gray-700"
                    onClick={() => setIsOpen(false)}
                  >
                    {module.icon} {module.name}
                  </Link>
                )
              })}

              {/* Business and Personal Finances - User-level permissions (business-agnostic) */}
              {(hasUserPermission(user, 'canAccessPersonalFinance') || isSystemAdmin(user)) && (
                <Link
                  href="/personal"
                  className="block px-4 py-3 rounded hover:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  💰 Business and Personal Finances
                </Link>
              )}

              {/* Fleet Management - User-level permissions (business-agnostic) */}
              {(hasUserPermission(user, 'canAccessVehicles') || hasUserPermission(user, 'canLogDriverTrips') || hasUserPermission(user, 'canLogDriverMaintenance') || isSystemAdmin(user)) && (
                <button
                  onClick={() => {
                    const isDriver = user &&
                      hasUserPermission(user, 'canLogDriverTrips') &&
                      hasUserPermission(user, 'canLogDriverMaintenance') &&
                      !hasUserPermission(user, 'canAccessPersonalFinance') &&
                      !isSystemAdmin(user)
                    window.location.href = isDriver ? '/driver' : '/vehicles'
                    setIsOpen(false)
                  }}
                  className="block w-full text-left px-4 py-3 rounded hover:bg-gray-700"
                >
                  🚗 Fleet Management
                </button>
              )}

              {/* Contractor Management - User-level permissions (business-agnostic) */}
              {(hasUserPermission(user, 'canManagePersonalContractors') || isSystemAdmin(user)) && (
                <Link
                  href="/contractors"
                  className="block px-4 py-3 rounded hover:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  👷 Contractor Management
                </Link>
              )}

              {/* Individual Items - Only for actual managers and system admins, NOT promoted drivers */}

              {/* Employees - Only for users with management permissions, not just viewing */}
              {(hasPermission(user, 'canManageEmployees') || hasPermission(user, 'canEditEmployees') || hasPermission(user, 'canManageBusinessUsers') || isSystemAdmin(user)) && (
                <Link
                  href="/employees"
                  className="block px-4 py-3 rounded hover:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  👤 Employees
                </Link>
              )}

              {/* Reports - Only for managers and admins, not drivers */}
              {(isSystemAdmin(user) || hasPermission(user, 'canManageBusinessUsers') || hasPermission(user, 'canAccessFinancialData')) && (
                <Link
                  href="/reports"
                  className="block px-4 py-3 rounded hover:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  📈 Reports
                </Link>
              )}

              {/* Payroll Management - show to users who can access payroll */}
              {(hasPermission(user, 'canAccessPayroll') || hasPermission(user, 'canManagePayroll') || isSystemAdmin(user)) && (
                <Link
                  href="/payroll"
                  className="block px-4 py-3 rounded hover:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  🧾 Payroll Management
                </Link>
              )}

              {/* HR Reports - Only for users with actual employee management permissions */}
              {(isSystemAdmin(user) || hasPermission(user, 'canManageEmployees') || hasPermission(user, 'canEditEmployees')) && (
                <Link
                  href="/admin/reports"
                  className="block px-4 py-3 rounded hover:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  📊 HR Reports
                </Link>
              )}

              <div className="pt-2 pb-1">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4">Tools</div>
              </div>
{/* Business Categories - Cross-business functionality */}              {(isSystemAdmin(user) ||                hasUserPermission(user, 'canCreateBusinessCategories') ||                hasUserPermission(user, 'canEditBusinessCategories') ||                hasUserPermission(user, 'canDeleteBusinessCategories')) && (                <Link                  href="/business/categories"                  className="block px-4 py-3 rounded hover:bg-gray-700"                  onClick={() => setIsOpen(false)}                >                  📁 Business Categories                </Link>              )}              {/* Customer Management - Cross-business functionality */}              {(isSystemAdmin(user) || hasPermission(user, 'canAccessCustomers') || hasPermission(user, 'canManageCustomers')) && (                <Link                  href="/customers"                  className="block px-4 py-3 rounded hover:bg-gray-700"                  onClick={() => setIsOpen(false)}                >                  👥 Customer Management                </Link>              )}

              {/* Project Management - Cross-business functionality */}
              {(isSystemAdmin(user) || hasUserPermission(user, 'canViewProjects') || hasUserPermission(user, 'canAccessPersonalFinance')) && (
                <Link
                  href="/projects"
                  className="block px-4 py-3 rounded hover:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  📋 Project Management
                </Link>
              )}

              <Link
                href="/chat"
                className="block px-4 py-3 rounded hover:bg-gray-700"
                onClick={() => setIsOpen(false)}
              >
                💬 Team Chat
              </Link>

              {/* Employee Management Section - Only for actual managers */}
              {(hasPermission(user, 'canManageEmployees') ||
                hasPermission(user, 'canManageJobTitles') ||
                hasPermission(user, 'canEditEmployees') ||
                hasPermission(user, 'canManageBenefitTypes') ||
                hasPermission(user, 'canManageCompensationTypes') ||
                hasPermission(user, 'canManageDisciplinaryActions') ||
                isSystemAdmin(user)) && (
                <>
                  <div className="pt-4 pb-1">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4">Employee Management</div>
                  </div>

                  {hasPermission(user, 'canManageJobTitles') && (
                    <Link
                      href="/admin/job-titles"
                      className="block px-4 py-3 rounded hover:bg-gray-700"
                      onClick={() => setIsOpen(false)}
                    >
                      💼 Job Titles
                    </Link>
                  )}

                  {hasPermission(user, 'canEditEmployees') && (
                    <Link
                      href="/admin/hierarchy"
                      className="block px-4 py-3 rounded hover:bg-gray-700"
                      onClick={() => setIsOpen(false)}
                    >
                      🌳 Hierarchy
                    </Link>
                  )}

                  {(hasPermission(user, 'canManageBenefitTypes') || hasPermission(user, 'canManageCompensationTypes')) && (
                    <Link
                      href="/admin/benefits"
                      className="block px-4 py-3 rounded hover:bg-gray-700"
                      onClick={() => setIsOpen(false)}
                    >
                      💰 Benefits & Compensation
                    </Link>
                  )}

                  {hasPermission(user, 'canManageDisciplinaryActions') && (
                    <Link
                      href="/admin/disciplinary"
                      className="block px-4 py-3 rounded hover:bg-gray-700"
                      onClick={() => setIsOpen(false)}
                    >
                      ⚠️ Disciplinary Actions
                    </Link>
                  )}
                </>
              )}

              {(isSystemAdmin(user) || hasPermission(user, 'canManageBusinessUsers') || hasPermission(user, 'canManageBusinessSettings')) && (
                <>
                  <div className="pt-4 pb-1">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4">Administration</div>
                  </div>

                  {isSystemAdmin(user) && (
                    <Link
                      href="/admin"
                      className="block px-4 py-3 rounded hover:bg-gray-700"
                      onClick={() => setIsOpen(false)}
                    >
                      🛠️ System Administration
                    </Link>
                  )}

                  {isSystemAdmin(user) && (
                    <Link
                      href="/admin/personal-finance"
                      className="block px-4 py-3 rounded hover:bg-gray-700"
                      onClick={() => setIsOpen(false)}
                    >
                      💰 Global Finance
                    </Link>
                  )}

                  {isSystemAdmin(user) && (
                    <Link
                      href="/admin/contractors"
                      className="block px-4 py-3 rounded hover:bg-gray-700"
                      onClick={() => setIsOpen(false)}
                    >
                      👷 Global Contractors
                    </Link>
                  )}

                  {hasPermission(user, 'canManageBusinessUsers') && (
                    <Link
                      href="/admin/users"
                      className="block px-4 py-3 rounded hover:bg-gray-700"
                      onClick={() => setIsOpen(false)}
                    >
                      👥 User Management
                    </Link>
                  )}

                  {hasPermission(user, 'canManageBusinessSettings') && (
                    <Link
                      href="/admin/settings"
                      className="block px-4 py-3 rounded hover:bg-gray-700"
                      onClick={() => setIsOpen(false)}
                    >
                      ⚙️ System Settings
                    </Link>
                  )}

                  {(isSystemAdmin(user) || hasPermission(user, 'canManageBusinessUsers')) && (
                    <Link
                      href="/business/manage"
                      className="block px-4 py-3 rounded hover:bg-gray-700"
                      onClick={() => setIsOpen(false)}
                    >
                      🏢 Business Management
                    </Link>
                  )}

                  {(isSystemAdmin(user) || hasPermission(user, 'canAccessFinancialData')) && (
                    <Link
                      href="/business/manage/loans"
                      className="block px-4 py-3 rounded hover:bg-gray-700"
                      onClick={() => setIsOpen(false)}
                    >
                      💰 Business Loans
                    </Link>
                  )}

                  {(isSystemAdmin(user) || hasPermission(user, 'canManageBusinessSettings')) && (
                    <Link
                      href="/admin/umbrella-business"
                      className="block px-4 py-3 rounded hover:bg-gray-700"
                      onClick={() => setIsOpen(false)}
                    >
                      🏢 Umbrella Business
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