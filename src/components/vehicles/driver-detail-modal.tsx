'use client'

import { useState, useEffect } from 'react'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { DriverLicenseInput, formatDriverLicenseValue } from '@/components/ui/driver-license-input'
import { formatPhoneNumberForDisplay, parseDateFromFormat, formatDateByFormat } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'
import { useSession } from 'next-auth/react'
import { VehicleDriver } from '@/types/vehicle'
import { hasPermission, isSystemAdmin, hasUserPermission } from '@/lib/permission-utils'

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
