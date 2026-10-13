'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useConfirm } from '@/components/ui/confirm-modal'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { NationalIdInput } from '@/components/ui/national-id-input'
import { DriverLicenseInput } from '@/components/ui/driver-license-input'
import { DateInput } from '@/components/ui/date-input'
import { ProfileIdentityFields } from '@/components/shared/profile-identity-fields'

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

  // Track initial (saved) form values to detect unsaved changes
  const [initialFormData, setInitialFormData] = useState<Record<string, any>>({})

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
    tin: '',
    address: '',
    dateOfBirth: '',
    dateOfBirthCountryCode: 'ZW',
    hireDate: '',
    hireDateCountryCode: 'ZW',
    employmentStatus: 'active',
    contractStatus: 'pending_signature',
    supervisorId: '',
    terminationDate: '',
    notes: '',
    profilePhotoUrl: '',
    // MBM-311: commission-based pay — admin-only section below
    commissionEligible: false,
    commissionTier1Enabled: false,
    commissionTier1Threshold: '',
    commissionTier1Rate: '',
    commissionTier2Enabled: false,
    commissionTier2Threshold: '',
    commissionTier2Rate: '',
    commissionTier3Enabled: false,
    commissionTier3Threshold: '',
    commissionTier3Rate: '',
  })

  const [statusChangeDate, setStatusChangeDate] = useState<string>('')

  const confirm = useConfirm()
  const canEditEmployees = hasPermission('canEditEmployees')

  const handleClose = async () => {
    const editableKeys = ['firstName', 'lastName', 'email', 'phone', 'nationalId', 'idFormatTemplateId', 'driverLicenseNumber', 'driverLicenseTemplateId', 'tin', 'address', 'dateOfBirth', 'hireDate', 'supervisorId', 'notes', 'profilePhotoUrl']
    const isDirty = editableKeys.some(k => (formData as any)[k] !== (initialFormData as any)[k])
    if (isDirty) {
      const ok = await confirm({
        title: 'Unsaved changes',
        description: 'You have unsaved changes. Are you sure you want to close without saving?',
        confirmText: 'Discard',
        cancelText: 'Keep editing'
      })
      if (!ok) return
    }
    router.push('/employees')
  }

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
        const loaded = {
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
          tin: data.tin || '',
          address: data.address || '',
          dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
          dateOfBirthCountryCode: 'ZW',
          hireDate: data.hireDate ? data.hireDate.split('T')[0] : '',
          hireDateCountryCode: 'ZW',
          terminationDate: data.terminationDate ? data.terminationDate.split('T')[0] : '',
          employmentStatus: data.employmentStatus || 'active',
          contractStatus: 'pending_signature',
          supervisorId: data.supervisor?.id || '',
          notes: data.notes || '',
          profilePhotoUrl: data.profilePhotoUrl || '',
          // Preserve the userId link — must round-trip so saves don't silently clear it
          userId: data.user?.id || data.userId || null,
          commissionEligible: !!data.commissionEligible,
          commissionTier1Enabled: !!data.commissionTier1Enabled,
          commissionTier1Threshold: data.commissionTier1Threshold != null ? String(data.commissionTier1Threshold) : '',
          commissionTier1Rate: data.commissionTier1Rate != null ? String(data.commissionTier1Rate) : '',
          commissionTier2Enabled: !!data.commissionTier2Enabled,
          commissionTier2Threshold: data.commissionTier2Threshold != null ? String(data.commissionTier2Threshold) : '',
          commissionTier2Rate: data.commissionTier2Rate != null ? String(data.commissionTier2Rate) : '',
          commissionTier3Enabled: !!data.commissionTier3Enabled,
          commissionTier3Threshold: data.commissionTier3Threshold != null ? String(data.commissionTier3Threshold) : '',
          commissionTier3Rate: data.commissionTier3Rate != null ? String(data.commissionTier3Rate) : '',
        }
        setFormData(loaded)
        setInitialFormData(loaded)

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
      const numOrNull = (v: string) => (v === '' ? null : Number(v))
      const employeeUpdateData = {
        ...formData,
        idFormatTemplateId: formData.idFormatTemplateId || null,
        driverLicenseNumber: formData.driverLicenseNumber || null,
        driverLicenseTemplateId: formData.driverLicenseTemplateId || null,
        jobTitleId: employee.jobTitle.id,
        compensationTypeId: employee.compensationType.id,
        primaryBusinessId: employee.primaryBusiness.id,
        supervisorId: formData.supervisorId || null,
        commissionTier1Threshold: numOrNull(formData.commissionTier1Threshold),
        commissionTier1Rate: numOrNull(formData.commissionTier1Rate),
        commissionTier2Threshold: numOrNull(formData.commissionTier2Threshold),
        commissionTier2Rate: numOrNull(formData.commissionTier2Rate),
        commissionTier3Threshold: numOrNull(formData.commissionTier3Threshold),
        commissionTier3Rate: numOrNull(formData.commissionTier3Rate),
      }

      // If contract signing is happening and employee status is "pending_contract",
      // don't send employmentStatus as it will be automatically set to "active" by contract signing
      if (isSigningContract && formData.employmentStatus === 'pending_contract') {
        // JSON.stringify omits undefined-valued keys, same net effect as
        // `delete` without the stricter object-literal type that newly
        // rejects `delete` here (TS2790, surfaced by the added commission
        // fields below making this inferred type more concrete).
        ;(employeeUpdateData as any).employmentStatus = undefined
      }

      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(employeeUpdateData)
      })

      if (response.ok) {
        // Go back to employee list after saving
        router.replace('/employees')
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
          notes: `Manual status change via employee edit form`,
          ...(statusChangeDate && { statusChangeDate })
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

                {/* Profile Photo + Name — shared with the user's own "My Profile"
                    page and the Admin "Edit User" modal; if this employee is
                    linked to a login account, saving here also updates that
                    account's name/photo (and vice versa). */}
                <div className="mb-6">
                  <ProfileIdentityFields
                    firstName={formData.firstName}
                    lastName={formData.lastName}
                    onFirstNameChange={(v) => setFormData(prev => ({ ...prev, firstName: v }))}
                    onLastNameChange={(v) => setFormData(prev => ({ ...prev, lastName: v }))}
                    photoUrl={formData.profilePhotoUrl || null}
                    onPhotoChange={(url) => setFormData(prev => ({ ...prev, profilePhotoUrl: url || '' }))}
                    subtitle={employee.employeeNumber}
                  />
                  <div className="mt-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-primary text-sm"
                    >
                      {saving ? 'Saving...' : 'Save & Close'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Row 1: Emp# · Email · Phone */}
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

                  {/* Row 5: TIN — full width */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-sm font-medium text-secondary mb-2">
                      TIN (Tax Identification Number)
                      <span className="ml-2 text-xs text-gray-400 font-normal">Used for ZIMRA payroll export</span>
                    </label>
                    <input
                      type="text"
                      name="tin"
                      value={formData.tin}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g. 1007912139"
                    />
                  </div>

                  {/* Row 6: Address — full width */}
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

                  {formData.employmentStatus === 'terminated' && (
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">
                        Termination Date
                      </label>
                      <input
                        type="date"
                        name="terminationDate"
                        value={formData.terminationDate}
                        onChange={handleChange}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-secondary mt-1">
                        Effective date of termination. Saved with the form.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Status Change Date
                    </label>
                    <input
                      type="date"
                      value={statusChangeDate}
                      onChange={e => setStatusChangeDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-secondary mt-1">
                      Defaults to today. Set a past date if the change happened earlier.
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {!currentContract?.employeeSignedAt ? (
                        <>
                          <option value="pending_contract">🟣 Pending Contract</option>
                          <option value="terminated">🔴 Terminated</option>
                        </>
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
                          Sign contract first to unlock all status options
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

              {/* Commission (MBM-311) — admin-only. Eligibility + a 3-tier,
                  independently enable-able, progressive structure; nothing
                  here is hardcoded, all thresholds/rates are per-employee. */}
              {currentUser?.role === 'admin' && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-primary">Commission</h3>
                    <label className="flex items-center gap-2 text-sm font-medium text-secondary">
                      <input
                        type="checkbox"
                        checked={formData.commissionEligible}
                        onChange={(e) => setFormData(prev => ({ ...prev, commissionEligible: e.target.checked }))}
                        className="h-4 w-4"
                      />
                      Commission-eligible
                    </label>
                  </div>
                  {formData.commissionEligible && (
                    <>
                      <p className="text-xs text-secondary mb-3">
                        Commission is calculated automatically from this employee's sales each payroll
                        period — it isn't manually typed in once eligibility is on. This is a
                        <strong> progressive</strong> structure, like a tax bracket: each tier's threshold
                        is the <strong>width</strong> of that tier's own sales band, not a cumulative
                        total. E.g. Tier 1 = 1000 covers sales $0–$1,000; Tier 2 = 1500 then covers the
                        <em> next</em> $1,500 (i.e. $1,000–$2,500 of cumulative sales); Tier 3 covers
                        everything from there onward. Leave Tier 3's threshold blank for an unlimited top
                        tier — there's no separate cap field, a set Tier 3 threshold already is its own
                        upper bound (sales beyond it earn nothing).
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-secondary">
                              <th className="pb-2 pr-2">Tier</th>
                              <th className="pb-2 pr-2">Enabled</th>
                              <th className="pb-2 pr-2">Sales Width ($)</th>
                              <th className="pb-2 pr-2">Rate (%)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {([1, 2, 3] as const).map(tier => {
                              const enabledKey = `commissionTier${tier}Enabled` as const
                              const thresholdKey = `commissionTier${tier}Threshold` as const
                              const rateKey = `commissionTier${tier}Rate` as const
                              const enabled = formData[enabledKey]
                              return (
                                <tr key={tier} className="border-t border-gray-100 dark:border-gray-800">
                                  <td className="py-2 pr-2 font-medium text-primary">Tier {tier}</td>
                                  <td className="py-2 pr-2">
                                    <input
                                      type="checkbox"
                                      checked={enabled}
                                      onChange={(e) => setFormData(prev => ({ ...prev, [enabledKey]: e.target.checked }))}
                                      className="h-4 w-4"
                                    />
                                  </td>
                                  <td className="py-2 pr-2">
                                    <input
                                      type="number" step="0.01" min="0" name={thresholdKey}
                                      value={formData[thresholdKey]} onChange={handleChange} disabled={!enabled}
                                      placeholder={tier === 3 ? 'Unlimited' : ''}
                                      className="w-28 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-primary disabled:opacity-50"
                                    />
                                  </td>
                                  <td className="py-2 pr-2">
                                    <input
                                      type="number" step="0.01" min="0" name={rateKey}
                                      value={formData[rateKey]} onChange={handleChange} disabled={!enabled}
                                      className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-primary disabled:opacity-50"
                                    />
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleClose}
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