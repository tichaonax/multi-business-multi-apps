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
}

export default function PayrollPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('')
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
        setBusinesses(list)

        // Auto-select first business
        if (list.length > 0 && !selectedBusinessId) {
          setSelectedBusinessId(list[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load businesses:', error)
    }
  }

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
        canCreatePeriod && selectedBusinessId ? (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Create Payroll Period
          </button>
        ) : undefined
      }
    >
      {/* Notification */}
      {notification && (
        <div
          className={`mb-4 p-4 rounded-md ${
            notification.type === 'success'
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
        <select
          value={selectedBusinessId}
          onChange={(e) => setSelectedBusinessId(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select a business</option>
          {businesses.map((business) => (
            <option key={business.id} value={business.id}>
              {business.name} ({business.type})
            </option>
          ))}
        </select>
      </div>

      {/* Payroll Periods List */}
      {selectedBusinessId ? (
        <PayrollPeriodsList
          businessId={selectedBusinessId}
          onSelectPeriod={(period) => router.push(`/payroll/${period.id}`)}
        />
      ) : (
        <div className="card text-center py-12">
          <p className="text-secondary">Please select a business to view payroll periods</p>
        </div>
      )}

      {/* Create Period Modal */}
      {canCreatePeriod && (
        <CreatePayrollPeriodModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          businessId={selectedBusinessId}
          onSuccess={(message, periodId) => {
            showNotification('success', message)
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
