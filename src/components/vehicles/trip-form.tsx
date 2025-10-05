'use client'

import { useState, useEffect } from 'react'
import { useToastContext } from '@/components/ui/toast'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { CreateTripData, Vehicle, VehicleDriver } from '@/types/vehicle'

interface TripFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function TripForm({ onSuccess, onCancel }: TripFormProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<VehicleDriver[]>([])
  const [authorizedDrivers, setAuthorizedDrivers] = useState<VehicleDriver[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loadingData, setLoadingData] = useState(true)

  const [formData, setFormData] = useState<CreateTripData>({
    vehicleId: '',
    driverId: '',
    businessId: '',
    startMileage: 0,
    endMileage: undefined,
    tripPurpose: '',
    tripType: 'BUSINESS',
    startLocation: '',
    endLocation: '',
    startTime: new Date().toISOString().slice(0, 16),
    endTime: '',
    notes: ''
  })

  const toast = useToastContext()

  // Fetch vehicles and drivers on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehiclesBody, driversBody] = await Promise.all([
          fetchWithValidation('/api/vehicles?isActive=true'),
          fetchWithValidation('/api/vehicles/drivers?isActive=true')
        ])

        setVehicles(vehiclesBody?.data || [])
        setDrivers(driversBody?.data || [])
      } catch (err) {
        console.error('Error fetching data:', err)
        try { toast.push(err instanceof Error ? err.message : 'Failed to load data') } catch (e) { }
      } finally {
        setLoadingData(false)
      }
    }

    fetchData()
  }, [])

  // Fetch authorized drivers when vehicle is selected
  useEffect(() => {
    if (formData.vehicleId) {
      const fetchAuthorizedDrivers = async () => {
        try {
          const body = await fetchWithValidation(`/api/vehicles/drivers?vehicleId=${formData.vehicleId}&isActive=true`)
          setAuthorizedDrivers(body?.data || [])
        } catch (err) {
          console.error('Error fetching authorized drivers:', err)
          try { toast.push(err instanceof Error ? err.message : 'Failed to load authorized drivers') } catch (e) { }
        }
      }

      fetchAuthorizedDrivers()
    } else {
      setAuthorizedDrivers([])
    }
  }, [formData.vehicleId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const result = await fetchWithValidation('/api/vehicles/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (onSuccess) onSuccess()
      toast.push('Trip logged successfully')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      try { useToastContext().push(message) } catch (e) { }
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId)

  if (loadingData) {
    return (
      <div className="card p-6 max-w-full overflow-x-hidden">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6 max-w-full overflow-x-hidden">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-primary">Log New Trip</h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-secondary hover:text-primary transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Vehicle Selection */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Vehicle *
            </label>
            <select
              name="vehicleId"
              required
              value={formData.vehicleId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary disabled:bg-gray-100 dark:disabled:bg-gray-600 transition-colors"
            >
              <option value="">Select a vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.make} {vehicle.model} ({vehicle.licensePlate})
                </option>
              ))}
            </select>
          </div>

          {/* Driver Selection */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Driver *
            </label>
            <select
              name="driverId"
              required
              value={formData.driverId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
              disabled={!formData.vehicleId}
            >
              <option value="">
                {!formData.vehicleId ? 'Select vehicle first' : 'Select authorized driver'}
              </option>
              {authorizedDrivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.fullName} ({driver.licenseNumber})
                </option>
              ))}
            </select>
            {formData.vehicleId && authorizedDrivers.length === 0 && (
              <p className="text-xs text-red-500 mt-1">
                No authorized drivers found for this vehicle
              </p>
            )}
          </div>

          {/* Trip Type */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Trip Type *
            </label>
            <select
              name="tripType"
              required
              value={formData.tripType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
            >
              <option value="BUSINESS">Business</option>
              <option value="PERSONAL">Personal</option>
              <option value="MIXED">Mixed</option>
            </select>
          </div>

          {/* Trip Purpose */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Trip Purpose *
            </label>
            <input
              type="text"
              name="tripPurpose"
              required
              value={formData.tripPurpose}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
              placeholder="Client meeting, delivery, site visit..."
            />
          </div>

          {/* Start Mileage */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Start Mileage *
            </label>
            <input
              type="number"
              name="startMileage"
              required
              min={0}
              value={formData.startMileage}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
              placeholder={selectedVehicle ? `Current: ${selectedVehicle.currentMileage}` : ''}
            />
          </div>

          {/* End Mileage (Optional for incomplete trips) */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              End Mileage
            </label>
            <input
              type="number"
              name="endMileage"
              min={formData.startMileage}
              value={formData.endMileage || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
              placeholder="Leave blank if trip is ongoing"
            />
          </div>

          {/* Start Location */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Start Location
            </label>
            <input
              type="text"
              name="startLocation"
              value={formData.startLocation}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
              placeholder="Starting point"
            />
          </div>

          {/* End Location */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              End Location
            </label>
            <input
              type="text"
              name="endLocation"
              value={formData.endLocation}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
              placeholder="Destination"
            />
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Start Time *
            </label>
            <input
              type="datetime-local"
              name="startTime"
              required
              value={formData.startTime}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time
            </label>
            <input
              type="datetime-local"
              name="endTime"
              value={formData.endTime}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            rows={3}
            value={formData.notes}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
            placeholder="Additional trip details..."
          />
        </div>

        {/* Trip Summary */}
        {formData.startMileage && formData.endMileage && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <h4 className="text-sm font-medium text-blue-900 mb-1">Trip Summary</h4>
            <p className="text-sm text-blue-700">
              Distance: {formData.endMileage - formData.startMileage} miles
            </p>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-secondary bg-gray-200 dark:bg-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors w-full sm:w-auto"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !formData.vehicleId || !formData.driverId}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
          >
            {isSubmitting ? 'Logging Trip...' : 'Log Trip'}
          </button>
        </div>
      </form>
    </div>
  )
}