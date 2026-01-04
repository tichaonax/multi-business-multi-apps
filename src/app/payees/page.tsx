'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { hasUserPermission } from '@/lib/permission-utils'
import { CreateIndividualPayeeModal } from '@/components/expense-account/create-individual-payee-modal'
import { EditIndividualPayeeModal } from '@/components/payee/edit-individual-payee-modal'

interface Payee {
  id: string
  type: 'USER' | 'EMPLOYEE' | 'PERSON' | 'BUSINESS'
  name: string
  identifier?: string
  email?: string
  phone?: string
  isActive: boolean
  businessName?: string
}

export default function PayeesPage() {
  const { data: session } = useSession()
  const [payees, setPayees] = useState<Payee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedPayeeId, setSelectedPayeeId] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Check permissions
  const canView = session?.user && hasUserPermission(session.user, 'canViewPayees')
  const canCreate = session?.user && hasUserPermission(session.user, 'canCreatePayees')
  const canEdit = session?.user && hasUserPermission(session.user, 'canEditPayees')

  // Fetch payees on mount and when filters change
  useEffect(() => {
    if (session?.user && canView) {
      fetchPayees()
    }
  }, [session?.user, canView, refreshTrigger])

  // Search as you type with debouncing
  useEffect(() => {
    if (!session?.user || !canView) return

    const timer = setTimeout(() => {
      setRefreshTrigger(prev => prev + 1)
    }, 500) // 500ms debounce

    return () => clearTimeout(timer)
  }, [searchTerm, session?.user, canView])

  const fetchPayees = async () => {
    try {
      setLoading(true)

      // Build query params
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (filterType !== 'ALL') params.append('type', filterType)
      if (filterStatus !== 'ALL') params.append('isActive', filterStatus === 'ACTIVE' ? 'true' : 'false')

      const response = await fetch(`/api/payees?${params.toString()}`, {
        credentials: 'include',
      })

      if (response.ok) {
        const result = await response.json()

        // Flatten all payee types into single array
        const allPayees: Payee[] = [
          ...result.data.users.map((u: any) => ({
            id: u.id,
            type: 'USER' as const,
            name: u.name,
            identifier: u.email,
            email: u.email,
            isActive: u.isActive
          })),
          ...result.data.employees.map((e: any) => ({
            id: e.id,
            type: 'EMPLOYEE' as const,
            name: e.name,
            identifier: e.identifier,
            email: e.email,
            phone: e.phone,
            businessName: e.businessName,
            isActive: e.isActive
          })),
          ...result.data.persons.map((p: any) => ({
            id: p.id,
            type: 'PERSON' as const,
            name: p.name,
            identifier: p.identifier,
            email: p.email,
            phone: p.phone,
            isActive: p.isActive
          })),
          ...result.data.businesses.map((b: any) => ({
            id: b.id,
            type: 'BUSINESS' as const,
            name: b.name,
            identifier: b.identifier,
            email: b.email,
            phone: b.phone,
            isActive: b.isActive
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

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'USER':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">User</span>
      case 'EMPLOYEE':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">Employee</span>
      case 'PERSON':
        return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">Individual</span>
      case 'BUSINESS':
        return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">Business</span>
      default:
        return null
    }
  }

  if (!session?.user || !canView) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <ContentLayout
            title="Access Denied"
            subtitle="You don't have permission to view payees"
            breadcrumb={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Payees', isActive: true }
            ]}
          >
            <div className="card p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400 mb-4">
                You don't have permission to view payees. Please contact your administrator.
              </p>
              <Link href="/dashboard" className="btn-secondary">
                ← Back to Dashboard
              </Link>
            </div>
          </ContentLayout>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout
          title="Payee Management"
          subtitle="View and manage all payees across the system"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Payees', isActive: true }
          ]}
        >
          {/* Search and Filters */}
          <div className="card p-6 mb-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Search</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, email, phone, or ID..."
                    className="input w-full px-4 py-2.5 text-base"
                  />
                </div>

                {/* Type Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => {
                      setFilterType(e.target.value)
                      setRefreshTrigger(prev => prev + 1)
                    }}
                    className="input w-full px-4 py-2.5 text-base"
                  >
                    <option value="ALL">All Types</option>
                    <option value="USER">Users</option>
                    <option value="EMPLOYEE">Employees</option>
                    <option value="PERSON">Individuals</option>
                    <option value="BUSINESS">Businesses</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value)
                      setRefreshTrigger(prev => prev + 1)
                    }}
                    className="input w-full px-4 py-2.5 text-base"
                  >
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('')
                    setFilterType('ALL')
                    setFilterStatus('ALL')
                    setRefreshTrigger(prev => prev + 1)
                  }}
                  className="btn-secondary"
                >
                  Reset Search
                </button>

                {canCreate && (
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="btn-secondary"
                  >
                    + Create Individual Payee
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="card p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                Payees ({payees.length})
              </h2>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-secondary">Loading payees...</p>
              </div>
            ) : payees.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-secondary">No payees found</p>
                {canCreate && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary mt-4"
                  >
                    Create First Payee
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {payees.map((payee) => (
                  <div
                    key={`${payee.type}-${payee.id}`}
                    className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getTypeBadge(payee.type)}
                          <h3 className="font-semibold">{payee.name}</h3>
                          {!payee.isActive && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                              Inactive
                            </span>
                          )}
                        </div>

                        <div className="text-sm text-secondary space-y-1">
                          {payee.identifier && (
                            <div>ID: {payee.identifier}</div>
                          )}
                          {payee.email && (
                            <div>Email: {payee.email}</div>
                          )}
                          {payee.phone && (
                            <div>Phone: {payee.phone}</div>
                          )}
                          {payee.businessName && (
                            <div>Business: {payee.businessName}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {canEdit && payee.type === 'PERSON' && (
                          <button
                            className="btn-sm btn-secondary"
                            onClick={() => {
                              setSelectedPayeeId(payee.id)
                              setShowEditModal(true)
                            }}
                          >
                            Edit
                          </button>
                        )}

                        {canEdit && (
                          <button
                            className={`btn-sm ${payee.isActive ? 'btn-danger' : 'btn-success'}`}
                            onClick={() => handleToggleStatus(payee)}
                          >
                            {payee.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
              onClose={() => {
                setShowEditModal(false)
                setSelectedPayeeId(null)
              }}
              onSuccess={() => {
                setShowEditModal(false)
                setSelectedPayeeId(null)
                setRefreshTrigger(prev => prev + 1)
              }}
            />
          )}
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}
