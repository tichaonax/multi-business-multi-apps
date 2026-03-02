'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { NationalIdInput } from '@/components/ui/national-id-input'
import { DriverLicenseInput } from '@/components/ui/driver-license-input'
import { DateInput } from '@/components/ui/date-input'

interface Employee {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  fullName: string
  email: string | null
  phone: string
  nationalId: string | null
  driverLicense: string | null
  address: string | null
  dateOfBirth: string | null
  hireDate: string
  employmentStatus: string
  notes: string | null
  jobTitle: {
    id: string
    title: string
  }
  compensationType: {
    id: string
    name: string
  }
  primaryBusiness: {
    id: string
    name: string
  }
  supervisor: {
    id: string
    fullName: string
  } | null
}

export default function EmployeeEditPage() {
  const { data: session } = useSession()
  const currentUser = session?.user as any
  const { hasPermission } = useBusinessPermissionsContext()
  const params = useParams()
  const router = useRouter()
  const employeeId = params.id as string
  
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [hasActiveContract, setHasActiveContract] = useState(false)
  const [currentContract, setCurrentContract] = useState<any>(null)
  const [supervisors, setSupervisors] = useState<Array<{ id: string; fullName: string; employeeNumber: string }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  
  // Form data
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    countryCode: '',
    localNumber: '',
    nationalId: '',
    idFormatTemplateId: '',
    driverLicenseNumber: '',
    driverLicenseTemplateId: '',
    address: '',
    dateOfBirth: '',
    dateOfBirthCountryCode: 'ZW',
    hireDate: '',
    hireDateCountryCode: 'ZW',
    employmentStatus: 'active',
    contractStatus: 'pending_signature',
    supervisorId: '',
    notes: '',
    profilePhotoUrl: ''
  })

  const canEditEmployees = hasPermission('canEditEmployees')

  useEffect(() => {
    if (canEditEmployees && employeeId) {
      fetchEmployee()
    }
  }, [canEditEmployees, employeeId])

  const fetchEmployee = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/employees/${employeeId}`)
      if (response.ok) {
        const data = await response.json()
        setEmployee(data)
        setFormData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          countryCode: '',
          localNumber: '',
          nationalId: data.nationalId || '',
          idFormatTemplateId: data.idFormatTemplateId || '',
          driverLicenseNumber: data.driverLicenseNumber || '',
          driverLicenseTemplateId: data.driverLicenseTemplateId || '',
          address: data.address || '',
          dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
          dateOfBirthCountryCode: 'ZW',
          hireDate: data.hireDate ? data.hireDate.split('T')[0] : '',
          hireDateCountryCode: 'ZW',
          employmentStatus: data.employmentStatus || 'active',
          supervisorId: data.supervisor?.id || '',
          notes: data.notes || '',
          profilePhotoUrl: data.profilePhotoUrl || ''
        })

        // Load potential supervisors (excluding current employee)
        const supervisorsResponse = await fetch('/api/employees?limit=100')
        if (supervisorsResponse.ok) {
          const supervisorsData = await supervisorsResponse.json()
          console.log('[EditEmployee] Loaded employees for supervisor dropdown:', supervisorsData.employees?.length)
          // Filter to include active and pending contract employees (handle both naming conventions)
          const eligibleSupervisors = (supervisorsData.employees || []).filter((emp: any) => {
            const status = emp.employmentStatus?.toLowerCase() || ''
            const isEligible = emp.id !== employeeId && // Exclude self
              (status === 'active' || status === 'pendingcontract' || status === 'pending_contract')
            return isEligible
          })
          console.log('[EditEmployee] Eligible supervisors:', eligibleSupervisors.length, eligibleSupervisors.map((e: any) => e.fullName))
          setSupervisors(eligibleSupervisors)
        }

        // Check if employee has contracts and get current contract status
        const contractsResponse = await fetch(`/api/employees/${employeeId}/contracts`)
        if (contractsResponse.ok) {
          const contractsData = await contractsResponse.json()
          // API returns contracts directly as array, not wrapped in contracts property
          const currentContract = contractsData[0] // Most recent contract
          const activeContract = contractsData.find((contract: any) => contract.status === 'active')

          setHasActiveContract(!!activeContract)
          setCurrentContract(currentContract)

          // Set contract status in form if contract exists
          if (currentContract) {
            setFormData(prev => ({
              ...prev,
              contractStatus: currentContract.status
            }))
          }
        }
      } else {
        setError('Failed to fetch employee')
      }
    } catch (error) {
      console.error('Error fetching employee:', error)
      setError('Failed to fetch employee')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee) return

    try {
      setSaving(true)
      setError('')

      // Check if contract signing is happening
      const isSigningContract = currentContract &&
                               formData.contractStatus !== currentContract.status &&
                               formData.contractStatus === 'active'

      // First, handle contract status changes if needed
      if (currentContract && formData.contractStatus !== currentContract.status) {
        await handleContractStatusChange(formData.contractStatus)
      }

      // Prepare employee data for update
      const employeeUpdateData = {
        ...formData,
        idFormatTemplateId: formData.idFormatTemplateId || null,
        driverLicenseNumber: formData.driverLicenseNumber || null,
        driverLicenseTemplateId: formData.driverLicenseTemplateId || null,
        jobTitleId: employee.jobTitle.id,
        compensationTypeId: employee.compensationType.id,
        primaryBusinessId: employee.primaryBusiness.id,
        supervisorId: formData.supervisorId || null
      }

      // If contract signing is happening and employee status is "pending_contract",
      // don't send employmentStatus as it will be automatically set to "active" by contract signing
      if (isSigningContract && formData.employmentStatus === 'pending_contract') {
        delete employeeUpdateData.employmentStatus
      }

      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(employeeUpdateData)
      })

      if (response.ok) {
        // Use replace instead of push to prevent back button from returning to form
        router.replace(`/employees/${employeeId}`)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update employee')
      }
    } catch (error) {
      console.error('Error updating employee:', error)
      setError('Failed to update employee')
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingPhoto(true)
    try {
      const fd = new FormData()
      fd.append('files', file)
      // No expiresInDays — profile photos are permanent
      const res = await fetch('/api/universal/images', { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        const url = data.data?.[0]?.url ?? data.url
        if (url) {
          setFormData(prev => ({ ...prev, profilePhotoUrl: url }))
        }
      } else {
        setError('Failed to upload photo')
      }
    } catch {
      setError('Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
      e.target.value = '' // reset file input
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target

    // Handle employee status changes separately (immediate API call)
    if (name === 'employmentStatus') {
      handleEmployeeStatusChange(value)
      return
    }

    // Handle contract status in form data (will be processed on save)
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleEmployeeStatusChange = async (newStatus: string) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/employees/${employeeId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employmentStatus: newStatus,
          reason: `Employee status changed to ${newStatus} via employee edit form`,
          notes: `Manual status change via employee edit form`
        })
      })

      if (response.ok) {
        setFormData(prev => ({
          ...prev,
          employmentStatus: newStatus
        }))
        // Refresh employee data to get updated contract status after sync
        fetchEmployee()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update employee status')
      }
    } catch (error) {
      console.error('Error updating employee status:', error)
      setError('Failed to update employee status')
    } finally {
      setSaving(false)
    }
  }

  const handleContractStatusChange = async (newStatus: string) => {
    if (!currentContract) return

    try {
      setSaving(true)

      // Handle contract signing (active status) differently using PATCH with action=sign
      if (newStatus === 'active') {
        const response = await fetch(`/api/employees/${employeeId}/contracts/${currentContract.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'sign'
          })
        })

        if (response.ok) {
          setFormData(prev => ({
            ...prev,
            contractStatus: 'active'
          }))
          // Refresh employee data to get updated employment status after sync
          fetchEmployee()
        } else {
          const errorData = await response.json()
          setError(errorData.error || 'Failed to sign contract')
        }
      } else {
        // Handle other status changes (suspended, terminated) using PUT
        const response = await fetch(`/api/employees/${employeeId}/contracts/${currentContract.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: newStatus,
            terminationReason: newStatus === 'terminated' ? 'Manual termination via employee edit' : undefined,
            notes: `Contract status changed to ${newStatus} via employee edit form`
          })
        })

        if (response.ok) {
          setFormData(prev => ({
            ...prev,
            contractStatus: newStatus
          }))
          // Refresh employee data to get updated employment status after sync
          fetchEmployee()
        } else {
          const errorData = await response.json()
          setError(errorData.error || 'Failed to update contract status')
        }
      }
    } catch (error) {
      console.error('Error updating contract status:', error)
      setError('Failed to update contract status')
    } finally {
      setSaving(false)
    }
  }

  if (!session) {
    return (
      <ContentLayout title="Edit Employee">
        <div className="text-center py-8">
          <p className="text-secondary">Please sign in to edit employee details.</p>
        </div>
      </ContentLayout>
    )
  }

  if (!canEditEmployees) {
    return (
      <ContentLayout title="Edit Employee">
        <div className="text-center py-8">
          <p className="text-secondary">You don't have permission to edit employee details.</p>
        </div>
      </ContentLayout>
    )
  }

  if (loading) {
    return (
      <ContentLayout title="Edit Employee">
        <div className="text-center py-8">
          <p className="text-secondary">Loading employee details...</p>
        </div>
      </ContentLayout>
    )
  }

  if (!employee) {
    return (
      <ContentLayout title="Edit Employee">
        <div className="text-center py-8">
          <p className="text-secondary">Employee not found.</p>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title={`Edit ${employee.fullName}`}
      subtitle="Update employee information"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Employees', href: '/employees' },
        { label: employee.fullName, href: `/employees/${employeeId}` },
        { label: 'Edit', isActive: true }
      ]}
    >
      <div className="max-w-4xl mx-auto">
        <div className="card">
          <div className="p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4">Personal Information</h3>

                {/* Profile Photo */}
                <div className="flex items-center gap-6 mb-6">
                  <div className="relative">
                    {formData.profilePhotoUrl ? (
                      <img
                        src={formData.profilePhotoUrl}
                        alt="Profile photo"
                        className="w-24 h-24 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/expired-photo.svg' }}
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-gray-300 dark:border-gray-600">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    {uploadingPhoto && (
                      <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary mb-1">Profile Photo</p>
                    <p className="text-xs text-secondary mb-2">JPG, PNG or WEBP. Used for identification.</p>
                    <label className="btn-secondary text-sm cursor-pointer">
                      {uploadingPhoto ? 'Uploading...' : formData.profilePhotoUrl ? 'Change Photo' : 'Upload Photo'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoUpload}
                        disabled={uploadingPhoto}
                        className="hidden"
                      />
                    </label>
                    {formData.profilePhotoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, profilePhotoUrl: '' }))}
                        className="ml-2 text-xs text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Row 1: Emp# · First · Last */}
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Employee Number
                    </label>
                    <input
                      type="text"
                      value={employee.employeeNumber}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-600 text-primary cursor-not-allowed"
                    />
                    <p className="text-xs text-secondary mt-1">System-generated unique identifier</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Row 2: Email · Phone · Date of Birth */}
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <PhoneNumberInput
                    value={formData.phone}
                    onChange={(fullPhone, countryCode, localNumber) => {
                      setFormData({ ...formData, phone: fullPhone, countryCode, localNumber })
                    }}
                    label="Phone Number"
                    placeholder="77 123 4567"
                    required
                    className=""
                  />

                  <DateInput
                    value={formData.dateOfBirth}
                    onChange={(isoDate, countryCode) => {
                      setFormData({ ...formData, dateOfBirth: isoDate, dateOfBirthCountryCode: countryCode })
                    }}
                    label="Date of Birth"
                    placeholder="Enter date of birth"
                    defaultCountryCode={formData.dateOfBirthCountryCode}
                    showCountrySelector={false}
                    className=""
                  />

                  {/* Row 3: National ID spans 2 cols — template + input side-by-side */}
                  <NationalIdInput
                    value={formData.nationalId}
                    templateId={formData.idFormatTemplateId}
                    onChange={(nationalId, templateId) => {
                      setFormData({ ...formData, nationalId, idFormatTemplateId: templateId || '' })
                    }}
                    onTemplateChange={(templateId) => {
                      setFormData({ ...formData, idFormatTemplateId: templateId })
                    }}
                    label="National ID"
                    required
                    showTemplateSelector={true}
                    autoValidate={true}
                    twoColumnLayout={true}
                    className="md:col-span-2 lg:col-span-2"
                  />

                  {/* Row 4: Driver License spans 2 cols — template + input side-by-side */}
                  <DriverLicenseInput
                    value={formData.driverLicenseNumber}
                    templateId={formData.driverLicenseTemplateId}
                    onChange={(driverLicense, templateId) => {
                      setFormData({ ...formData, driverLicenseNumber: driverLicense, driverLicenseTemplateId: templateId || '' })
                    }}
                    onTemplateChange={(templateId) => {
                      setFormData({ ...formData, driverLicenseTemplateId: templateId })
                    }}
                    label="Driver License (Optional)"
                    placeholder="Enter driver license"
                    required={false}
                    showTemplateSelector={true}
                    autoValidate={true}
                    twoColumnLayout={true}
                    className="md:col-span-2 lg:col-span-2"
                  />

                  {/* Row 5: Address — full width */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-sm font-medium text-secondary mb-2">Address</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Employment Information */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4">Employment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <DateInput
                    value={formData.hireDate}
                    onChange={(isoDate, countryCode) => {
                      setFormData({
                        ...formData,
                        hireDate: isoDate,
                        hireDateCountryCode: countryCode
                      })
                    }}
                    label="Hire Date"
                    placeholder="Enter hire date"
                    required
                    defaultCountryCode={formData.hireDateCountryCode}
                    showCountrySelector={false}
                    className=""
                  />

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Supervisor
                    </label>
                    <select
                      name="supervisorId"
                      value={formData.supervisorId}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No Supervisor</option>
                      {[...supervisors].sort((a, b) => a.fullName.localeCompare(b.fullName)).map((supervisor) => (
                        <option key={supervisor.id} value={supervisor.id}>
                          {supervisor.fullName} ({supervisor.employeeNumber})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-secondary mt-1">
                      Assign a supervisor/manager to this employee
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Employee Status
                    </label>
                    <select
                      name="employmentStatus"
                      value={formData.employmentStatus}
                      onChange={handleChange}
                      disabled={!currentContract?.employeeSignedAt}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {!currentContract?.employeeSignedAt ? (
                        <option value="pending_contract">🟣 Pending Contract</option>
                      ) : (
                        <>
                          <option value="active">🟢 Active</option>
                          <option value="on_leave">🟡 On Leave</option>
                          <option value="suspended">🟠 Suspended</option>
                          <option value="terminated">🔴 Terminated</option>
                        </>
                      )}
                    </select>
                    <p className="text-xs text-secondary mt-1">
                      {!currentContract?.employeeSignedAt ? (
                        <span className="text-blue-600 dark:text-blue-400">
                          Sign contract first to unlock additional employee status options
                        </span>
                      ) : (
                        'Employee-level status (independent of contract)'
                      )}
                    </p>
                  </div>

                  {currentContract && (
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">
                        Contract Status
                      </label>
                      <select
                        name="contractStatus"
                        value={formData.contractStatus}
                        onChange={handleChange}
                        disabled={saving || currentContract.status === 'terminated'}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {!currentContract.employeeSignedAt ? (
                          <>
                            <option value="pending_signature">📝 Pending Signature</option>
                            <option value="active">✅ Active (Sign Contract)</option>
                          </>
                        ) : (
                          <>
                            <option value="active">✅ Active</option>
                            <option value="suspended">⏸️ Suspended</option>
                            <option value="terminated">🛑 Terminated</option>
                          </>
                        )}
                      </select>
                      <p className="text-xs text-secondary mt-1">
                        Contract-level status
                        {currentContract.status === 'terminated' && (
                          <span className="text-red-600 dark:text-red-400"> (Locked - terminated contracts cannot be modified)</span>
                        )}
                        {!currentContract.employeeSignedAt && (
                          <span className="text-blue-600 dark:text-blue-400"> (Sign contract to enable more options)</span>
                        )}
                      </p>
                    </div>
                  )}

                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Additional notes about the employee..."
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => router.push(`/employees/${employeeId}`)}
                  className="btn-secondary"
                  disabled={saving}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ContentLayout>
  )
}