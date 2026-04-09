'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { ProtectedRoute } from '@/components/auth/protected-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { CreateIndividualPayeeModal } from '@/components/expense-account/create-individual-payee-modal'
import { EditIndividualPayeeModal } from '@/components/payee/edit-individual-payee-modal'
import { useUserPermissions } from '@/hooks/use-user-permissions'

interface Payee {
  id: string
  type: 'USER' | 'EMPLOYEE' | 'PERSON' | 'BUSINESS'
  name: string
  identifier?: string
  email?: string
  phone?: string
  isActive: boolean
  // USER
  role?: string
  // EMPLOYEE
  employeeNumber?: string
  nationalId?: string
  businessName?: string
  // BUSINESS
  businessType?: string
}

function getTypeConfig(type: string) {
  switch (type) {
    case 'USER':
      return { label: 'User', bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', avatarBg: 'bg-blue-500' }
    case 'EMPLOYEE':
      return { label: 'Employee', bg: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', avatarBg: 'bg-green-500' }
    case 'PERSON':
      return { label: 'Individual', bg: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', avatarBg: 'bg-purple-500' }
    case 'BUSINESS':
      return { label: 'Business', bg: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', avatarBg: 'bg-orange-500' }
    default:
      return { label: type, bg: 'bg-gray-100 text-gray-800', avatarBg: 'bg-gray-500' }
  }
}

function DetailRow({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium w-16 flex-shrink-0 text-xs">{label}:</span>
      <span className={truncate ? 'truncate' : ''}>{value}</span>
    </div>
  )
}

export default function PayeesPage() {
  const { data: session } = useSession()
  const { permissions: fetchedPermissions, loaded } = useUserPermissions()
  const [payees, setPayees] = useState<Payee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedPayeeId, setSelectedPayeeId] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const isAdmin = session?.user?.role === 'admin'
  const canView = isAdmin || (fetchedPermissions?.canViewPayees ?? false)
  const canCreate = isAdmin || (fetchedPermissions?.canCreatePayees ?? false)
  const canEdit = isAdmin || (fetchedPermissions?.canEditPayees ?? false)

  useEffect(() => {
    if (session?.user && canView) {
      fetchPayees()
    }
  }, [session?.user, canView, refreshTrigger])

  // Debounced search
  useEffect(() => {
    if (!session?.user || !canView) return
    const timer = setTimeout(() => {
      setRefreshTrigger(prev => prev + 1)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm, session?.user, canView])

  const fetchPayees = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (filterType !== 'ALL') params.append('type', filterType)
      if (filterStatus !== 'ALL') params.append('isActive', filterStatus === 'ACTIVE' ? 'true' : 'false')

      const response = await fetch(`/api/payees?${params.toString()}`, { credentials: 'include' })
      if (response.ok) {
        const result = await response.json()
        const allPayees: Payee[] = [
          ...result.data.users.map((u: any) => ({
            id: u.id, type: 'USER' as const, name: u.name,
            email: u.email, role: u.role, isActive: u.isActive
          })),
          ...result.data.employees.map((e: any) => ({
            id: e.id, type: 'EMPLOYEE' as const, name: e.name,
            employeeNumber: e.employeeNumber ?? e.identifier,
            nationalId: e.nationalId,
            email: e.email, phone: e.phone,
            businessName: e.primaryBusiness?.name ?? e.businessName,
            isActive: e.isActive
          })),
          ...result.data.persons.map((p: any) => ({
            id: p.id, type: 'PERSON' as const, name: p.name,
            nationalId: p.nationalId,
            phone: p.phone, email: p.email, isActive: p.isActive
          })),
          ...result.data.businesses.map((b: any) => ({
            id: b.id, type: 'BUSINESS' as const, name: b.name,
            businessType: b.businessType ?? b.identifier,
            email: b.email, phone: b.phone, isActive: b.isActive
          }))
        ]
        setPayees(allPayees)
      } else {
        console.error('Failed to fetch payees:', response.status)
      }
    } catch (error) {
      console.error('Error fetching payees:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (payee: Payee) => {
    if (!canEdit) return
    try {
      const response = await fetch(`/api/payees/${payee.type}/${payee.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !payee.isActive }),
        credentials: 'include',
      })
      if (response.ok) {
        setRefreshTrigger(prev => prev + 1)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error toggling status:', error)
      alert('Failed to update status')
    }
  }

  // Loading state
  if (!session?.user || (!loaded && !isAdmin)) {
    return (
      <ProtectedRoute>
        <ContentLayout
          title="Payee Management"
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Payees', isActive: true }]}
        >
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
          </div>
        </ContentLayout>
      </ProtectedRoute>
    )
  }

  // No permission
  if (!canView) {
    return (
      <ProtectedRoute>
        <ContentLayout
          title="Access Denied"
          subtitle="You don't have permission to view payees"
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Payees', isActive: true }]}
        >
          <div className="card p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-red-600 dark:text-red-400 mb-4">
              You don't have permission to view payees. Please contact your administrator.
            </p>
            <Link href="/dashboard" className="btn-secondary">← Back to Dashboard</Link>
          </div>
        </ContentLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
        <ContentLayout
          title="Payee Management"
          subtitle="View and manage all payees across the system"
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Payees', isActive: true }]}
          headerActions={
            canCreate ? (
              <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                + Add Individual Payee
              </button>
            ) : undefined
          }
        >
          {/* Search and Filters */}
          <div className="mb-6 flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Search payees by name, email, phone..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setRefreshTrigger(prev => prev + 1) }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="ALL">All Types</option>
              <option value="USER">Users</option>
              <option value="EMPLOYEE">Employees</option>
              <option value="PERSON">Individuals</option>
              <option value="BUSINESS">Businesses</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setRefreshTrigger(prev => prev + 1) }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {/* Payees Grid */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : payees.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👤</div>
              <h3 className="text-lg font-medium text-primary mb-2">No payees found</h3>
              <p className="text-secondary mb-4">
                {searchTerm || filterType !== 'ALL' || filterStatus !== 'ALL'
                  ? 'No payees match your search criteria.'
                  : 'No payees have been added yet.'}
              </p>
              {canCreate && !searchTerm && filterType === 'ALL' && filterStatus === 'ALL' && (
                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                  Add First Payee
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm text-secondary mb-4">{payees.length} payee{payees.length !== 1 ? 's' : ''} found</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {payees.map((payee) => {
                  const typeConfig = getTypeConfig(payee.type)
                  const initials = payee.name
                    .split(' ')
                    .map(w => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()

                  return (
                    <div key={`${payee.type}-${payee.id}`} className="card p-6 hover:shadow-lg transition-shadow">
                      {/* Header: Avatar + Name + Status */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full ${typeConfig.avatarBg} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
                            {initials}
                          </div>
                          <div>
                            <h3 className="font-semibold text-primary leading-tight">{payee.name}</h3>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${typeConfig.bg}`}>
                              {payee.type === 'EMPLOYEE' && (
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                              )}
                              {typeConfig.label}
                            </span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                          payee.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {payee.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-1 text-sm text-secondary border-t border-gray-200 dark:border-gray-700 pt-3">
                        {/* USER */}
                        {payee.type === 'USER' && (
                          <>
                            {payee.email && <DetailRow label="Email" value={payee.email} truncate />}
                            {payee.role && <DetailRow label="Role" value={payee.role} />}
                          </>
                        )}
                        {/* EMPLOYEE */}
                        {payee.type === 'EMPLOYEE' && (
                          <>
                            {payee.employeeNumber && <DetailRow label="Emp #" value={payee.employeeNumber} />}
                            {payee.nationalId && <DetailRow label="Nat. ID" value={payee.nationalId} />}
                            {payee.phone && <DetailRow label="Phone" value={payee.phone} />}
                            {payee.email && <DetailRow label="Email" value={payee.email} truncate />}
                            {payee.businessName && <DetailRow label="Business" value={payee.businessName} truncate />}
                          </>
                        )}
                        {/* PERSON (individual) */}
                        {payee.type === 'PERSON' && (
                          <>
                            {payee.nationalId && <DetailRow label="Nat. ID" value={payee.nationalId} />}
                            {payee.phone && <DetailRow label="Phone" value={payee.phone} />}
                            {payee.email && <DetailRow label="Email" value={payee.email} truncate />}
                          </>
                        )}
                        {/* BUSINESS */}
                        {payee.type === 'BUSINESS' && (
                          <>
                            {payee.businessType && <DetailRow label="Type" value={payee.businessType} />}
                            {payee.phone && <DetailRow label="Phone" value={payee.phone} />}
                            {payee.email && <DetailRow label="Email" value={payee.email} truncate />}
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      {canEdit && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                          <div className="flex gap-2">
                            {payee.type === 'PERSON' && (
                              <button
                                className="flex-1 btn-secondary text-sm py-2"
                                onClick={() => { setSelectedPayeeId(payee.id); setShowEditModal(true) }}
                              >
                                Edit
                              </button>
                            )}
                            <button
                              className={`flex-1 text-sm py-2 rounded font-medium transition-colors ${
                                payee.isActive
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                              }`}
                              onClick={() => handleToggleStatus(payee)}
                            >
                              {payee.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Create Individual Payee Modal */}
          {showCreateModal && (
            <CreateIndividualPayeeModal
              onClose={() => setShowCreateModal(false)}
              onSuccess={() => {
                setShowCreateModal(false)
                setRefreshTrigger(prev => prev + 1)
              }}
            />
          )}

          {/* Edit Individual Payee Modal */}
          {showEditModal && selectedPayeeId && (
            <EditIndividualPayeeModal
              payeeId={selectedPayeeId}
              onClose={() => { setShowEditModal(false); setSelectedPayeeId(null) }}
              onSuccess={() => {
                setShowEditModal(false)
                setSelectedPayeeId(null)
                setRefreshTrigger(prev => prev + 1)
              }}
            />
          )}
        </ContentLayout>
    </ProtectedRoute>
  )
}
