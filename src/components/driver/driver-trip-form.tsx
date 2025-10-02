'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Car, Clock, MapPin, Loader2, ChevronDown, ChevronUp, Receipt } from 'lucide-react'
import { ExpenseList } from '@/components/driver/expense-input'
import { AddExpenseButton } from '@/components/driver/add-expense-button'
import { TripExpenseItem, CreateTripWithExpensesRequest } from '@/types/trip-expenses'
import { useDriverVehicles } from '@/hooks/use-driver-vehicles'
import { DateInput } from '@/components/ui/date-input'

interface AuthorizedVehicle {
  id: string
  licensePlate: string
  make: string
  model: string
  year: number
  currentMileage: number
  displayName: string
}

interface DriverTripFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function DriverTripForm({ onSuccess, onCancel }: DriverTripFormProps) {
  const { vehicles, loading: loadingVehicles, error: vehiclesError } = useDriverVehicles()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [expenses, setExpenses] = useState<TripExpenseItem[]>([])
  const [showExpenses, setShowExpenses] = useState(false)

  const [formData, setFormData] = useState({
    vehicleId: '',
    startMileage: '',
    endMileage: '',
    tripPurpose: '',
    tripType: 'BUSINESS',
    startLocation: '',
    endLocation: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: new Date().toTimeString().slice(0, 5),
    endDate: '',
    endTime: '',
    notes: ''
  })

  // Handle vehicles error
  useEffect(() => {
    if (vehiclesError) {
      setError(vehiclesError)
    }
  }, [vehiclesError])

  // Update suggested start mileage when vehicle changes
  useEffect(() => {
    if (formData.vehicleId) {
      const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId)
      if (selectedVehicle && selectedVehicle.currentMileage) {
        setFormData(prev => ({
          ...prev,
          startMileage: selectedVehicle.currentMileage.toString()
        }))
      }
    }
  }, [formData.vehicleId, vehicles])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
    setSuccess('')
  }

  const validateForm = () => {
    if (!formData.vehicleId) return 'Please select a vehicle'
    if (!formData.startMileage) return 'Start mileage is required'
    if (!formData.tripPurpose.trim()) return 'Trip purpose is required'
    if (!formData.startDate) return 'Start date is required'
    if (!formData.startTime) return 'Start time is required'

    const startMileage = parseInt(formData.startMileage)
    const endMileage = formData.endMileage ? parseInt(formData.endMileage) : null

    if (isNaN(startMileage) || startMileage < 0) {
      return 'Start mileage must be a valid positive number'
    }

    // Validate start mileage against current vehicle mileage
    const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId)
    if (selectedVehicle && startMileage < selectedVehicle.currentMileage) {
      return `Start mileage (${startMileage.toLocaleString()}) cannot be less than current vehicle mileage (${selectedVehicle.currentMileage.toLocaleString()})`
    }

    if (endMileage !== null && (isNaN(endMileage) || endMileage <= startMileage)) {
      return 'End mileage must be greater than start mileage'
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const payload: CreateTripWithExpensesRequest = {
        vehicleId: formData.vehicleId,
        startMileage: parseInt(formData.startMileage),
        endMileage: formData.endMileage ? parseInt(formData.endMileage) : undefined,
        tripPurpose: formData.tripPurpose.trim(),
        tripType: formData.tripType as 'BUSINESS' | 'PERSONAL' | 'MIXED',
        startLocation: formData.startLocation.trim() || undefined,
        endLocation: formData.endLocation.trim() || undefined,
        startTime: `${formData.startDate}T${formData.startTime}`,
        endTime: (formData.endDate && formData.endTime) ? `${formData.endDate}T${formData.endTime}` : undefined,
        notes: formData.notes.trim() || undefined,
        expenses: expenses
      }

      const response = await fetch('/api/driver/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(`Trip logged successfully${expenses.length > 0 ? ` with ${expenses.length} expenses` : ''}!`)
        // Reset form
        setFormData({
          vehicleId: '',
          startMileage: '',
          endMileage: '',
          tripPurpose: '',
          tripType: 'BUSINESS',
          startLocation: '',
          endLocation: '',
          startDate: new Date().toISOString().split('T')[0],
          startTime: new Date().toTimeString().slice(0, 5),
          endDate: '',
          endTime: '',
          notes: ''
        })
        setExpenses([])
        setShowExpenses(false)
        onSuccess?.()
      } else {
        setError(data.error || 'Failed to log trip')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Error submitting trip:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const calculateTripMileage = () => {
    const start = parseInt(formData.startMileage)
    const end = parseInt(formData.endMileage)
    return (!isNaN(start) && !isNaN(end) && end > start) ? end - start : 0
  }

  if (loadingVehicles) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading authorized vehicles...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Car className="h-5 w-5" />
          <span>Log New Trip</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error/Success Messages */}
          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          {vehicles.length === 0 && (
            <div className="text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg text-sm">
              No authorized vehicles found. Contact your administrator for vehicle access.
            </div>
          )}

          {/* Vehicle Selection */}
          <div className="space-y-2">
            <Label htmlFor="vehicle">Vehicle *</Label>
            <Select
              value={formData.vehicleId}
              onValueChange={(value) => handleInputChange('vehicleId', value)}
              disabled={vehicles.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your authorized vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.displayName} (Current: {vehicle.currentMileage} km)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mileage Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startMileage">Start Mileage *</Label>
              <Input
                id="startMileage"
                type="number"
                min="0"
                value={formData.startMileage}
                onChange={(e) => handleInputChange('startMileage', e.target.value)}
                placeholder="Starting odometer reading"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endMileage">End Mileage (optional)</Label>
              <Input
                id="endMileage"
                type="number"
                min="0"
                value={formData.endMileage}
                onChange={(e) => handleInputChange('endMileage', e.target.value)}
                placeholder="Ending odometer reading"
              />
              {formData.startMileage && formData.endMileage && (
                <p className="text-sm text-green-600">
                  Trip Distance: {calculateTripMileage()} km
                </p>
              )}
            </div>
          </div>

          {/* Trip Details */}
          <div className="space-y-2">
            <Label htmlFor="tripPurpose">Trip Purpose *</Label>
            <Input
              id="tripPurpose"
              value={formData.tripPurpose}
              onChange={(e) => handleInputChange('tripPurpose', e.target.value)}
              placeholder="e.g., Client meeting, Site visit, Delivery"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tripType">Trip Type</Label>
            <Select
              value={formData.tripType}
              onValueChange={(value) => handleInputChange('tripType', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BUSINESS">Business</SelectItem>
                <SelectItem value="PERSONAL">Personal</SelectItem>
                <SelectItem value="MIXED">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startLocation">Start Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="startLocation"
                  value={formData.startLocation}
                  onChange={(e) => handleInputChange('startLocation', e.target.value)}
                  placeholder="Starting point"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endLocation">End Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="endLocation"
                  value={formData.endLocation}
                  onChange={(e) => handleInputChange('endLocation', e.target.value)}
                  placeholder="Destination"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Start Date & Time Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <DateInput
                label="Start Date *"
                value={formData.startDate}
                onChange={(isoDate) => handleInputChange('startDate', isoDate)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* End Date & Time Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <DateInput
                label="End Date (optional)"
                value={formData.endDate}
                onChange={(isoDate) => handleInputChange('endDate', isoDate)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time (optional)</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional trip details..."
              rows={3}
            />
          </div>

          {/* Trip Expenses Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Receipt className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-medium text-primary">
                  Trip Expenses
                  {expenses.length > 0 && (
                    <span className="ml-2 text-sm text-blue-600">
                      ({expenses.length} items)
                    </span>
                  )}
                </h3>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowExpenses(!showExpenses)}
                className="text-blue-600 hover:text-blue-700"
              >
                {showExpenses ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Hide
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    {expenses.length > 0 ? 'Show' : 'Add'} Expenses
                  </>
                )}
              </Button>
            </div>

            {showExpenses && (
              <div className="space-y-4">
                <div className="text-sm text-secondary">
                  Track fuel, tolls, parking, meals and other trip-related expenses.
                </div>

                <AddExpenseButton
                  onAddExpense={(expense) => setExpenses(prev => [...prev, expense])}
                  currency="USD"
                />

                {expenses.length > 0 && (
                  <ExpenseList
                    expenses={expenses}
                    onChange={setExpenses}
                    onAddExpense={(expense) => setExpenses(prev => [...prev, expense])}
                    currency="USD"
                  />
                )}
              </div>
            )}

            {/* Expense Summary (when collapsed but has expenses) */}
            {!showExpenses && expenses.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex justify-between items-center text-sm">
                  <span>{expenses.length} expense{expenses.length !== 1 ? 's' : ''} added</span>
                  <span className="font-medium">
                    ${expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0).toFixed(2)} total
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || vehicles.length === 0}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Logging Trip...
                </>
              ) : (
                'Log Trip'
              )}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}