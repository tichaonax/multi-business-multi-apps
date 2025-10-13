'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ContentLayout } from '@/components/layout/content-layout'
import { hasUserPermission } from '@/lib/permission-utils'
import { DriverMaintenanceForm } from '@/components/driver/driver-maintenance-form'
import { DriverMaintenanceList } from '@/components/driver/driver-maintenance-list'
import { Loader2, Wrench, Plus, List } from 'lucide-react'

export default function DriverMaintenancePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeView, setActiveView] = useState<'form' | 'list'>('form')

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.users?.id) {
      router.push('/auth/signin')
      return
    }

    // Check if user has permission to log driver maintenance
    if (!hasUserPermission(session.user, 'canLogDriverMaintenance')) {
      router.push('/unauthorized')
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!session?.users?.id || !hasUserPermission(session.user, 'canLogDriverMaintenance')) {
    return null
  }

  return (
    <ContentLayout
      title="Vehicle Maintenance"
      subtitle="Record and view vehicle maintenance services. Edit records within 24 hours of creation."
      breadcrumb={[
        { label: 'Driver Portal', href: '/driver' },
        { label: 'Vehicle Maintenance', isActive: true }
      ]}
      headerActions={
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('form')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === 'form'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>Record Service</span>
          </button>
          <button
            onClick={() => setActiveView('list')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === 'list'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <List className="h-4 w-4" />
            <span>Service History</span>
          </button>
        </div>
      }
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Welcome Message */}
        {activeView === 'form' && (
          <div className="card p-6 text-center">
            <Wrench className="mx-auto h-12 w-12 text-primary mb-4" />
            <h2 className="text-xl font-semibold text-primary mb-2">
              Welcome, {session.users.name}!
            </h2>
            <p className="text-secondary">
              Record vehicle maintenance services with detailed service information and costs.
            </p>
          </div>
        )}

        {/* Maintenance Form */}
        {activeView === 'form' && (
          <DriverMaintenanceForm
            onSuccess={() => {
              // Switch to list view after successful submission
              setActiveView('list')
            }}
          />
        )}

        {/* Maintenance List */}
        {activeView === 'list' && (
          <DriverMaintenanceList
            onAddMaintenance={() => {
              setActiveView('form')
            }}
          />
        )}
      </div>
    </ContentLayout>
  )
}