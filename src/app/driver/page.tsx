'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ContentLayout } from '@/components/layout/content-layout'
import { hasUserPermission } from '@/lib/permission-utils'
import { Loader2, Car, ArrowRight, Wrench } from 'lucide-react'
import Link from 'next/link'

export default function DriverPortalPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.users?.id) {
      router.push('/auth/signin')
      return
    }

    // Check if user has permission to log driver trips or maintenance
    if (!hasUserPermission(session.user, 'canLogDriverTrips') && !hasUserPermission(session.user, 'canLogDriverMaintenance')) {
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

  if (!session?.users?.id || (!hasUserPermission(session.user, 'canLogDriverTrips') && !hasUserPermission(session.user, 'canLogDriverMaintenance'))) {
    return null
  }

  return (
    <ContentLayout
      title="Driver Portal"
      subtitle="Manage your trips and driving activities"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="card p-8 text-center">
          <div className="bg-blue-100 dark:bg-blue-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Car className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-primary mb-2">
            Welcome to Driver Portal
          </h1>
          <p className="text-secondary max-w-md mx-auto">
            Access your driving tools and trip management features in one simple location.
          </p>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hasUserPermission(session.user, 'canLogDriverTrips') && (
            <Link
              href="/driver/trips"
              className="card p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
                  <Car className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-primary mb-2">My Trips</h3>
              <p className="text-secondary text-sm">
                Log new trips, view trip history, and manage your driving records with expenses.
              </p>
            </Link>
          )}

          {hasUserPermission(session.user, 'canLogDriverMaintenance') && (
            <Link
              href="/driver/maintenance"
              className="card p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
                  <Wrench className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-primary mb-2">Vehicle Maintenance</h3>
              <p className="text-secondary text-sm">
                Record maintenance services, view service history, and track vehicle care.
              </p>
            </Link>
          )}

          {(!hasUserPermission(session.user, 'canLogDriverTrips') || !hasUserPermission(session.user, 'canLogDriverMaintenance')) && (
            <div className="card p-6 opacity-50 cursor-not-allowed">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                  <Car className="h-6 w-6 text-gray-400" />
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-400 mb-2">Vehicle Status</h3>
              <p className="text-gray-400 text-sm">
                Check vehicle assignments and authorization status. (Coming Soon)
              </p>
            </div>
          )}
        </div>

        {/* Information Section */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-primary mb-3">Driver Guidelines</h3>
          <div className="space-y-2 text-sm text-secondary">
            {hasUserPermission(session.user, 'canLogDriverTrips') && (
              <>
                <p>• Always log trips accurately with correct start and end mileage</p>
                <p>• Select the appropriate trip purpose and type (Business/Personal/Mixed)</p>
                <p>• Record trip expenses including fuel, tolls, and other costs</p>
                <p>• Complete trip details promptly after each journey</p>
              </>
            )}
            {hasUserPermission(session.user, 'canLogDriverMaintenance') && (
              <>
                <p>• Record all maintenance services performed on vehicles</p>
                <p>• Include service costs, provider details, and warranty information</p>
                <p>• Note scheduled vs. emergency maintenance for proper tracking</p>
                <p>• Keep receipts and photos for maintenance records</p>
              </>
            )}
            <p>• Contact your supervisor if you need access to additional vehicles</p>
            <p>• Report any vehicle issues or concerns immediately</p>
          </div>
        </div>
      </div>
    </ContentLayout>
  )
}