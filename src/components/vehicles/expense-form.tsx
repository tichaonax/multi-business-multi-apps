"use client"

import { useState, useEffect } from 'react'
import { DateInput } from '@/components/ui/date-input'
import { CreateExpenseData, Vehicle, VehicleTrip } from '@/types/vehicle'
import { useToastContext } from '@/components/ui/toast'
import fetchWithValidation from '@/lib/fetchWithValidation'

interface ExpenseFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  tripId?: string
}

export function ExpenseForm({ onSuccess, onCancel, tripId }: ExpenseFormProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [trips, setTrips] = useState<VehicleTrip[]>([])
  const toast = useToastContext()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loadingData, setLoadingData] = useState(true)

  const [formData, setFormData] = useState<CreateExpenseData>({
    vehicleId: '',
    tripId: tripId || '',
    businessId: '',
    expenseType: 'FUEL',
    expenseCategory: '',
    amount: 0,
    currency: 'USD',
    expenseDate: new Date().toISOString().slice(0, 10),
    isBusinessDeductible: true,
    receiptUrl: '',
    vendorName: '',
    description: '',
    mileageAtExpense: 0,
    fuelQuantity: 0,
    fuelType: 'GASOLINE'
  })

  // Fetch vehicles and trips on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehiclesBody, tripsBody] = await Promise.all([
          fetchWithValidation('/api/vehicles?isActive=true'),
          fetchWithValidation('/api/vehicles/trips?isCompleted=false')
        ])

        setVehicles(vehiclesBody?.data || [])
        setTrips(tripsBody?.data || [])
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error fetching data'
        console.error('Error fetching data:', err)
        try { toast.push(msg) } catch (e) { /* noop if toast not available */ }
        setError(msg)
      } finally {
        setLoadingData(false)
      }
    }

    fetchData()
  }, [])

  // Set vehicle when trip is selected
  useEffect(() => {
    if (formData.tripId && trips.length > 0) {
      const selectedTrip = trips.find(t => t.id === formData.tripId)
      if (selectedTrip) {
        setFormData(prev => ({
          ...prev,
          vehicleId: selectedTrip.vehicleId,
          businessId: selectedTrip.businessId || ''
        }))
      }
    }
  }, [formData.tripId, trips])

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
      const body = await fetchWithValidation('/api/vehicles/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const successMsg = body?.message || 'Expense recorded'
      try { toast.push(successMsg) } catch (e) { /* noop */ }
      if (onSuccess) onSuccess()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred'
      setError(msg)
      try { toast.push(msg) } catch (e) { /* noop */ }
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
        <h2 className="text-xl font-semibold text-gray-900">Record Vehicle Expense</h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Vehicle Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle *
            </label>
            <select
              name="vehicleId"
              required
              value={formData.vehicleId}
              onChange={handleInputChange}
              disabled={!!tripId}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select a vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.make} {vehicle.model} ({vehicle.licensePlate})
                </option>
              ))}
            </select>
          </div>

          {/* Trip Selection (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Associated Trip (Optional)
            </label>
            <select
              name="tripId"
              value={formData.tripId}
              onChange={handleInputChange}
              disabled={!!tripId}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">No associated trip</option>
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.tripPurpose} - {trip.vehicle?.licensePlate}
                </option>
              ))}
            </select>
          </div>

          {/* Expense Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expense Type *
            </label>
            <select
              name="expenseType"
              required
              value={formData.expenseType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="FUEL">Fuel</option>
              <option value="TOLL">Toll</option>
              <option value="PARKING">Parking</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="INSURANCE">Insurance</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount *
            </label>
            <input
              type="number"
              name="amount"
              required
              min="0"
              step="0.01"
              value={formData.amount}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="ZWL">ZWL</option>
            </select>
          </div>

          {/* Expense Date */}
          <div>
            <DateInput
              value={formData.expenseDate || ''}
              onChange={(isoDate) => setFormData(prev => ({ ...prev, expenseDate: isoDate }))}
              label="Expense Date"
              required
              className="w-full"
            />
          </div>

          {/* Vendor Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendor/Station Name
            </label>
            <input
              type="text"
              name="vendorName"
              value={formData.vendorName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Shell, BP, AutoZone..."
            />
          </div>

          {/* Mileage at Expense */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle Mileage at Time
            </label>
            <input
              type="number"
              name="mileageAtExpense"
              min="0"
              value={formData.mileageAtExpense || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Current odometer reading"
            />
          </div>
        </div>

        {/* Fuel-specific fields */}
        {formData.expenseType === 'FUEL' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fuel Quantity *
              </label>
              <input
                type="number"
                name="fuelQuantity"
                required
                min="0"
                step="0.01"
                value={formData.fuelQuantity || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Gallons or Liters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fuel Type *
              </label>
              <select
                name="fuelType"
                required
                value={formData.fuelType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="GASOLINE">Gasoline</option>
                <option value="DIESEL">Diesel</option>
                <option value="ELECTRIC">Electric</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>
          </div>
        )}

        {/* Business Deductible */}
        <div className="flex items-center">
          <input
            type="checkbox"
            name="isBusinessDeductible"
            checked={formData.isBusinessDeductible}
            onChange={handleInputChange}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
          <label className="ml-2 text-sm text-gray-700">
            This expense is business deductible
          </label>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <input
            type="text"
            name="expenseCategory"
            value={formData.expenseCategory}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Optional category for organization"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            name="description"
            rows={3}
            value={formData.description}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Additional details about this expense..."
          />
        </div>

        {/* Receipt URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Receipt URL/Photo
          </label>
          <input
            type="url"
            name="receiptUrl"
            value={formData.receiptUrl}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com/receipt.pdf"
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !formData.vehicleId}
            className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Recording...' : 'Record Expense'}
          </button>
        </div>
      </form>
    </div>
  )
}