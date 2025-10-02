'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useDriverVehicles } from '@/hooks/use-driver-vehicles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Car,
  Calendar,
  Gauge,
  Wrench,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Receipt
} from 'lucide-react'
import { MaintenanceServiceInput } from './maintenance-service-input'
import { AddMaintenanceServiceButton } from './add-maintenance-service-button'
import { MaintenanceServiceItem, CreateMaintenanceWithServicesData, MAINTENANCE_SERVICE_CATEGORIES } from '@/types/maintenance-services'

interface AuthorizedVehicle {
  id: string
  licensePlate: string
  make: string
  model: string
  year: number
  currentMileage: number
}

interface DriverMaintenanceFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function DriverMaintenanceForm({
  onSuccess,
  onCancel
}: DriverMaintenanceFormProps) {
  const { data: session } = useSession()
  const { vehicles: authorizedVehicles, loading: vehiclesLoading, error: vehiclesError } = useDriverVehicles()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [servicesExpanded, setServicesExpanded] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Form data
  const [formData, setFormData] = useState({
    vehicleId: '',
    serviceDate: new Date().toISOString().split('T')[0],
    mileageAtService: '',
    notes: ''
  })

  const [services, setServices] = useState<MaintenanceServiceItem[]>([])

  // Handle vehicles error
  useEffect(() => {
    if (vehiclesError) {
      setError(vehiclesError)
    }
  }, [vehiclesError])

  const handleAddService = (service: MaintenanceServiceItem) => {
    setServices(prev => [...prev, service])
    if (!servicesExpanded) {
      setServicesExpanded(true)
    }
  }

  const handleUpdateService = (serviceId: string, updatedService: MaintenanceServiceItem) => {
    setServices(prev => prev.map(service =>
      service.id === serviceId ? updatedService : service
    ))
  }

  const handleRemoveService = (serviceId: string) => {
    setServices(prev => prev.filter(service => service.id !== serviceId))
  }

  const calculateTotalCost = () => {
    return services.reduce((total, service) => {
      const serviceCost = service.cost || 0
      const expensesCost = service.expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0
      return total + serviceCost + expensesCost
    }, 0)
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    let hasErrors = false

    // Clear previous field errors
    setFieldErrors({})
    setError('')

    // Vehicle validation
    if (!formData.vehicleId) {
      errors.vehicleId = 'Please select a vehicle'
      hasErrors = true
    }

    // Service date validation
    if (!formData.serviceDate) {
      errors.serviceDate = 'Please select service date'
      hasErrors = true
    }

    // Services validation
    if (services.length === 0) {
      errors.services = 'Please add at least one maintenance service'
      hasErrors = true
    }

    // Validate mileage if provided
    if (formData.mileageAtService) {
      const mileage = parseInt(formData.mileageAtService)
      if (isNaN(mileage) || mileage < 0) {
        errors.mileageAtService = 'Please enter a valid mileage value'
        hasErrors = true
      } else {
        // Only validate against current mileage for current/future dates
        const serviceDate = new Date(formData.serviceDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0) // Reset time to start of day for fair comparison
        serviceDate.setHours(0, 0, 0, 0)

        if (serviceDate >= today) {
          // For current or future dates, mileage shouldn't be less than current
          const selectedVehicle = authorizedVehicles.find(v => v.id === formData.vehicleId)
          if (selectedVehicle && mileage < selectedVehicle.currentMileage) {
            errors.mileageAtService = `For current/future dates, service mileage cannot be less than current vehicle mileage (${selectedVehicle.currentMileage.toLocaleString()})`
            hasErrors = true
          }
        }
      }
    }

    // Validate each service with service-specific errors
    const serviceErrors: string[] = []
    services.forEach((service, index) => {
      if (!service.serviceName) {
        serviceErrors.push(`Service ${index + 1}: Please specify the service name`)
        hasErrors = true
      }

      // If Custom Service is selected, require description
      if (service.serviceName === 'Custom Service' && !service.description?.trim()) {
        serviceErrors.push(`Service ${index + 1}: Please provide a description for custom services`)
        hasErrors = true
      }

      // If Other provider is selected, require description
      if (service.serviceProvider === 'Other' && !service.description?.trim()) {
        serviceErrors.push(`Service ${index + 1}: Please specify the service provider details`)
        hasErrors = true
      }

      if (service.cost <= 0) {
        serviceErrors.push(`Service ${index + 1}: Please enter a valid cost`)
        hasErrors = true
      }

      // Validate expenses if any
      if (service.expenses && service.expenses.length > 0) {
        service.expenses.forEach((expense, expIndex) => {
          if (!expense.expenseType) {
            serviceErrors.push(`Service ${index + 1}, Expense ${expIndex + 1}: Please select expense type`)
            hasErrors = true
          }
          if (expense.amount <= 0) {
            serviceErrors.push(`Service ${index + 1}, Expense ${expIndex + 1}: Please enter a valid amount`)
            hasErrors = true
          }
        })
      }
    })

    if (serviceErrors.length > 0) {
      errors.services = serviceErrors.join('\n')
    }

    if (hasErrors) {
      setFieldErrors(errors)
      // Set a general error message that combines all issues
      const errorMessages = Object.values(errors)
      setError(`Please fix the following issues:\n${errorMessages.join('\n')}`)
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const payload: CreateMaintenanceWithServicesData = {
        vehicleId: formData.vehicleId,
        serviceDate: formData.serviceDate,
        mileageAtService: formData.mileageAtService ? parseInt(formData.mileageAtService) : undefined,
        notes: formData.notes || undefined,
        services: services
      }

      const response = await fetch('/api/driver/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(`Maintenance record created successfully with ${services.length} service${services.length !== 1 ? 's' : ''}`)

        // Reset form
        setFormData({
          vehicleId: '',
          serviceDate: new Date().toISOString().split('T')[0],
          mileageAtService: '',
          notes: ''
        })
        setServices([])
        setServicesExpanded(false)

        if (onSuccess) {
          setTimeout(onSuccess, 1500)
        }
      } else {
        setError(data.error || 'Failed to create maintenance record')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Error creating maintenance record:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectedVehicle = authorizedVehicles.find(v => v.id === formData.vehicleId)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wrench className="h-5 w-5" />
            <span>Record Vehicle Maintenance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Vehicle Selection */}
            <div className="space-y-2">
              <Label htmlFor="vehicle" className="text-sm font-medium flex items-center space-x-1">
                <Car className="h-4 w-4" />
                <span>Select Vehicle *</span>
              </Label>
              {vehiclesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading authorized vehicles...</span>
                </div>
              ) : (
                <Select
                  value={formData.vehicleId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, vehicleId: value }))}
                >
                  <SelectTrigger className={fieldErrors.vehicleId ? 'border-red-500 focus:ring-red-500' : ''}>
                    <SelectValue placeholder="Choose a vehicle you're authorized to drive" />
                  </SelectTrigger>
                  <SelectContent>
                    {authorizedVehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{vehicle.licensePlate}</span>
                          <span className="text-secondary">
                            {vehicle.make} {vehicle.model} ({vehicle.year})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {selectedVehicle && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span>Current Mileage:</span>
                    <Badge variant="secondary">
                      {selectedVehicle.currentMileage.toLocaleString()} km
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            {/* Service Date */}
            <div className="space-y-2">
              <Label htmlFor="serviceDate" className="text-sm font-medium flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Service Date *</span>
              </Label>
              <Input
                id="serviceDate"
                type="date"
                value={formData.serviceDate}
                onChange={(e) => setFormData(prev => ({ ...prev, serviceDate: e.target.value }))}
                max={new Date().toISOString().split('T')[0]}
                className={fieldErrors.serviceDate ? 'border-red-500 focus:ring-red-500' : ''}
                required
              />
              {fieldErrors.serviceDate && (
                <p className="text-sm text-red-600 mt-1">{fieldErrors.serviceDate}</p>
              )}
            </div>

            {/* Mileage at Service */}
            <div className="space-y-2">
              <Label htmlFor="mileageAtService" className="text-sm font-medium flex items-center space-x-1">
                <Gauge className="h-4 w-4" />
                <span>Mileage at Service</span>
              </Label>
              <Input
                id="mileageAtService"
                type="number"
                min="0"
                value={formData.mileageAtService}
                onChange={(e) => setFormData(prev => ({ ...prev, mileageAtService: e.target.value }))}
                placeholder={selectedVehicle ? `Current: ${selectedVehicle.currentMileage.toLocaleString()} km` : 'Enter mileage'}
                className={fieldErrors.mileageAtService ? 'border-red-500 focus:ring-red-500' : ''}
              />
              {fieldErrors.mileageAtService && (
                <p className="text-sm text-red-600 mt-1">{fieldErrors.mileageAtService}</p>
              )}
              <p className="text-xs text-secondary">
                Optional: Record the vehicle's mileage when service was performed. For historical records, any reasonable mileage is accepted.
              </p>
            </div>

            {/* Maintenance Services */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center space-x-1">
                  <Receipt className="h-4 w-4" />
                  <span>Maintenance Services *</span>
                  {services.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {services.length} service{services.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </Label>
                {services.length > 0 && (
                  <div className="flex items-center space-x-2 text-sm">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium">
                      Total: ${calculateTotalCost().toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <AddMaintenanceServiceButton
                onAddService={handleAddService}
                currency="USD"
              />

              {services.length > 0 && (
                <Collapsible open={servicesExpanded} onOpenChange={setServicesExpanded}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span>Maintenance Services ({services.length})</span>
                      {servicesExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 mt-4">
                    {services.map((service) => {
                      const category = MAINTENANCE_SERVICE_CATEGORIES.find(
                        cat => cat.type === service.serviceType && cat.label.includes(service.serviceName.split(' ')[0])
                      ) || MAINTENANCE_SERVICE_CATEGORIES.find(cat => cat.type === service.serviceType) || MAINTENANCE_SERVICE_CATEGORIES[0]

                      return (
                        <MaintenanceServiceInput
                          key={service.id}
                          category={category}
                          service={service}
                          onChange={(updated) => handleUpdateService(service.id, updated)}
                          onRemove={() => handleRemoveService(service.id)}
                          currency="USD"
                        />
                      )
                    })}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">
                Additional Notes
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional details about the maintenance services..."
                rows={3}
              />
            </div>

            {/* Error/Success Messages */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 text-green-800 dark:border-green-800 dark:text-green-200">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button
                type="submit"
                disabled={loading || services.length === 0}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Recording Maintenance...
                  </>
                ) : (
                  <>
                    <Wrench className="h-4 w-4 mr-2" />
                    Record Maintenance ({services.length} service{services.length !== 1 ? 's' : ''})
                  </>
                )}
              </Button>

              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}