'use client'

import { useState, useEffect } from 'react'
import { DateInput } from '@/components/ui/date-input'
import { useDateFormat, useDefaultMileageUnit } from '@/contexts/settings-context'
import { useSession } from 'next-auth/react'
import { useToastContext } from '@/components/ui/toast'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { CreateVehicleData, Vehicle } from '@/types/vehicle'
import { getMileageUnitOptions, getMileageUnitWarning, canChangeMileageUnit, type MileageUnit } from '@/lib/mileage-utils'
import { isSystemAdmin, type SessionUser } from '@/lib/permission-utils'

interface VehicleFormProps {
  vehicle?: Vehicle // If provided, form is in edit mode
  onSuccess?: () => void
  onCancel?: () => void
}

export function VehicleForm({ vehicle, onSuccess, onCancel }: VehicleFormProps) {
  const { data: session } = useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const defaultMileageUnit = useDefaultMileageUnit()
  const isEdit = !!vehicle
  const userIsAdmin = isSystemAdmin(session?.user as SessionUser)

  const [formData, setFormData] = useState<CreateVehicleData>({
    licensePlate: '',
    vin: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    weight: 0,
    driveType: 'LEFT_HAND',
    ownershipType: 'PERSONAL',
    currentMileage: 0,
    mileageUnit: defaultMileageUnit as MileageUnit,
    businessId: '',
    userId: session?.user?.id || '',
    purchaseDate: '',
    purchasePrice: 0,
    notes: ''
  })

  const toast = useToastContext()

  // Populate form data if editing
  useEffect(() => {
    if (vehicle) {
      setFormData({
        licensePlate: vehicle.licensePlate,
        vin: vehicle.vin,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color || '',
        weight: vehicle.weight || 0,
        driveType: vehicle.driveType,
        ownershipType: vehicle.ownershipType,
        currentMileage: vehicle.currentMileage,
        mileageUnit: vehicle.mileageUnit,
        businessId: vehicle.businessId || '',
        userId: vehicle.userId || session?.user?.id || '',
        purchaseDate: vehicle.purchaseDate || '',
        purchasePrice: vehicle.purchasePrice || 0,
        notes: vehicle.notes || ''
      })
    }
  }, [vehicle, session?.user?.id])

  const { format: globalDateFormat } = useDateFormat()
  const mileageUnitOptions = getMileageUnitOptions()

  // Check if mileage unit can be changed
  const canChangeMileage = canChangeMileageUnit(vehicle?.hasInitialMileage || false, userIsAdmin)
  const mileageWarning = getMileageUnitWarning(vehicle?.hasInitialMileage || false, userIsAdmin)

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
      const url = isEdit ? '/api/vehicles' : '/api/vehicles'
      const method = isEdit ? 'PUT' : 'POST'
      const body = isEdit ? { id: vehicle?.id, ...formData } : formData

      const result = await fetchWithValidation(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (onSuccess) onSuccess()
      toast.push(isEdit ? 'Vehicle updated' : 'Vehicle created')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      try { useToastContext().push(message) } catch (e) { /* noop if toast not available */ }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="card p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-primary">
          {isEdit ? 'Edit Vehicle' : 'Register New Vehicle'}
        </h2>
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
          {/* License Plate */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              License Plate *
            </label>
            <input
              type="text"
              name="licensePlate"
              required
              value={formData.licensePlate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
              placeholder="ABC-123"
            />
          </div>

          {/* VIN */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              VIN Number *
            </label>
            <input
              type="text"
              name="vin"
              required
              minLength={17}
              maxLength={17}
              value={formData.vin}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
              placeholder="17-character VIN"
            />
          </div>

          {/* Make */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Make *
            </label>
            <input
              type="text"
              name="make"
              required
              value={formData.make}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
              placeholder="Toyota, Honda, Ford..."
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Model *
            </label>
            <input
              type="text"
              name="model"
              required
              value={formData.model}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Camry, Civic, F-150..."
            />
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Year *
            </label>
            <input
              type="number"
              name="year"
              required
              min={1900}
              max={new Date().getFullYear() + 1}
              value={formData.year}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Color
            </label>
            <input
              type="text"
              name="color"
              value={formData.color}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Red, Blue, White..."
            />
          </div>

          {/* Drive Type */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Drive Type *
            </label>
            <select
              name="driveType"
              required
              value={formData.driveType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="LEFT_HAND">Left Hand Drive</option>
              <option value="RIGHT_HAND">Right Hand Drive</option>
            </select>
          </div>

          {/* Ownership Type */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Ownership Type *
            </label>
            <select
              name="ownershipType"
              required
              value={formData.ownershipType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PERSONAL">Personal Vehicle</option>
              <option value="BUSINESS">Business Vehicle</option>
            </select>
          </div>

          {/* Current Mileage */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Current Mileage *
            </label>
            <input
              type="number"
              name="currentMileage"
              required
              min={0}
              value={formData.currentMileage}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`Current mileage in ${formData.mileageUnit}`}
            />
          </div>

          {/* Mileage Unit */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Mileage Unit *
            </label>
            <select
              name="mileageUnit"
              required
              value={formData.mileageUnit}
              onChange={handleInputChange}
              disabled={!canChangeMileage}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                !canChangeMileage ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-75' : ''
              }`}
            >
              {mileageUnitOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.abbreviation})
                </option>
              ))}
            </select>
            {mileageWarning && (
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                ⚠️ {mileageWarning}
              </p>
            )}
          </div>

          {/* Weight */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Weight (kg)
            </label>
            <input
              type="number"
              name="weight"
              min={0}
              value={formData.weight || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Vehicle weight in kg"
            />
          </div>

          {/* Purchase Date */}
          <div>
            <DateInput
              value={formData.purchaseDate || ''}
              onChange={(isoDate, _country) => setFormData(prev => ({ ...prev, purchaseDate: isoDate }))}
              label="Purchase Date"
              placeholder={globalDateFormat}
              className="w-full"
            />
          </div>

          {/* Purchase Price */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Purchase Price
            </label>
            <input
              type="number"
              name="purchasePrice"
              min={0}
              step="0.01"
              value={formData.purchasePrice || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
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
            placeholder="Additional notes about the vehicle..."
          />
        </div>

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
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
          >
            {isSubmitting
              ? (isEdit ? 'Updating...' : 'Registering...')
              : (isEdit ? 'Update Vehicle' : 'Register Vehicle')
            }
          </button>
        </div>
      </form>
    </div>
  )
}