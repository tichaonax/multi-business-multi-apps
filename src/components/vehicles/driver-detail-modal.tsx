'use client'

import { useState, useEffect } from 'react'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { DriverLicenseInput, formatDriverLicenseValue } from '@/components/ui/driver-license-input'
import { formatPhoneNumberForDisplay, parseDateFromFormat, formatDateByFormat } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'
import { useSession } from 'next-auth/react'
import { VehicleDriver } from '@/types/vehicle'
import { hasPermission, isSystemAdmin, hasUserPermission } from '@/lib/permission-utils'
import { Car, Calendar, Shield } from 'lucide-react'

 interface DriverDetailModalProps {
   driver: VehicleDriver | null
   onClose: () => void
   onUpdate?: (driver: VehicleDriver) => void
 }

 export function DriverDetailModal({ driver, onClose, onUpdate }: DriverDetailModalProps) {
   const { data: session } = useSession()
   const user = session?.user as any

   if (!driver) return null

   // Determine if user can edit drivers: allow system admin or vehicles management permission
   const canEdit = !!user && (isSystemAdmin(user) || hasUserPermission(user, 'canManageDrivers') || hasPermission(user, 'canManageBusinessUsers'))

  const { format: globalDateFormat, defaultCountry } = useDateFormat()

  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [licenseTemplates, setLicenseTemplates] = useState<any[]>([])

  // Vehicle assignments state
  const [vehicleAssignments, setVehicleAssignments] = useState<any[]>([])
  const [loadingAssignments, setLoadingAssignments] = useState(false)

  const [formData, setFormData] = useState<Record<string, string>>({
     fullName: driver.fullName || '',
     licenseNumber: driver.licenseNumber || '',
     // show dates using system/global date format in inputs
     licenseExpiry: driver.licenseExpiry ? formatDateByFormat(driver.licenseExpiry, globalDateFormat) : '',
     phoneNumber: driver.phoneNumber || '',
     emailAddress: driver.emailAddress || '',
     emergencyContact: driver.emergencyContact || '',
     emergencyPhone: driver.emergencyPhone || '',
     dateOfBirth: driver.dateOfBirth ? formatDateByFormat(driver.dateOfBirth, globalDateFormat) : '',
     address: driver.address || ''
   })

  useEffect(() => {
    // Keep form in sync when driver changes or date format changes
    setFormData({
      fullName: driver.fullName || '',
      licenseNumber: driver.licenseNumber || '',
      licenseExpiry: driver.licenseExpiry ? formatDateByFormat(driver.licenseExpiry, globalDateFormat) : '',
      phoneNumber: driver.phoneNumber || '',
      emailAddress: driver.emailAddress || '',
      emergencyContact: driver.emergencyContact || '',
      emergencyPhone: driver.emergencyPhone || '',
      dateOfBirth: driver.dateOfBirth ? formatDateByFormat(driver.dateOfBirth, globalDateFormat) : '',
      address: driver.address || ''
    })
  }, [driver, globalDateFormat])

  // Load vehicle assignments
  const loadVehicleAssignments = async () => {
    if (!driver) return

    setLoadingAssignments(true)
    try {
      const response = await fetch(`/api/vehicles/driver-authorizations?driverId=${driver.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setVehicleAssignments(data.data)
        }
      }
    } catch (error) {
      console.error('Failed to load vehicle assignments:', error)
    } finally {
      setLoadingAssignments(false)
    }
  }

  useEffect(() => {
    // Fetch license templates to enable formatted display using the saved template
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/driver-license-templates?isActive=true')
        if (!res.ok) return
        const data = await res.json()
        if (mounted) setLicenseTemplates(data)
      } catch (e) {
        // ignore
      }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (driver) {
      loadVehicleAssignments()
    }
  }, [driver])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev: Record<string, string>) => ({ ...prev, [name]: value }))
  }

   const handleSave = async () => {
     setSubmitting(true)
     try {
       // Parse dates from the global/system date format back to ISO (YYYY-MM-DD)
       const licenseExpiryISO = parseDateFromFormat(formData.licenseExpiry || '', defaultCountry) || null
       const dateOfBirthISO = parseDateFromFormat(formData.dateOfBirth || '', defaultCountry) || null

       const payload = { id: driver.id, ...formData, licenseExpiry: licenseExpiryISO, dateOfBirth: dateOfBirthISO }
       const res = await fetch('/api/vehicles/drivers', {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(payload)
       })

       const body = await res.json()
       if (!res.ok) throw new Error(body?.error || 'Failed to update driver')

       // Notify parent of update
       if (onUpdate && body?.data) onUpdate(body.data)
       setEditing(false)
     } catch (err: any) {
       alert(err?.message || 'Failed to update driver')
     } finally {
       setSubmitting(false)
     }
   }

   return (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
       <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-xl w-full p-6">
         <div className="flex justify-between items-start mb-4">
           <div>
             <h3 className="text-lg font-semibold text-primary">Driver Details</h3>
             <p className="text-sm text-secondary">{driver.fullName}</p>
           </div>
           <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
         </div>

         {!editing ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-secondary">
             <div>
               <div className="font-medium">License</div>
               <div>{(() => {
                 const tplId = (driver as any).driverLicenseTemplateId
                 const tpl = licenseTemplates.find(t => t.id === tplId)
                 return tpl ? formatDriverLicenseValue(driver.licenseNumber || '', tpl) : driver.licenseNumber
               })()}</div>
             </div>

             <div>
               <div className="font-medium">Expires</div>
               <div>{driver.licenseExpiry ? formatDateByFormat(driver.licenseExpiry, globalDateFormat) : 'N/A'}</div>
             </div>

             <div>
               <div className="font-medium">Phone</div>
               <div>{formatPhoneNumberForDisplay(driver.phoneNumber || '') || 'N/A'}</div>
             </div>

             <div>
               <div className="font-medium">Email</div>
               <div>{driver.emailAddress || 'N/A'}</div>
             </div>

             {driver.address && (
               <div className="sm:col-span-2">
                 <div className="font-medium">Address</div>
                 <div>{driver.address}</div>
               </div>
             )}

            {driver.emergencyContact && (
              <div className="sm:col-span-2">
                <div className="font-medium">Emergency Contact</div>
                <div>{driver.emergencyContact} {driver.emergencyPhone ? `(${formatPhoneNumberForDisplay(driver.emergencyPhone)})` : ''}</div>
              </div>
            )}
           </div>
         ) : (
           <div className="space-y-3">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               <div>
                 <label className="text-xs font-medium">Full Name</label>
                 <input name="fullName" value={formData.fullName} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
               </div>
               <div>
                 <label className="text-xs font-medium">License #</label>
                 <DriverLicenseInput
                   value={formData.licenseNumber}
                   templateId={(driver as any).driverLicenseTemplateId}
                   onChange={(val) => setFormData(prev => ({ ...prev, licenseNumber: val }))}
                   className="w-full"
                 />
               </div>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               <div>
                 <label className="text-xs font-medium">Expires</label>
                 <input name="licenseExpiry" value={formData.licenseExpiry} onChange={handleChange} className="w-full px-2 py-1 border rounded" placeholder={globalDateFormat} />
               </div>
               <div>
                 <PhoneNumberInput
                   value={formData.phoneNumber || ''}
                   onChange={(full) => setFormData(prev => ({ ...prev, phoneNumber: full }))}
                   label="Phone"
                   placeholder="77 123 4567"
                   className="w-full"
                 />
               </div>
             </div>

             <div>
               <label className="text-xs font-medium">Email</label>
               <input name="emailAddress" value={formData.emailAddress} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
             </div>

             <div>
               <label className="text-xs font-medium">Address</label>
               <textarea name="address" value={formData.address} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               <div>
                 <label className="text-xs font-medium">Emergency Contact</label>
                 <input name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
               </div>
               <div>
                 <PhoneNumberInput
                   value={formData.emergencyPhone || ''}
                   onChange={(full) => setFormData(prev => ({ ...prev, emergencyPhone: full }))}
                   label="Emergency Phone"
                   placeholder="77 123 4567"
                   className="w-full"
                 />
               </div>
             </div>
           </div>
         )}

         {/* Vehicle Assignments Section */}
         <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
           <div className="flex items-center gap-2 mb-4">
             <Car className="h-5 w-5 text-blue-600" />
             <h3 className="text-lg font-medium text-primary">Vehicle Assignments</h3>
           </div>

           {loadingAssignments ? (
             <div className="text-center py-4">
               <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
               <p className="text-sm text-secondary mt-2">Loading assignments...</p>
             </div>
           ) : vehicleAssignments.length === 0 ? (
             <p className="text-secondary text-sm">No vehicles assigned to this driver</p>
           ) : (
             <div className="space-y-3">
               {vehicleAssignments.map((assignment: any) => (
                 <div
                   key={`${assignment.driverId}-${assignment.vehicleId}`}
                   className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                 >
                   <div className="flex items-start justify-between">
                     <div className="flex-1">
                       <div className="flex items-center gap-3 mb-2">
                         <h4 className="font-medium text-primary">
                           {assignment.vehicles?.licensePlate} - {assignment.vehicles?.make} {assignment.vehicles?.model}
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
                         {!assignment.isActive && (
                           <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                             Inactive
                           </span>
                         )}
                       </div>
                       <div className="text-sm text-secondary space-y-1">
                         <div>
                           <strong>Authorized:</strong> {new Date(assignment.authorizedDate).toLocaleDateString()}
                         </div>
                         {assignment.expiryDate && (
                           <div className="flex items-center gap-1">
                             <Calendar className="h-4 w-4" />
                             <strong>Expires:</strong> {new Date(assignment.expiryDate).toLocaleDateString()}
                           </div>
                         )}
                         {assignment.notes && (
                           <div>
                             <strong>Notes:</strong> {assignment.notes}
                           </div>
                         )}
                       </div>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           )}
         </div>

         <div className="mt-6 flex justify-end gap-2">
           {canEdit && !editing && (
             <button onClick={() => setEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md">Edit</button>
           )}

           {editing && (
             <>
               <button onClick={() => setEditing(false)} disabled={submitting} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md">Cancel</button>
               <button onClick={handleSave} disabled={submitting} className="px-4 py-2 bg-green-600 text-white rounded-md">{submitting ? 'Saving...' : 'Save'}</button>
             </>
           )}

           <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md">Close</button>
         </div>
       </div>
     </div>
   )
 }
