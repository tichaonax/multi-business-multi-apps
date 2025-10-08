'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { PayrollPeriodsList } from '@/components/payroll/payroll-periods-list'
import { CreatePayrollPeriodModal } from '@/components/payroll/create-payroll-period-modal'
import { hasPermission } from '@/lib/permission-utils'

interface Business {
  id: string
  name: string
  type: string
  isUmbrellaBusiness?: boolean
}

export default function PayrollPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('')
  const [umbrellaBusinessId, setUmbrellaBusinessId] = useState<string | null>(null)
  const [createForAllEmployees, setCreateForAllEmployees] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      loadBusinesses()
    }
  }, [session])

  const loadBusinesses = async () => {
    try {
      const response = await fetch('/api/businesses')
      if (response.ok) {
        const data = await response.json()
        // API can return either an array (for regular users) or a wrapper { businesses, isAdmin }
        const list = Array.isArray(data) ? data : (data?.businesses ?? [])
        const adminFlag = Array.isArray(data) ? false : !!data?.isAdmin
        setIsAdmin(adminFlag)
        // Prepare final business list. If system admin, include umbrella business first
        let finalList = list

        if (adminFlag) {
          try {
            const resUmb = await fetch('/api/admin/umbrella-business')
            if (resUmb.ok) {
              const umbrella = await resUmb.json()
              if (umbrella?.id) {
                const umbrellaBusiness: Business = {
                  id: umbrella.id,
                  name: umbrella.umbrellaBusinessName || 'Umbrella Business',
                  type: 'umbrella',
                  isUmbrellaBusiness: true
                }
                if (!list.find((b: any) => b.id === umbrellaBusiness.id)) {
                  finalList = [umbrellaBusiness, ...list]
                }
                // remember umbrella id for create-all shortcut
                setUmbrellaBusinessId(umbrellaBusiness.id)
              }
            }
          } catch (e) {
            console.error('Failed to fetch umbrella business:', e)
          }
        }

        setBusinesses(finalList)
      }
    } catch (error) {
      console.error('Failed to load businesses:', error)
    }
  }

  const selectedBusinessIsUmbrella = businesses.find(b => b.id === selectedBusinessId)?.isUmbrellaBusiness === true

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  if (status === 'loading') {
    return (
      <ContentLayout title="Payroll Management">
        <div className="flex items-center justify-center h-64">
          <div className="text-secondary">Loading...</div>
        </div>
      </ContentLayout>
    )
  }

  if (!session?.user) {
    return null
  }

  const canAccessPayroll = hasPermission(session.user, 'canAccessPayroll')
  const canCreatePeriod = hasPermission(session.user, 'canCreatePayrollPeriod')

  if (!canAccessPayroll) {
    return (
      <ContentLayout title="Payroll Management">
        <div className="card text-center py-12">
          <p className="text-secondary">You do not have permission to access payroll management.</p>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="Payroll Management"
      subtitle="Manage employee payroll, track attendance, and generate monthly reports"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Payroll', isActive: true }
      ]}
      headerActions={
        (canCreatePeriod && (selectedBusinessId || (createForAllEmployees && umbrellaBusinessId))) || hasPermission(session.user, 'canManageEmployees') ? (
          <div className="flex items-center gap-2">
            {hasPermission(session.user, 'canManageEmployees') && (
              <button
                onClick={() => window.location.href = '/employees'}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-border rounded-md hover:bg-gray-50"
              >
                Employee Management
              </button>
            )}
            {canCreatePeriod && (selectedBusinessId || (createForAllEmployees && umbrellaBusinessId)) && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Create Payroll Period
              </button>
            )}
          </div>
        ) : undefined
      }
    >
      {/* Notification */}
      {notification && (
        <div
          className={`mb-4 p-4 rounded-md ${notification.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
            }`}
        >
          {notification.message}
        </div>
      )}

      {/* Business Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-secondary mb-2">
          Select Business
        </label>
        {isAdmin && umbrellaBusinessId && (
          <div className="mb-3 flex items-center gap-3">
            <input
              id="create-for-all"
              type="checkbox"
              checked={createForAllEmployees}
              onChange={(e) => setCreateForAllEmployees(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-border rounded"
            />
            <label htmlFor="create-for-all" className="text-sm text-secondary">
              Create payroll for all employees (Umbrella)
            </label>
          </div>
        )}
        <select
          value={selectedBusinessId}
          onChange={(e) => {
            const val = e.target.value
            if (val === 'ALL_EMPLOYEES') {
              // user explicitly selected the All employees option
              if (umbrellaBusinessId) {
                setCreateForAllEmployees(true)
                setSelectedBusinessId(umbrellaBusinessId)
              }
            } else {
              setCreateForAllEmployees(false)
              setSelectedBusinessId(val)
            }
          }}
          className="w-full max-w-md px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select a business</option>
          {isAdmin && umbrellaBusinessId && (
            <option value="ALL_EMPLOYEES">All employees (Umbrella)</option>
          )}
          {businesses.map((business) => (
            <option key={business.id} value={business.id}>
              {business.name} ({business.type})
            </option>
          ))}
        </select>
      </div>

      {/* Payroll Periods List - show all periods when no business selected */}
      <PayrollPeriodsList
        businessId={selectedBusinessId || undefined}
        onSelectPeriod={(period) => router.push(`/payroll/${period.id}`)}
      />

      {/* Create Period Modal */}
      {canCreatePeriod && (
        <CreatePayrollPeriodModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          businessId={createForAllEmployees && umbrellaBusinessId ? umbrellaBusinessId : selectedBusinessId}
          isUmbrella={createForAllEmployees ? true : selectedBusinessIsUmbrella}
          targetAllEmployees={createForAllEmployees && !!umbrellaBusinessId}
          onSuccess={(payload) => {
            const message = typeof payload === 'string' ? payload : (payload?.message || 'Payroll period created')
            showNotification('success', message)
            const periodId = payload && typeof payload === 'object' ? payload.id : undefined
            // Navigate to the newly created period
            if (periodId) {
              router.push(`/payroll/${periodId}`)
            } else {
              // Fallback: reload the periods list
              window.location.reload()
            }
          }}
          onError={(error) => showNotification('error', error)}
        />
      )}
    </ContentLayout>
  )
}
