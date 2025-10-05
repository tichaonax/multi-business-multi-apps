'use client'

import { useState, useEffect } from 'react'
import { useConfirm } from '@/components/ui/confirm-modal'
import { useToastContext } from '@/components/ui/toast'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { useSession } from 'next-auth/react'
import { Vehicle, VehicleLicense } from '@/types/vehicle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { hasUserPermission } from '@/lib/permission-utils'
import { formatDateByFormat } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'
import { LicenseStatusIndicator } from './license-status-indicator'
import { LicenseFormModal } from './license-form-modal'
import {
  X,
  Car,
  Calendar,
  Settings,
  Save,
  AlertCircle,
  CheckCircle,
  Edit,
  Gauge,
  FileText,
  Plus,
  Pencil,
  Trash2
} from 'lucide-react'

interface VehicleDetailModalProps {
  vehicle: Vehicle
  onClose: () => void
  onUpdate?: (updatedVehicle: Vehicle) => void
}

export function VehicleDetailModal({ vehicle, onClose, onUpdate }: VehicleDetailModalProps) {
  const { data: session } = useSession()
  const { format: globalDateFormat } = useDateFormat()
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showLicenseModal, setShowLicenseModal] = useState(false)
  const [editingLicense, setEditingLicense] = useState<VehicleLicense | undefined>()
  const [vehicleData, setVehicleData] = useState(vehicle)
  const [selectedLicenseIds, setSelectedLicenseIds] = useState<string[]>([])
  const [showAllLicenses, setShowAllLicenses] = useState(false)

  const [formData, setFormData] = useState({
    licensePlate: vehicle.licensePlate,
    vin: vehicle.vin,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year.toString(),
    color: vehicle.color || '',
    weight: vehicle.weight?.toString() || '',
    driveType: vehicle.driveType,
    ownershipType: vehicle.ownershipType,
    currentMileage: vehicle.currentMileage.toString(),
    mileageUnit: vehicle.mileageUnit,
    purchasePrice: vehicle.purchasePrice?.toString() || '',
    notes: vehicle.notes || '',
    isActive: vehicle.isActive
  })

  const canEdit = session?.user && (
    hasUserPermission(session.user, 'isSystemAdmin') ||
    hasUserPermission(session.user, 'canManageVehicles')
  )

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
    setSuccess('')
  }

  const handleSave = async () => {
    setIsSubmitting(true)
    setError('')

    try {
      const updatePayload = {
        id: vehicle.id,
        licensePlate: formData.licensePlate.trim(),
        vin: formData.vin.trim(),
        make: formData.make.trim(),
        model: formData.model.trim(),
        year: parseInt(formData.year),
        color: formData.color.trim() || undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        driveType: formData.driveType,
        ownershipType: formData.ownershipType,
        currentMileage: parseInt(formData.currentMileage),
        mileageUnit: formData.mileageUnit,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
        notes: formData.notes.trim() || undefined,
        isActive: formData.isActive
      }

      const toast = useToastContext()
      const result = await fetchWithValidation('/api/vehicles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      })

      setSuccess('Vehicle updated successfully!')
      toast.push('Vehicle updated successfully')
      setIsEditing(false)

      // Update the vehicle data
      const updatedVehicle = { ...vehicle, ...updatePayload }
      onUpdate?.(updatedVehicle)

      setTimeout(() => {
        setSuccess('')
      }, 3000)

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update vehicle'
      setError(message)
      try { useToastContext().push(message) } catch (e) { }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    // Reset form data to original values
    setFormData({
      licensePlate: vehicle.licensePlate,
      vin: vehicle.vin,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year.toString(),
      color: vehicle.color || '',
      weight: vehicle.weight?.toString() || '',
      driveType: vehicle.driveType,
      ownershipType: vehicle.ownershipType,
      currentMileage: vehicle.currentMileage.toString(),
      mileageUnit: vehicle.mileageUnit,
      purchasePrice: vehicle.purchasePrice?.toString() || '',
      notes: vehicle.notes || '',
      isActive: vehicle.isActive
    })
    setIsEditing(false)
    setError('')
    setSuccess('')
  }

  const refreshVehicleData = async () => {
    try {
      const response = await fetch(`/api/vehicles?id=${vehicle.id}&includeLicenses=true`)
      const result = await response.json()

      if (response.ok && result.success && result.data.length > 0) {
        const updatedVehicle = result.data[0]
        setVehicleData(updatedVehicle)
        onUpdate?.(updatedVehicle)
      }
    } catch (err) {
      console.error('Failed to refresh vehicle data:', err)
    }
  }

  const handleLicenseSave = async () => {
    await refreshVehicleData()
    setShowLicenseModal(false)
    setEditingLicense(undefined)
    setSuccess('License saved successfully!')
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleEditLicense = (license: VehicleLicense) => {
    setEditingLicense(license)
    setShowLicenseModal(true)
  }

  const handleDeleteLicense = async (licenseId: string) => {
    const ok = await confirm({
      title: 'Delete license',
      description: 'Are you sure you want to delete this license? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })

    if (!ok) return

    try {
      const response = await fetch(`/api/vehicles/licenses?id=${licenseId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete license')
      }

      await refreshVehicleData()
      setSuccess('License deleted successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete license')
      toast.push(err instanceof Error ? err.message : 'Failed to delete license')
    }
  }

  const handleBulkDeleteLicenses = async () => {
    if (selectedLicenseIds.length === 0) {
      setError('Please select licenses to delete')
      return
    }

    const ok = await confirm({
      title: `Delete ${selectedLicenseIds.length} license(s)?`,
      description: `Are you sure you want to delete ${selectedLicenseIds.length} selected license(s)? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })

    if (!ok) return

    try {
      // Bulk delete in a single request
      const response = await fetch(`/api/vehicles/licenses`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedLicenseIds, vehicleId: vehicle.id })
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || 'Failed to delete selected licenses')
      }

      await refreshVehicleData()
      setSelectedLicenseIds([])
      setSuccess(`${selectedLicenseIds.length} license(s) deleted successfully!`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete selected licenses')
      toast.push(err instanceof Error ? err.message : 'Failed to delete selected licenses')
    }
  }

  const confirm = useConfirm()
  const toast = useToastContext()

  const toggleLicenseSelection = (licenseId: string) => {
    setSelectedLicenseIds(prev =>
      prev.includes(licenseId)
        ? prev.filter(id => id !== licenseId)
        : [...prev, licenseId]
    )
  }

  const toggleSelectAll = () => {
    const allLicenseIds = getDisplayedLicenses().map(license => license.id)
    if (selectedLicenseIds.length === allLicenseIds.length) {
      setSelectedLicenseIds([])
    } else {
      setSelectedLicenseIds(allLicenseIds)
    }
  }

  // Function to get licenses to display (latest 2 of each type unless showing all)
  const getDisplayedLicenses = () => {
    if (!vehicleData.vehicleLicenses) return []

    if (showAllLicenses) {
      return vehicleData.vehicleLicenses.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    }

    // Group by license type and get latest 2 of each
    const licensesByType = vehicleData.vehicleLicenses.reduce((acc, license) => {
      if (!acc[license.licenseType]) {
        acc[license.licenseType] = []
      }
      acc[license.licenseType].push(license)
      return acc
    }, {} as Record<string, typeof vehicleData.vehicleLicenses>)

    const result: typeof vehicleData.vehicleLicenses = []
    Object.values(licensesByType).forEach(licenses => {
      const sortedLicenses = licenses.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      result.push(...sortedLicenses.slice(0, 2))
    })

    return result.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  // Function to get latest license of each type for overview (prioritizing unexpired)
  const getLatestLicensesByType = () => {
    if (!vehicleData.vehicleLicenses) return []

    const licensesByType = vehicleData.vehicleLicenses.reduce((acc, license) => {
      const licenseType = license.licenseType

      if (!acc[licenseType]) {
        acc[licenseType] = license
      } else {
        const current = acc[licenseType]
        const currentStatus = getLicenseStatus(current)
        const newStatus = getLicenseStatus(license)

        const isCurrentExpired = currentStatus === 'expired'
        const isNewExpired = newStatus === 'expired'

        if (isCurrentExpired && !isNewExpired) {
          // Replace expired with unexpired
          acc[licenseType] = license
        } else if (isCurrentExpired === isNewExpired) {
          // Both same expiry status, choose the one with later expiry date
          const currentExpiry = new Date(current.expiryDate)
          const newExpiry = new Date(license.expiryDate)
          if (newExpiry > currentExpiry) {
            acc[licenseType] = license
          }
        }
        // If current is unexpired and new is expired, keep current
      }

      return acc
    }, {} as Record<string, typeof vehicleData.vehicleLicenses[0]>)

    return Object.values(licensesByType).sort((a, b) => a.licenseType.localeCompare(b.licenseType))
  }

  // License status calculation
  const getLicenseStatus = (license: VehicleLicense) => {
    const now = new Date()
    const expiryDate = new Date(license.expiryDate)
    const daysDiff = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff < 0) return 'expired'
    if (daysDiff <= 7) return 'expiring'
    if (daysDiff <= 30) return 'warning'
    return 'valid'
  }

  // License status styling
  const getLicenseStatusStyle = (status: string) => {
    switch (status) {
      case 'expired':
        return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
      case 'expiring':
        return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
      case 'warning':
        return 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-300'
      case 'valid':
        return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-900/20 dark:border-gray-800 dark:text-gray-300'
    }
  }

  // License status icon
  const getLicenseStatusIcon = (status: string) => {
    switch (status) {
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'expiring':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-orange-600" />
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  // Status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'expired': return 'Expired'
      case 'expiring': return 'Expiring Soon'
      case 'warning': return 'Due Soon'
      case 'valid': return 'Valid'
      default: return 'Unknown'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Car className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-primary">
                {vehicle.make} {vehicle.model} ({vehicle.year})
              </h2>
              <p className="text-sm text-secondary">{vehicle.licensePlate}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {canEdit && !isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-1"
              >
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="flex items-center space-x-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Messages */}
          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-2 text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {/* Vehicle Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-primary flex items-center space-x-2">
                <Car className="h-5 w-5" />
                <span>Basic Information</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="licensePlate">License Plate</Label>
                  {isEditing ? (
                    <Input
                      id="licensePlate"
                      value={formData.licensePlate}
                      onChange={(e) => handleInputChange('licensePlate', e.target.value)}
                      placeholder="Enter license plate"
                    />
                  ) : (
                    <p className="text-sm text-secondary bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      {vehicle.licensePlate}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="vin">VIN</Label>
                  {isEditing ? (
                    <Input
                      id="vin"
                      value={formData.vin}
                      onChange={(e) => handleInputChange('vin', e.target.value)}
                      placeholder="Enter VIN"
                    />
                  ) : (
                    <p className="text-sm text-secondary bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      {vehicle.vin}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="make">Make</Label>
                    {isEditing ? (
                      <Input
                        id="make"
                        value={formData.make}
                        onChange={(e) => handleInputChange('make', e.target.value)}
                        placeholder="e.g., Toyota"
                      />
                    ) : (
                      <p className="text-sm text-secondary bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        {vehicle.make}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="model">Model</Label>
                    {isEditing ? (
                      <Input
                        id="model"
                        value={formData.model}
                        onChange={(e) => handleInputChange('model', e.target.value)}
                        placeholder="e.g., Camry"
                      />
                    ) : (
                      <p className="text-sm text-secondary bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        {vehicle.model}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="year">Year</Label>
                    {isEditing ? (
                      <Input
                        id="year"
                        type="number"
                        min="1900"
                        max="2030"
                        value={formData.year}
                        onChange={(e) => handleInputChange('year', e.target.value)}
                        placeholder="e.g., 2020"
                      />
                    ) : (
                      <p className="text-sm text-secondary bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        {vehicle.year}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="color">Color</Label>
                    {isEditing ? (
                      <Input
                        id="color"
                        value={formData.color}
                        onChange={(e) => handleInputChange('color', e.target.value)}
                        placeholder="e.g., Blue"
                      />
                    ) : (
                      <p className="text-sm text-secondary bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        {vehicle.color || 'N/A'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-primary flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Vehicle Settings</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="mileageUnit">Mileage Unit</Label>
                  {isEditing ? (
                    <Select
                      value={formData.mileageUnit}
                      onValueChange={(value) => handleInputChange('mileageUnit', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="km">Kilometers (KM)</SelectItem>
                        <SelectItem value="miles">Miles</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-secondary bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      {vehicle.mileageUnit.toUpperCase()} - {vehicle.mileageUnit === 'km' ? 'Kilometers' : 'Miles'}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="currentMileage">Current Mileage</Label>
                  {isEditing ? (
                    <div className="relative">
                      <Input
                        id="currentMileage"
                        type="number"
                        min="0"
                        value={formData.currentMileage}
                        onChange={(e) => handleInputChange('currentMileage', e.target.value)}
                        placeholder="Enter current mileage"
                      />
                      <Gauge className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  ) : (
                    <p className="text-sm text-secondary bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      {vehicle.currentMileage.toLocaleString()} {vehicle.mileageUnit.toUpperCase()}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="driveType">Drive Type</Label>
                  {isEditing ? (
                    <Select
                      value={formData.driveType}
                      onValueChange={(value) => handleInputChange('driveType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LEFT_HAND">Left Hand Drive</SelectItem>
                        <SelectItem value="RIGHT_HAND">Right Hand Drive</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-secondary bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      {vehicle.driveType.replace('_', ' ')}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="ownershipType">Ownership Type</Label>
                  {isEditing ? (
                    <Select
                      value={formData.ownershipType}
                      onValueChange={(value) => handleInputChange('ownershipType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BUSINESS">Business</SelectItem>
                        <SelectItem value="PERSONAL">Personal</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-secondary bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      {vehicle.ownershipType}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  {isEditing ? (
                    <Input
                      id="weight"
                      type="number"
                      min="0"
                      value={formData.weight}
                      onChange={(e) => handleInputChange('weight', e.target.value)}
                      placeholder="Enter weight in kg"
                    />
                  ) : (
                    <p className="text-sm text-secondary bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      {vehicle.weight ? `${vehicle.weight} kg` : 'N/A'}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="purchasePrice">Purchase Price</Label>
                  {isEditing ? (
                    <Input
                      id="purchasePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.purchasePrice}
                      onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                      placeholder="Enter purchase price"
                    />
                  ) : (
                    <p className="text-sm text-secondary bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      {vehicle.purchasePrice ? `$${vehicle.purchasePrice.toLocaleString()}` : 'N/A'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-primary flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Additional Information</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vehicle.business && (
                <div>
                  <Label>Business</Label>
                  <p className="text-sm text-secondary bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    {vehicle.business.name}
                  </p>
                </div>
              )}

              {vehicle.user && (
                <div>
                  <Label>Owner</Label>
                  <p className="text-sm text-secondary bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    {vehicle.user.name}
                  </p>
                </div>
              )}

              {vehicle.purchaseDate && (
                <div>
                  <Label>Purchase Date</Label>
                  <p className="text-sm text-secondary bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    {formatDateByFormat(vehicle.purchaseDate, globalDateFormat)}
                  </p>
                </div>
              )}

              <div>
                <Label>Status</Label>
                <p className="text-sm text-secondary bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {isEditing ? (
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => handleInputChange('isActive', e.target.checked)}
                        className="rounded"
                      />
                      <span>Active</span>
                    </label>
                  ) : (
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      vehicle.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {vehicle.isActive ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              {isEditing ? (
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Enter any additional notes about this vehicle..."
                  rows={3}
                />
              ) : (
                <p className="text-sm text-secondary bg-gray-50 dark:bg-gray-700 p-2 rounded min-h-[80px]">
                  {vehicle.notes || 'No additional notes'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-secondary">
              <div>
                <Label>Created</Label>
                <p className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {formatDateByFormat(vehicle.createdAt, globalDateFormat)}
                </p>
              </div>
              <div>
                <Label>Last Updated</Label>
                <p className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {formatDateByFormat(vehicle.updatedAt, globalDateFormat)}
                </p>
              </div>
            </div>
          </div>

          {/* Vehicle Licenses Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-primary flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Vehicle Licenses</span>
              </h3>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-1"
                  onClick={() => {
                    setEditingLicense(undefined)
                    setShowLicenseModal(true)
                  }}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add License</span>
                </Button>
              )}
            </div>

            {vehicleData.vehicleLicenses && vehicleData.vehicleLicenses.length > 0 ? (
              <div className="space-y-4">
                {/* Overview - Latest License of Each Type */}
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-primary">Current License Status</h5>
                  <div className="space-y-2">
                    {getLatestLicensesByType().map((license) => {
                      const status = getLicenseStatus(license)
                      return (
                        <div key={license.licenseType} className={`flex items-center justify-between p-3 rounded-lg border ${getLicenseStatusStyle(status)}`}>
                          <div className="flex items-center space-x-3">
                            {getLicenseStatusIcon(status)}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium">
                                  {license.licenseType.replace('_', ' ')}
                                </span>
                                <span className="text-sm font-mono bg-white/90 dark:bg-gray-900/70 text-gray-900 dark:text-gray-100 px-2 py-1 rounded">
                                  #{license.licenseNumber}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                Effective: {formatDateByFormat(license.issueDate, globalDateFormat)} • Expires: {formatDateByFormat(license.expiryDate, globalDateFormat)}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs font-medium">
                            {getStatusText(status)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                {canEdit && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-primary">Manage Licenses</h4>
                      <div className="flex items-center space-x-2">
                        {getDisplayedLicenses().length !== vehicleData.vehicleLicenses.length && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAllLicenses(!showAllLicenses)}
                            className="text-xs"
                          >
                            {showAllLicenses ? 'Show Latest Only' : `Show All (${vehicleData.vehicleLicenses.length})`}
                          </Button>
                        )}
                        {selectedLicenseIds.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBulkDeleteLicenses}
                            className="text-xs text-red-600 border-red-300 hover:bg-red-50"
                          >
                            Delete Selected ({selectedLicenseIds.length})
                          </Button>
                        )}
                      </div>
                    </div>

                    {getDisplayedLicenses().length > 1 && (
                      <div className="flex items-center space-x-2 text-xs text-secondary">
                        <input
                          type="checkbox"
                          checked={selectedLicenseIds.length === getDisplayedLicenses().length}
                          onChange={toggleSelectAll}
                          className="rounded"
                        />
                        <span>Select All</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      {getDisplayedLicenses().map((license) => {
                        const status = getLicenseStatus(license)
                        return (
                          <div key={license.id} className={`flex items-center space-x-3 p-3 rounded-lg border ${getLicenseStatusStyle(status)}`}>
                            {getDisplayedLicenses().length > 1 && (
                              <input
                                type="checkbox"
                                checked={selectedLicenseIds.includes(license.id)}
                                onChange={() => toggleLicenseSelection(license.id)}
                                className="rounded"
                              />
                            )}

                            <div className="flex items-center space-x-2">
                              {getLicenseStatusIcon(status)}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3 flex-wrap mb-1">
                                <span className="text-sm font-medium">
                                  {license.licenseType.replace('_', ' ')}
                                </span>
                                <span className="text-sm font-mono bg-white/90 dark:bg-gray-900/70 text-gray-900 dark:text-gray-100 px-2 py-1 rounded font-semibold">
                                  #{license.licenseNumber}
                                </span>
                                <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded">
                                  {getStatusText(status)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-3 flex-wrap text-xs">
                                <span className="font-medium">
                                  Effective: {formatDateByFormat(license.issueDate, globalDateFormat)}
                                </span>
                                <span className="font-medium">
                                  Expires: {formatDateByFormat(license.expiryDate, globalDateFormat)}
                                </span>
                                <span className="opacity-60">
                                  Created: {formatDateByFormat(license.createdAt, globalDateFormat)}
                                </span>
                              </div>
                              {license.issuingAuthority && (
                                <div className="text-xs opacity-80 mt-1 text-secondary">
                                    Issued by: {license.issuingAuthority}
                                  </div>
                              )}
                            </div>

                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditLicense(license)}
                                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                                title="Edit License"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteLicense(license.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-gray-100 dark:hover:bg-red-900/10"
                                title="Delete License"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {!showAllLicenses && getDisplayedLicenses().length < vehicleData.vehicleLicenses.length && (
                      <div className="text-xs text-gray-500 text-center py-2">
                        Showing latest {getDisplayedLicenses().length} of {vehicleData.vehicleLicenses.length} licenses
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">No licenses recorded</p>
                {canEdit && (
                  <p className="text-xs text-gray-400 mt-1">
                    Add registration, radio, or other required licenses
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {isEditing && (
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* License Form Modal */}
        <LicenseFormModal
          vehicleId={vehicle.id}
          license={editingLicense}
          isOpen={showLicenseModal}
          onClose={() => {
            setShowLicenseModal(false)
            setEditingLicense(undefined)
          }}
          onSave={handleLicenseSave}
        />
      </div>
    </div>
  )
}