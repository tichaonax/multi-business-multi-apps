'use client'

import { useState, useEffect, useRef } from 'react'
import { useConfirm } from '@/components/ui/confirm-modal'
import { useToastContext } from '@/components/ui/toast'
import { usePrompt } from '@/components/ui/input-modal'
import { useDateFormat } from '@/contexts/settings-context'
import { formatDateByFormat } from '@/lib/country-codes'
import { VehicleTrip, TripApiResponse } from '@/types/vehicle'

interface TripListProps {
  onTripSelect?: (trip: VehicleTrip) => void
  onAddTrip?: () => void
}

export function TripList({ onTripSelect, onAddTrip }: TripListProps) {
  const [trips, setTrips] = useState<VehicleTrip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filter, setFilter] = useState({
    tripType: '',
    isCompleted: '',
    vehicleId: '',
    driverId: ''
  })
  const controllerRef = useRef<AbortController | null>(null)
  const { format: globalDateFormat } = useDateFormat()
  const confirm = useConfirm()
  const toast = useToastContext()
  const prompt = usePrompt()

  const fetchTrips = async () => {
    if (controllerRef.current) controllerRef.current.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const signal = controller.signal

    try {
      setLoading(true)
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        includeExpenses: 'true',
        ...Object.fromEntries(Object.entries(filter).filter(([_, value]) => value))
      })

      const response = await fetch(`/api/vehicles/trips?${queryParams}`, { signal })

      if (!response.ok) {
        throw new Error('Failed to fetch trips')
      }

      const result: TripApiResponse = await response.json()
      if (signal.aborted) return

      if (result.success) {
        setTrips(result.data)
        setTotalPages(result.meta?.totalPages || 1)
      } else {
        throw new Error(result.error || 'Failed to fetch trips')
      }
    } catch (err) {
      const name = (err as any)?.name
      if (name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }

  useEffect(() => {
    fetchTrips()

    return () => {
      controllerRef.current?.abort()
    }
  }, [page, filter])

  const handleCompleteTrip = async (tripId: string, endMileage: number) => {
    try {
      const response = await fetch(`/api/vehicles/trips`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: tripId,
          endMileage,
          endTime: new Date().toISOString(),
          isCompleted: true
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to complete trip')
      }

      // Refresh the list
      fetchTrips()
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Failed to complete trip')
    }
  }

  const handleDelete = async (tripId: string) => {
    const ok = await confirm({
      title: 'Delete trip',
      description: 'Are you sure you want to delete this trip? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })

    if (!ok) return

    try {
      const response = await fetch(`/api/vehicles/trips?id=${tripId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete trip')
      }

      // Refresh the list
      fetchTrips()
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Failed to delete trip')
    }
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A'
    return `${formatDateByFormat(dateString, globalDateFormat)} ${new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  const getTripTypeColor = (tripType: string) => {
    switch (tripType) {
      case 'BUSINESS': return 'bg-blue-100 text-blue-800'
      case 'PERSONAL': return 'bg-green-100 text-green-800'
      case 'MIXED': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-6">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button
            onClick={fetchTrips}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-primary">Trip Log</h2>
          {onAddTrip && (
            <button
              onClick={onAddTrip}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              + Log Trip
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={filter.tripType}
            onChange={(e) => setFilter(prev => ({ ...prev, tripType: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Trip Types</option>
            <option value="BUSINESS">Business</option>
            <option value="PERSONAL">Personal</option>
            <option value="MIXED">Mixed</option>
          </select>

          <select
            value={filter.isCompleted}
            onChange={(e) => setFilter(prev => ({ ...prev, isCompleted: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Trips</option>
            <option value="true">Completed</option>
            <option value="false">In Progress</option>
          </select>

          <button
            onClick={() => setFilter({ tripType: '', isCompleted: '', vehicleId: '', driverId: '' })}
            className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="p-6">
        {trips.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛣️</div>
            <h3 className="text-lg font-medium text-primary mb-2">No Trips Logged</h3>
            <p className="text-secondary mb-6">Start tracking your vehicle trips and mileage.</p>
            {onAddTrip && (
              <button
                onClick={onAddTrip}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Log First Trip
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow relative z-[9998] pointer-events-auto"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-primary break-words">
                          {trip.tripPurpose}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${getTripTypeColor(trip.tripType)}`}>
                          {trip.tripType}
                        </span>
                        {!trip.isCompleted && (
                          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                            In Progress
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-secondary mb-2">
                        <div>
                          <span className="font-medium">Vehicle:</span> {trip.vehicle?.licensePlate}
                        </div>
                        <div>
                          <span className="font-medium">Driver:</span> {trip.driver?.fullName}
                        </div>
                        <div>
                          <span className="font-medium">Distance:</span> {trip.tripMileage} miles
                        </div>
                        <div>
                          <span className="font-medium">Started:</span> {formatDateTime(trip.startTime)}
                        </div>
                      </div>

                      {trip.startLocation && trip.endLocation && (
                        <div className="text-sm text-secondary mb-2">
                          <span className="font-medium">Route:</span> {trip.startLocation} → {trip.endLocation}
                        </div>
                      )}

                      {trip.business && (
                        <div className="text-sm text-secondary mb-2">
                          <span className="font-medium">Business:</span> {trip.businesses.name}
                        </div>
                      )}

                      <div className="text-sm text-secondary">
                        <span className="font-medium">Mileage:</span> {trip.startMileage} - {trip.endMileage || 'Ongoing'}
                      </div>

                      {trip.notes && (
                        <div className="mt-2 text-sm text-secondary">
                          <span className="font-medium">Notes:</span> {trip.notes}
                        </div>
                      )}

                      {trip.expenses && trip.expenses.length > 0 && (
                        <div className="mt-2 text-sm text-secondary">
                          <span className="font-medium">Expenses:</span> {trip.expenses.length} recorded
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                      {!trip.isCompleted && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation()
                            const input = await prompt({
                              title: 'End mileage',
                              description: 'Enter the end mileage for this trip',
                              placeholder: trip.startMileage.toString(),
                              defaultValue: trip.startMileage.toString(),
                              confirmText: 'Complete',
                              cancelText: 'Cancel'
                            })
                            if (input && Number(input) > trip.startMileage) {
                              handleCompleteTrip(trip.id, Number(input))
                            } else if (input !== null) {
                              toast.push('Invalid mileage entered')
                            }
                          }}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors relative z-[9999] pointer-events-auto"
                        >
                          Complete
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onTripSelect?.(trip)
                        }}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors relative z-[9999] pointer-events-auto"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(trip.id)
                        }}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors relative z-[9999] pointer-events-auto"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-6">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <span className="text-sm text-secondary">
                  Page {page} of {totalPages}
                </span>

                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}