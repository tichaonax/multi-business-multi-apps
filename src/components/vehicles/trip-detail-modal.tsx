 'use client'

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useSession } from 'next-auth/react'
import { VehicleTrip } from '@/types/vehicle'
import { useDateFormat } from '@/contexts/settings-context'
import { formatDateByFormat } from '@/lib/country-codes'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-modal'

interface TripDetailModalProps {
  trip: VehicleTrip | null
  onClose: () => void
  onUpdate?: (trip: VehicleTrip) => void
  onTripStatusChanged?: () => void
}

export function TripDetailModal({ trip, onClose, onUpdate, onTripStatusChanged }: TripDetailModalProps) {
  const { data: session } = useSession()
  const { format: globalDateFormat } = useDateFormat()
  const toast = useToastContext()
  const confirm = useConfirm()
  const { hasPermission, isSystemAdmin } = useBusinessPermissionsContext()
  const [reopening, setReopening] = useState(false)

  if (!trip) return null

  const formatDateTime = (d?: string) => (d ? `${formatDateByFormat(d, globalDateFormat)} ${new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'N/A')

  // Calculate total expenses
  const totalExpenses = trip.expenses?.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0) || 0

  // Check if user can edit trips (only if trip is not completed)
  const canEdit = !trip.isCompleted && (isSystemAdmin || hasPermission('canManageTrips'))

  // Check if user can reopen completed trips (admins, managers, business owners)
  const canReopen = trip.isCompleted && (
    isSystemAdmin ||
    hasPermission('canManageTrips') ||
    hasPermission('canManageBusinessUsers')
  )

  // Debug logging
  console.log('Trip Detail Modal Debug:', {
    tripId: trip.id,
    isCompleted: trip.isCompleted,
    hasSession: !!session?.user,
    isSystemAdmin,
    canManageTrips: hasPermission('canManageTrips'),
    canManageBusinessUsers: hasPermission('canManageBusinessUsers'),
    canEdit,
    canReopen
  })

  const handleReopenTrip = async () => {
    console.log('handleReopenTrip called', { tripId: trip.id, isCompleted: trip.isCompleted })

    const confirmed = await confirm({
      title: 'Reopen Trip',
      description: `Are you sure you want to reopen this trip?\n\nTrip: ${trip.tripPurpose}\nDistance: ${trip.tripMileage ?? 0} miles\n\nThis will change the status back to "In Progress" and allow editing.`,
      confirmText: 'Reopen Trip',
      cancelText: 'Cancel'
    })

    console.log('Confirmation result:', confirmed)

    if (!confirmed) return

    setReopening(true)
    try {
      const payload = {
        id: trip.id,
        isCompleted: false,
        endMileage: null,
        endTime: null
      }

      console.log('Reopening trip with payload:', payload)

      const response = await fetch('/api/vehicles/trips', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      console.log('Response:', { status: response.status, result })

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reopen trip')
      }

      toast.push('Trip reopened successfully')
      onClose()
      if (onTripStatusChanged) onTripStatusChanged()
    } catch (err) {
      console.error('Error reopening trip:', err)
      toast.push(err instanceof Error ? err.message : 'Failed to reopen trip')
    } finally {
      setReopening(false)
    }
  }

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-primary">Trip Details</h3>
              {trip.isCompleted ? (
                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Completed
                </span>
              ) : (
                <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  In Progress
                </span>
              )}
            </div>
            <p className="text-sm text-secondary mt-1">{trip.tripPurpose}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-secondary">
          <div>
            <div className="font-medium">Vehicle</div>
            <div>{trip.vehicle ? `${trip.vehicle.make} ${trip.vehicle.model} (${trip.vehicle.licensePlate})` : 'N/A'}</div>
          </div>

          <div>
            <div className="font-medium">Driver</div>
            <div>
              {trip.driver?.fullName || 'N/A'}
              {trip.driver?.user && (
                <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                  (Login: {trip.driver.user.name})
                </span>
              )}
            </div>
          </div>

          <div>
            <div className="font-medium">Start</div>
            <div>{formatDateTime(trip.startTime)}</div>
          </div>

          <div>
            <div className="font-medium">End</div>
            <div>{formatDateTime(trip.endTime)}</div>
          </div>

          <div>
            <div className="font-medium">Mileage</div>
            <div>{trip.startMileage} - {trip.endMileage ?? 'Ongoing'}</div>
          </div>

          <div>
            <div className="font-medium">Distance</div>
            <div>{trip.tripMileage ?? 'N/A'} miles</div>
          </div>

          {trip.startLocation && (
            <div className="sm:col-span-2">
              <div className="font-medium">Route</div>
              <div>{trip.startLocation} → {trip.endLocation || 'N/A'}</div>
            </div>
          )}

          {trip.notes && (
            <div className="sm:col-span-2">
              <div className="font-medium">Notes</div>
              <div className="text-sm text-secondary">{trip.notes}</div>
            </div>
          )}

          {trip.expenses && trip.expenses.length > 0 && (
            <div className="sm:col-span-2">
              <div className="font-medium">Expenses</div>
              <div className="text-sm text-secondary">
                {trip.expenses.length} recorded - Total: ${totalExpenses.toFixed(2)}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          {canReopen && (
            <button
              onClick={handleReopenTrip}
              disabled={reopening}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reopening ? 'Reopening...' : 'Reopen Trip'}
            </button>
          )}
          {canEdit && onUpdate && (
            <button
              onClick={() => onUpdate(trip)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Edit Trip
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Close</button>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return modalContent

  return createPortal(modalContent, document.body)
}
