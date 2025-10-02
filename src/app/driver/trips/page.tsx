'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ContentLayout } from '@/components/layout/content-layout'
import { hasUserPermission } from '@/lib/permission-utils'
import { DriverTripForm } from '@/components/driver/driver-trip-form'
import { DriverTripList } from '@/components/driver/driver-trip-list'
import { Loader2, Car, Clock, Plus, List } from 'lucide-react'

export default function DriverTripsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeView, setActiveView] = useState<'form' | 'list'>('form')

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user?.id) {
      router.push('/auth/signin')
      return
    }

    // Check if user has permission to log driver trips
    if (!hasUserPermission(session.user, 'canLogDriverTrips')) {
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

  if (!session?.user?.id || !hasUserPermission(session.user, 'canLogDriverTrips')) {
    return null
  }

  return (
    <ContentLayout
      title="My Trips"
      subtitle="Log and view your driving trips"
      breadcrumb={[
        { label: 'Driver Portal', href: '/driver' },
        { label: 'My Trips', isActive: true }
      ]}
      headerActions={
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('form')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === 'form'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>Log Trip</span>
          </button>
          <button
            onClick={() => setActiveView('list')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <List className="h-4 w-4" />
            <span>My Trips</span>
          </button>
        </div>
      }
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Welcome Message */}
        {activeView === 'form' && (
          <div className="card p-6 text-center">
            <Car className="mx-auto h-12 w-12 text-primary mb-4" />
            <h2 className="text-xl font-semibold text-primary mb-2">
              Welcome, {session.user.name}!
            </h2>
            <p className="text-secondary">
              Log your driving trips with accurate mileage and trip details.
            </p>
          </div>
        )}

        {/* Trip Form */}
        {activeView === 'form' && (
          <DriverTripForm
            onSuccess={() => {
              // Switch to list view after successful submission
              setActiveView('list')
            }}
          />
        )}

        {/* Trip List */}
        {activeView === 'list' && (
          <DriverTripList
            onEditTrip={(trip) => {
              // For now, just log the trip - could implement edit modal later
              console.log('Edit trip:', trip)
            }}
          />
        )}
      </div>
    </ContentLayout>
  )
}