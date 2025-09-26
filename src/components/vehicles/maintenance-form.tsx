'use client'

import { useState, useEffect } from 'react'
import { DateInput } from '@/components/ui/date-input'
import { CreateMaintenanceData, Vehicle } from '@/types/vehicle'

interface MaintenanceFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  vehicleId?: string
}

export function MaintenanceForm({ onSuccess, onCancel, vehicleId }: MaintenanceFormProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loadingData, setLoadingData] = useState(true)

  const [formData, setFormData] = useState<CreateMaintenanceData>({
    vehicleId: vehicleId || '',
    serviceType: 'ROUTINE',
    serviceName: '',
    serviceProvider: '',
    serviceDate: new Date().toISOString().slice(0, 10),
    mileageAtService: 0,
    cost: 0,
    currency: 'USD',
    nextServiceMileage: 0,
    nextServiceDate: '',
    warrantyUntil: '',
    receiptUrl: '',
    notes: '',
    isCompleted: false
  })

  // Fetch vehicles on component mount
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await fetch('/api/vehicles?isActive=true')
        if (response.ok) {
          const data = await response.json()
          setVehicles(data.data || [])
        }
      } catch (err) {
        console.error('Error fetching vehicles:', err)
      } finally {
        setLoadingData(false)
      }
    }

    if (!vehicleId) {
      fetchVehicles()
    } else {
      setLoadingData(false)
    }
  }, [vehicleId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? Number(value) : value
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/vehicles/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create maintenance record')
      }

      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

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
        <h2 className="text-xl font-semibold text-primary">Record Maintenance Service</h2>
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
              disabled={!!vehicleId}
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

          {/* Service Type */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Service Type *
            </label>
            <select
              name="serviceType"
              required
              value={formData.serviceType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
            >
              <option value="ROUTINE">Routine Maintenance</option>
              <option value="REPAIR">Repair</option>
              <option value="INSPECTION">Inspection</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="WARRANTY">Warranty Work</option>
              <option value="UPGRADE">Upgrade</option>
            </select>
          </div>

          {/* Service Name */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Service Name *
            </label>
            <input
              type="text"
              name="serviceName"
              required
              value={formData.serviceName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
              placeholder="Oil change, brake repair, inspection..."
            />
          </div>

          {/* Service Provider */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Service Provider
            </label>
            <input
              type="text"
              name="serviceProvider"
              value={formData.serviceProvider}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
              placeholder="Shop name or mechanic"
            />
          </div>

          {/* Service Date */}
          <div>
            <DateInput
              value={formData.serviceDate || ''}
              onChange={(isoDate) => setFormData(prev => ({ ...prev, serviceDate: isoDate }))}
              label="Service Date"
              required
              className="w-full"
            />
          </div>

          {/* Mileage at Service */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Mileage at Service *
            </label>
            <input
              type="number"
              name="mileageAtService"
              required
              min="0"
              value={formData.mileageAtService || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
              placeholder="Current odometer reading"
            />
          </div>

          {/* Cost */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Cost *
            </label>
            <input
              type="number"
              name="cost"
              required
              min="0"
              step="0.01"
              value={formData.cost || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
              placeholder="0.00"
            />
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Currency
            </label>
            <select
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="ZWL">ZWL</option>
            </select>
          </div>

          {/* Next Service Mileage */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Next Service Mileage
            </label>
            <input
              type="number"
              name="nextServiceMileage"
              min="0"
              value={formData.nextServiceMileage || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
              placeholder="When next service is due"
            />
          </div>

          {/* Next Service Date */}
          <div>
            <DateInput
              value={formData.nextServiceDate || ''}
              onChange={(isoDate) => setFormData(prev => ({ ...prev, nextServiceDate: isoDate }))}
              label="Next Service Date"
              className="w-full"
            />
          </div>

          {/* Warranty Until */}
          <div>
            <DateInput
              value={formData.warrantyUntil || ''}
              onChange={(isoDate) => setFormData(prev => ({ ...prev, warrantyUntil: isoDate }))}
              label="Warranty Until"
              className="w-full"
            />
          </div>

          {/* Receipt URL */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Receipt URL/Photo
            </label>
            <input
              type="url"
              name="receiptUrl"
              value={formData.receiptUrl}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
              placeholder="https://example.com/receipt.pdf"
            />
          </div>
        </div>

        {/* Service Completed */}
        <div className="flex items-center">
          <input
            type="checkbox"
            name="isCompleted"
            checked={formData.isCompleted}
            onChange={handleInputChange}
            className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
          <label className="ml-2 text-sm text-secondary">
            Service has been completed
          </label>
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
            placeholder="Additional service details, parts replaced, etc..."
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
            disabled={isSubmitting || !formData.vehicleId}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
          >
            {isSubmitting ? 'Recording...' : 'Record Service'}
          </button>
        </div>
      </form>
    </div>
  )
}