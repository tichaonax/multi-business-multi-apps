'use client'

import { useState, useEffect } from 'react'
import { useToastContext } from '@/components/ui/toast'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { CreateTripData, Vehicle, VehicleDriver, VehicleTrip } from '@/types/vehicle'
import { TripExpenseItem, TripExpenseCategory, TRIP_EXPENSE_CATEGORIES } from '@/types/trip-expenses'
import { ExpenseInput } from '@/components/driver/expense-input'
import { Plus } from 'lucide-react'

interface TripFormProps {
  trip?: VehicleTrip | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function TripForm({ trip, onSuccess, onCancel }: TripFormProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<VehicleDriver[]>([])
  const [authorizedDrivers, setAuthorizedDrivers] = useState<VehicleDriver[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loadingData, setLoadingData] = useState(true)
  const [showExpenses, setShowExpenses] = useState(false)
  const isEditMode = !!trip

  const [formData, setFormData] = useState<CreateTripData>({
    vehicleId: trip?.vehicleId || '',
    driverId: trip?.driverId || '',
    businessId: trip?.businessId || '',
    startMileage: trip?.startMileage || 0,
    endMileage: trip?.endMileage || undefined,
    tripPurpose: trip?.tripPurpose || '',
    tripType: trip?.tripType || 'BUSINESS',
    startLocation: trip?.startLocation || '',
    endLocation: trip?.endLocation || '',
    startTime: trip?.startTime ? new Date(trip.startTime).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    endTime: trip?.endTime ? new Date(trip.endTime).toISOString().slice(0, 16) : '',
    notes: trip?.notes || ''
  })

  const [expenses, setExpenses] = useState<TripExpenseItem[]>(
    trip?.expenses?.map(exp => ({
      expenseType: exp.expenseType as TripExpenseItem['expenseType'],
      amount: Number(exp.amount) || 0,
      currency: exp.currency || 'USD',
      isBusinessDeductible: exp.isBusinessDeductible,
      description: exp.description || '',
      vendorName: exp.vendorName || '',
      fuelQuantity: exp.fuelQuantity ? Number(exp.fuelQuantity) : undefined,
      fuelType: exp.fuelType as TripExpenseItem['fuelType'] | undefined,
      receiptUrl: exp.receiptUrl || ''
    } as TripExpenseItem)) || []
  )

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

  // Expense management functions
  const addExpense = (category: TripExpenseCategory) => {
    const newExpense: TripExpenseItem = {
      expenseType: category.type,
      amount: 0,
      currency: 'USD',
      isBusinessDeductible: category.isBusinessDeductible || false,
      description: '',
      vendorName: ''
    }
    setExpenses([...expenses, newExpense])
  }

  const updateExpense = (index: number, expense: TripExpenseItem) => {
    const newExpenses = [...expenses]
    newExpenses[index] = expense
    setExpenses(newExpenses)
  }

  const removeExpense = (index: number) => {
    const newExpenses = expenses.filter((_, i) => i !== index)
    setExpenses(newExpenses)
  }

  const calculateTotalExpenses = () => {
    return expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const payload = {
        ...formData,
        expenses: expenses.length > 0 ? expenses : undefined
      }

      if (isEditMode && trip) {
        // Update existing trip
        const result = await fetchWithValidation('/api/vehicles/trips', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, id: trip.id })
        })
        toast.push('Trip updated successfully')
      } else {
        // Create new trip
        const result = await fetchWithValidation('/api/vehicles/trips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        toast.push('Trip logged successfully')
      }
      if (onSuccess) onSuccess()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      try { toast.push(message) } catch (e) { }
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
        <h2 className="text-xl font-semibold text-primary">{isEditMode ? 'Edit Trip' : 'Log New Trip'}</h2>
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
              value={formData.vehicleId || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary disabled:bg-gray-100 dark:disabled:bg-gray-600 transition-colors"
            >
              <option value="">Select a vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {`${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`}
                </option>
              ))}
            </select>
            {/* Show selected vehicle details */}
            {selectedVehicle && formData.vehicleId && (
              <p className="text-xs text-secondary mt-1">
                Selected: {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.licensePlate})
              </p>
            )}
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

        {/* Expenses Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-md font-semibold text-primary">Trip Expenses</h3>
              {expenses.length > 0 && (
                <span className="text-sm text-secondary">
                  ({expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'})
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowExpenses(!showExpenses)}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              {showExpenses ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          {/* Expense Summary - Always Visible */}
          {expenses.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Total Expenses:</span>
                <span className="font-medium text-primary">${calculateTotalExpenses().toFixed(2)}</span>
              </div>
            </div>
          )}

          {showExpenses && (
            <div className="space-y-4">
              {/* Existing Expenses */}
              {expenses.map((expense, index) => {
                const category = TRIP_EXPENSE_CATEGORIES.find(c => c.type === expense.expenseType) || {
                  type: expense.expenseType,
                  label: expense.expenseType,
                  icon: '💰',
                  description: '',
                  isBusinessDeductible: expense.isBusinessDeductible
                } as TripExpenseCategory

                return (
                  <ExpenseInput
                    key={index}
                    category={category}
                    expense={expense}
                    onChange={(updatedExpense) => updateExpense(index, updatedExpense)}
                    onRemove={() => removeExpense(index)}
                    currency="USD"
                  />
                )
              })}

              {/* Add Expense Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {TRIP_EXPENSE_CATEGORIES.map((category) => (
                  <button
                    key={category.type}
                    type="button"
                    onClick={() => addExpense(category)}
                    className="flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span>{category.icon}</span>
                    <span className="text-secondary">{category.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
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
            {isSubmitting ? (isEditMode ? 'Updating Trip...' : 'Logging Trip...') : (isEditMode ? 'Update Trip' : 'Log Trip')}
          </button>
        </div>
      </form>
    </div>
  )
}