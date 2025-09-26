 'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import { VehicleTrip } from '@/types/vehicle'
import { useDateFormat } from '@/contexts/settings-context'
import { formatDateByFormat } from '@/lib/country-codes'

interface TripDetailModalProps {
  trip: VehicleTrip | null
  onClose: () => void
  onUpdate?: (trip: VehicleTrip) => void
}

export function TripDetailModal({ trip, onClose }: TripDetailModalProps) {
  if (!trip) return null

  const { format: globalDateFormat } = useDateFormat()
  const formatDateTime = (d?: string) => (d ? `${formatDateByFormat(d, globalDateFormat)} ${new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'N/A')

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Trip Details</h3>
            <p className="text-sm text-secondary">{trip.tripPurpose}</p>
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
            <div>{trip.driver?.fullName || 'N/A'}</div>
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
              <div className="text-sm text-secondary">{trip.expenses.length} recorded</div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md">Close</button>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return modalContent

  return createPortal(modalContent, document.body)
}
