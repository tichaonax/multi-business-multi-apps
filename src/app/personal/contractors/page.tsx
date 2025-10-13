'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { hasUserPermission } from '@/lib/permission-utils'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { NationalIdInput } from '@/components/ui/national-id-input'
import { DriverLicenseInput } from '@/components/ui/driver-license-input'
import { formatPhoneNumberForDisplay } from '@/lib/country-codes'
import { PersonEditForm } from '@/components/personal/person-edit-form'

interface Person {
  id: string
  fullName: string
  email?: string
  phone: string
  nationalId: string
  driverLicenseNumber?: string
  address?: string
  notes?: string
  isActive: boolean
  createdAt: string
  projectContractors: Array<{
    id: string
    project: {
      id: string
      name: string
      status: string
    }
  }>
  _count: {
    projectContractors: number
    projectTransactions: number
  }
}

export default function ContractorsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [persons, setPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [newPerson, setNewPerson] = useState({
    fullName: '',
    email: '',
    phone: '',
    countryCode: '',
    localNumber: '',
    nationalId: '',
    idFormatTemplateId: '',
    driverLicenseNumber: '',
    driverLicenseTemplateId: '',
    address: '',
    notes: ''
  })

  const fetchPersons = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.set('search', searchTerm)
      if (showActiveOnly) params.set('isActive', 'true')
      
      const response = await fetch(`/api/persons?${params}`)
      if (response.ok) {
        const data = await response.json()
        setPersons(data)
      }
    } catch (error) {
      console.error('Failed to fetch persons:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPersons()
  }, [searchTerm, showActiveOnly])

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newPerson.fullName.trim() || !newPerson.phone.trim() || !newPerson.nationalId.trim()) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newPerson.fullName,
          email: newPerson.email,
          phone: newPerson.phone,
          nationalId: newPerson.nationalId,
          idFormatTemplateId: newPerson.idFormatTemplateId || null,
          driverLicenseNumber: newPerson.driverLicenseNumber || null,
          driverLicenseTemplateId: newPerson.driverLicenseTemplateId || null,
          address: newPerson.address,
          notes: newPerson.notes
        })
      })

      if (response.ok) {
        setNewPerson({
          fullName: '',
          email: '',
          phone: '',
          countryCode: '',
          localNumber: '',
          nationalId: '',
          idFormatTemplateId: '',
          driverLicenseNumber: '',
          driverLicenseTemplateId: '',
          address: '',
          notes: ''
        })
        setShowAddForm(false)
        fetchPersons()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to add person')
      }
    } catch (error) {
      console.error('Error adding person:', error)
      alert('Failed to add person')
    }
  }

  const togglePersonStatus = async (personId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/persons/${personId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      })

      if (response.ok) {
        fetchPersons()
      } else {
        alert('Failed to update person status')
      }
    } catch (error) {
      console.error('Error updating person:', error)
      alert('Failed to update person status')
    }
  }

  const handleEditClick = (person: Person) => {
    setEditingPerson(person)
    setShowEditModal(true)
  }

  const handleEditClose = () => {
    setEditingPerson(null)
    setShowEditModal(false)
  }

  const handleEditSave = async (updatedPerson: Person) => {
    try {
      const response = await fetch(`/api/persons/${updatedPerson.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: updatedPerson.fullName,
          email: updatedPerson.email,
          phone: updatedPerson.phone,
          nationalId: updatedPerson.nationalId,
          driverLicenseNumber: updatedPerson.driverLicenseNumber,
          address: updatedPerson.address,
          notes: updatedPerson.notes
        })
      })

      if (response.ok) {
        fetchPersons() // Refresh the list
        handleEditClose()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update person')
      }
    } catch (error) {
      console.error('Error updating person:', error)
      alert('Failed to update person')
    }
  }

  const canManageContractors = session?.user && hasUserPermission(session.user, 'canAddPersonalExpenses')

  // Check user-level permissions for Personal Finance access
  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Check if user has access to Personal Finance module
    if (!hasUserPermission(session.user, 'canAccessPersonalFinance')) {
      // Redirect back to Personal Finance instead of dashboard
      router.push('/personal')
      return
    }
  }, [session, status, router])

  // Show loading state while checking permissions
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Don't render content if no session or no access
  if (!session || !hasUserPermission(session.user, 'canAccessPersonalFinance')) {
    return null
  }

  return (
    <ProtectedRoute>
      <ContentLayout
        title="Contractors & People"
        subtitle="Manage contractors and people you can make payments to"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Personal', href: '/personal' },
          { label: 'Contractors', isActive: true }
        ]}
        headerActions={
          <div className="flex gap-3">
            {canManageContractors && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="btn-primary"
              >
                + Add Person
              </button>
            )}
            <Link
              href="/personal"
              className="btn-secondary"
            >
              ← Back to Personal
            </Link>
          </div>
        }
      >
        <div className="space-y-6">

          {/* Search and Filters */}
          <div className="card p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="🔍 Search by name, email, phone, or national ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showActiveOnly}
                    onChange={(e) => setShowActiveOnly(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-secondary">Active only</span>
                </label>
              </div>
            </div>
          </div>

          {/* Add Person Form */}
          {showAddForm && canManageContractors && (
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-primary mb-4">Add New Person</h2>
              <form onSubmit={handleAddPerson} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={newPerson.fullName}
                      onChange={(e) => setNewPerson({...newPerson, fullName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newPerson.email}
                      onChange={(e) => setNewPerson({...newPerson, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <PhoneNumberInput
                    value={newPerson.phone}
                    onChange={(fullPhone, countryCode, localNumber) => {
                      setNewPerson({
                        ...newPerson,
                        phone: fullPhone,
                        countryCode,
                        localNumber
                      })
                    }}
                    label="Phone Number"
                    placeholder="77 123 4567"
                    required
                  />

                  <NationalIdInput
                    value={newPerson.nationalId}
                    templateId={newPerson.idFormatTemplateId}
                    onChange={(nationalId, templateId) => {
                      setNewPerson({
                        ...newPerson,
                        nationalId,
                        idFormatTemplateId: templateId || ''
                      })
                    }}
                    onTemplateChange={(templateId) => {
                      setNewPerson({
                        ...newPerson,
                        idFormatTemplateId: templateId
                      })
                    }}
                    label="National ID"
                    required
                    showTemplateSelector={true}
                    autoValidate={true}
                  />

                  <DriverLicenseInput
                    value={newPerson.driverLicenseNumber}
                    templateId={newPerson.driverLicenseTemplateId}
                    onChange={(driverLicense, templateId) => {
                      setNewPerson({
                        ...newPerson,
                        driverLicenseNumber: driverLicense,
                        driverLicenseTemplateId: templateId || ''
                      })
                    }}
                    onTemplateChange={(templateId) => {
                      setNewPerson({
                        ...newPerson,
                        driverLicenseTemplateId: templateId
                      })
                    }}
                    label="Driver License (Optional)"
                    placeholder="Enter driver license"
                    required={false}
                    showTemplateSelector={true}
                    autoValidate={true}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Address
                  </label>
                  <textarea
                    value={newPerson.address}
                    onChange={(e) => setNewPerson({...newPerson, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Notes
                  </label>
                  <textarea
                    value={newPerson.notes}
                    onChange={(e) => setNewPerson({...newPerson, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-sm font-medium text-secondary bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    Add Person
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Person Modal */}
          {showEditModal && editingPerson && canManageContractors && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-primary">Edit Person</h2>
                    <button
                      onClick={handleEditClose}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold"
                    >
                      ×
                    </button>
                  </div>

                  <PersonEditForm
                    person={editingPerson}
                    onSave={handleEditSave}
                    onCancel={handleEditClose}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Persons List */}
          <div className="card">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-primary">All People</h2>
              <p className="text-sm text-secondary mt-1">
                {loading ? 'Loading...' : `${persons.length} people found`}
              </p>
            </div>
            
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-secondary mt-2">Loading people...</p>
              </div>
            ) : persons.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-6xl mb-4">👤</div>
                <h3 className="text-lg font-medium text-primary mb-2">No people found</h3>
                <p className="text-secondary mb-4">
                  {searchTerm ? 'No people match your search criteria.' : 'Add people you can make payments to.'}
                </p>
                {canManageContractors && !showAddForm && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="btn-primary"
                  >
                    Add First Person
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Person</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Projects</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Payments</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Status</th>
                      {canManageContractors && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {persons.map((person) => (
                      <tr 
                        key={person.id} 
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          canManageContractors ? 'cursor-pointer' : ''
                        }`}
                        onClick={() => canManageContractors && handleEditClick(person)}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-primary">{person.fullName}</p>
                            <p className="text-sm text-secondary">ID: {person.nationalId}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <p className="text-primary">{formatPhoneNumberForDisplay(person.phone)}</p>
                            {person.email && <p className="text-secondary">{person.email}</p>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div>
                            <p className="font-medium text-primary">
                              {person._count.projectContractors} projects
                            </p>
                            {person.project_contractors.slice(0, 2).map((contractor) => (
                              <p key={contractor.id} className="text-xs text-secondary">
                                • {contractor.project.name} ({contractor.project.status})
                              </p>
                            ))}
                            {person.project_contractors.length > 2 && (
                              <p className="text-xs text-secondary">
                                +{person.project_contractors.length - 2} more
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <p className="font-medium text-primary">
                            {person._count.projectTransactions} payments
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            person.isActive 
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                              : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                          }`}>
                            {person.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        {canManageContractors && (
                          <td className="px-6 py-4 text-sm">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                togglePersonStatus(person.id, person.isActive)
                              }}
                              className={`px-3 py-1 text-xs font-medium rounded ${
                                person.isActive
                                  ? 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-800 dark:text-red-100'
                                  : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800 dark:text-green-100'
                              }`}
                            >
                              {person.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </ContentLayout>
    </ProtectedRoute>
  )
}