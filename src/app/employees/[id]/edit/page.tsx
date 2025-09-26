'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { hasPermission } from '@/lib/permission-utils'
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
  const params = useParams()
  const router = useRouter()
  const employeeId = params.id as string
  
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [hasActiveContract, setHasActiveContract] = useState(false)
  const [currentContract, setCurrentContract] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  
  // Form data
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
    notes: ''
  })

  const canEditEmployees = currentUser && hasPermission(currentUser, 'canEditEmployees')

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
          notes: data.notes || ''
        })

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
        supervisorId: employee.supervisor?.id || null
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
        router.push(`/employees/${employeeId}`)
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <p className="text-xs text-secondary mt-1">
                      System-generated unique identifier
                    </p>
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

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Email
                    </label>
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
                      setFormData({
                        ...formData,
                        phone: fullPhone,
                        countryCode,
                        localNumber
                      })
                    }}
                    label="Phone Number"
                    placeholder="77 123 4567"
                    required
                    className=""
                  />

                  <NationalIdInput
                    value={formData.nationalId}
                    templateId={formData.idFormatTemplateId}
                    onChange={(nationalId, templateId) => {
                      setFormData({
                        ...formData,
                        nationalId,
                        idFormatTemplateId: templateId || ''
                      })
                    }}
                    onTemplateChange={(templateId) => {
                      setFormData({
                        ...formData,
                        idFormatTemplateId: templateId
                      })
                    }}
                    label="National ID"
                    required
                    showTemplateSelector={true}
                    autoValidate={true}
                  />

                  <DriverLicenseInput
                    value={formData.driverLicenseNumber}
                    templateId={formData.driverLicenseTemplateId}
                    onChange={(driverLicense, templateId) => {
                      setFormData({
                        ...formData,
                        driverLicenseNumber: driverLicense,
                        driverLicenseTemplateId: templateId || ''
                      })
                    }}
                    onTemplateChange={(templateId) => {
                      setFormData({
                        ...formData,
                        driverLicenseTemplateId: templateId
                      })
                    }}
                    label="Driver License (Optional)"
                    placeholder="Enter driver license"
                    required={false}
                    showTemplateSelector={true}
                    autoValidate={true}
                  />

                  <DateInput
                    value={formData.dateOfBirth}
                    onChange={(isoDate, countryCode) => {
                      setFormData({
                        ...formData,
                        dateOfBirth: isoDate,
                        dateOfBirthCountryCode: countryCode
                      })
                    }}
                    label="Date of Birth"
                    placeholder="Enter date of birth"
                    defaultCountryCode={formData.dateOfBirthCountryCode}
                    showCountrySelector={false}
                    className=""
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Employment Information */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4">Employment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes about the employee..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="btn-secondary"
                  disabled={saving}
                >
                  Cancel
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