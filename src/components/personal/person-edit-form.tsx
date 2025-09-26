'use client'

import { useState, useEffect } from 'react'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { NationalIdInput } from '@/components/ui/national-id-input'
import { DriverLicenseInput } from '@/components/ui/driver-license-input'
import { parsePhoneNumber } from '@/lib/country-codes'

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
}

interface PersonEditFormProps {
  person: Person
  onSave: (updatedPerson: Person) => void
  onCancel: () => void
}

export function PersonEditForm({ person, onSave, onCancel }: PersonEditFormProps) {
  const [formData, setFormData] = useState({
    fullName: person.fullName || '',
    email: person.email || '',
    phone: person.phone || '',
    countryCode: '',
    localNumber: '',
    nationalId: person.nationalId || '',
    idFormatTemplateId: '',
    driverLicenseNumber: person.driverLicenseNumber || '',
    driverLicenseTemplateId: '',
    address: person.address || '',
    notes: person.notes || ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Parse phone number on mount
  useEffect(() => {
    if (person.phone) {
      const { countryCode, localNumber } = parsePhoneNumber(person.phone)
      setFormData(prev => ({
        ...prev,
        countryCode: countryCode?.code || '',
        localNumber: localNumber || person.phone
      }))
    }
  }, [person.phone])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.nationalId.trim()) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      const updatedPerson: Person = {
        ...person,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        nationalId: formData.nationalId,
        driverLicenseNumber: formData.driverLicenseNumber,
        address: formData.address,
        notes: formData.notes
      }

      await onSave(updatedPerson)
    } catch (error) {
      setError('Failed to update person')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-secondary mb-2">
            Full Name *
          </label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary mb-2">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
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
          disabled={loading}
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
          disabled={loading}
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
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-secondary mb-2">
          Address
        </label>
        <textarea
          value={formData.address}
          onChange={(e) => setFormData({...formData, address: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-secondary mb-2">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
          placeholder="Any additional notes about this person..."
          disabled={loading}
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-secondary bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}