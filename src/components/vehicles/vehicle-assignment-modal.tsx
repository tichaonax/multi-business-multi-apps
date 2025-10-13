'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useToastContext } from '@/components/ui/toast'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { X, Plus, Trash2, Car, Calendar, Shield, AlertCircle } from 'lucide-react'
import { DateInput } from '@/components/ui/date-input'
import { VehicleDriver } from '@/types/vehicle'

interface Vehicle {
  id: string
  licensePlate: string
  make: string
  model: string
  year: number
  vin: string
  isActive: boolean
}

interface VehicleAssignment {
  vehicleId: string
  vehicle?: Vehicle
  authorizationLevel: 'BASIC' | 'ADVANCED' | 'EMERGENCY'
  expiryDate?: string
  notes?: string
}

interface VehicleAssignmentModalProps {
  driver: VehicleDriver | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function VehicleAssignmentModal({ driver, isOpen, onClose, onSuccess }: VehicleAssignmentModalProps) {
  const { data: session } = useSession()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [existingAssignments, setExistingAssignments] = useState<VehicleAssignment[]>([])
  const [newAssignments, setNewAssignments] = useState<VehicleAssignment[]>([])
  const [toRemove, setToRemove] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen && driver) {
      loadData()
    }
  }, [isOpen, driver])

  const loadData = async () => {
    if (!driver) return

    setLoading(true)
    setError('')

    try {
      // Load all vehicles
      const vehiclesResponse = await fetch('/api/vehicles?limit=1000')
      if (!vehiclesResponse.ok) throw new Error('Failed to load vehicles')
      const vehiclesData = await vehiclesResponse.json()
      const vehiclesList = vehiclesData.success ? vehiclesData.data : vehiclesData
      setVehicles(vehiclesList || [])

      // Load existing driver authorizations
      const authResponse = await fetch(`/api/vehicles/driver-authorizations?driverId=${driver.id}`)
      if (!authResponse.ok) throw new Error('Failed to load driver authorizations')
      const authData = await authResponse.json()

      if (authData.success && authData.data) {
        const assignments = authData.data.map((auth: any) => ({
          vehicleId: auth.vehicleId,
          vehicle: vehiclesList.find((v: Vehicle) => v.id === auth.vehicleId),
          authorizationLevel: auth.authorizationLevel,
          expiryDate: auth.expiryDate,
          notes: auth.notes
        }))
        setExistingAssignments(assignments)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const addNewAssignment = () => {
    const unassignedVehicles = vehicles.filter(v =>
      !existingAssignments.some(a => a.vehicleId === v.id) &&
      !newAssignments.some(a => a.vehicleId === v.id)
    )

    if (unassignedVehicles.length === 0) {
      setError('All vehicles are already assigned to this driver')
      return
    }

    setNewAssignments([...newAssignments, {
      vehicleId: unassignedVehicles[0].id,
      vehicle: unassignedVehicles[0],
      authorizationLevel: 'BASIC',
      expiryDate: '',
      notes: ''
    }])
  }

  const updateNewAssignment = (index: number, field: keyof VehicleAssignment, value: any) => {
    const updated = [...newAssignments]
    updated[index] = { ...updated[index], [field]: value }

    if (field === 'vehicleId') {
      updated[index].vehicle = vehicles.find(v => v.id === value)
    }

    setNewAssignments(updated)
  }

  const removeNewAssignment = (index: number) => {
    setNewAssignments(newAssignments.filter((_, i) => i !== index))
  }

  const markForRemoval = (vehicleId: string) => {
    setToRemove([...toRemove, vehicleId])
  }

  const unmarkForRemoval = (vehicleId: string) => {
    setToRemove(toRemove.filter(id => id !== vehicleId))
  }

  const handleSave = async () => {
    if (!driver) return

    setSaving(true)
    setError('')

    try {
      // Remove marked assignments
      for (const vehicleId of toRemove) {
        const response = await fetch('/api/vehicles/driver-authorizations', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driverId: driver.id, vehicleId })
        })

        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          throw new Error(err.error || 'Failed to remove vehicle assignment')
        }
      }

      // Add new assignments
      for (const assignment of newAssignments) {
        const response = await fetch('/api/vehicles/driver-authorizations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driverId: driver.id,
            vehicleId: assignment.vehicleId,
            authorizedBy: session?.users?.id || '',
            authorizedDate: new Date().toISOString(),
            expiryDate: assignment.expiryDate || null,
            authorizationLevel: assignment.authorizationLevel,
            notes: assignment.notes || null
          })
        })

        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          throw new Error(err.error || 'Failed to create vehicle assignment')
        }
      }

      onSuccess()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save assignments'
      setError(message)
      try { useToastContext().push(message) } catch (e) { }
    } finally {
      setSaving(false)
    }
  }

  const resetModal = () => {
    setNewAssignments([])
    setToRemove([])
    setError('')
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  if (!isOpen || !driver) return null

  const availableVehicles = vehicles.filter(v =>
    !existingAssignments.some(a => a.vehicleId === v.id) &&
    !newAssignments.some(a => a.vehicleId === v.id)
  )

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-25 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Car className="h-6 w-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-primary">Vehicle Assignments</h2>
                <p className="text-sm text-secondary">Manage vehicle access for {driver.fullName}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-sm text-secondary mt-2">Loading assignments...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-red-700 dark:text-red-400 text-sm">{error}</span>
                    </div>
                  </div>
                )}

                {/* Current Assignments */}
                <div>
                  <h3 className="text-lg font-medium text-primary mb-4">Current Vehicle Assignments</h3>
                  {existingAssignments.length === 0 ? (
                    <p className="text-secondary text-sm">No vehicles currently assigned</p>
                  ) : (
                    <div className="space-y-3">
                      {existingAssignments.map((assignment) => (
                        <div
                          key={assignment.vehicleId}
                          className={`border rounded-lg p-4 transition-all ${
                            toRemove.includes(assignment.vehicleId)
                              ? 'border-red-300 bg-red-50 dark:bg-red-900/20 opacity-50'
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-medium text-primary">
                                  {assignment.vehicle?.licensePlate} - {assignment.vehicle?.make} {assignment.vehicle?.model}
                                </h4>
                                <span className={`px-2 py-1 text-xs rounded ${
                                  assignment.authorizationLevel === 'EMERGENCY'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                    : assignment.authorizationLevel === 'ADVANCED'
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                }`}>
                                  <Shield className="h-3 w-3 inline mr-1" />
                                  {assignment.authorizationLevel}
                                </span>
                              </div>
                              {assignment.expiryDate && (
                                <div className="text-sm text-secondary">
                                  <Calendar className="h-4 w-4 inline mr-1" />
                                  Expires: {new Date(assignment.expiryDate).toLocaleDateString()}
                                </div>
                              )}
                              {assignment.notes && (
                                <div className="text-sm text-secondary mt-1">
                                  Note: {assignment.notes}
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              {toRemove.includes(assignment.vehicleId) ? (
                                <button
                                  onClick={() => unmarkForRemoval(assignment.vehicleId)}
                                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                >
                                  Undo
                                </button>
                              ) : (
                                <button
                                  onClick={() => markForRemoval(assignment.vehicleId)}
                                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                                >
                                  <Trash2 className="h-4 w-4 inline mr-1" />
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* New Assignments */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-primary">Add Vehicle Assignments</h3>
                    <button
                      onClick={addNewAssignment}
                      disabled={availableVehicles.length === 0}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Vehicle
                    </button>
                  </div>

                  {newAssignments.length === 0 ? (
                    <p className="text-secondary text-sm">Click "Add Vehicle" to assign additional vehicles</p>
                  ) : (
                    <div className="space-y-4">
                      {newAssignments.map((assignment, index) => (
                        <div key={index} className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-secondary mb-1">Vehicle</label>
                              <select
                                value={assignment.vehicleId}
                                onChange={(e) => updateNewAssignment(index, 'vehicleId', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                {[assignment.vehicle, ...availableVehicles].filter(Boolean).map((vehicle) => (
                                  <option key={vehicle!.id} value={vehicle!.id}>
                                    {vehicle!.licensePlate} - {vehicle!.make} {vehicle!.model} ({vehicle!.year})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-secondary mb-1">Authorization Level</label>
                              <select
                                value={assignment.authorizationLevel}
                                onChange={(e) => updateNewAssignment(index, 'authorizationLevel', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="BASIC">Basic</option>
                                <option value="ADVANCED">Advanced</option>
                                <option value="EMERGENCY">Emergency</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-secondary mb-1">Expiry Date (Optional)</label>
                              <DateInput
                                value={assignment.expiryDate || ''}
                                onChange={(value) => updateNewAssignment(index, 'expiryDate', value)}
                                className="w-full"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-secondary mb-1">Notes (Optional)</label>
                              <input
                                type="text"
                                value={assignment.notes || ''}
                                onChange={(e) => updateNewAssignment(index, 'notes', e.target.value)}
                                placeholder="Assignment notes..."
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          </div>

                          <div className="mt-3 flex justify-end">
                            <button
                              onClick={() => removeNewAssignment(index)}
                              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                              <Trash2 className="h-4 w-4 inline mr-1" />
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}