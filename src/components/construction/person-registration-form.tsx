'use client'

import { useState, useEffect, useRef } from 'react'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { NationalIdInput } from '@/components/ui/national-id-input'
import { DriverLicenseInput } from '@/components/ui/driver-license-input'
import { DateInput } from '@/components/ui/date-input'


interface PersonRegistrationFormProps {
  onSuccess: (person: any) => void
  onCancel: () => void
}

export function PersonRegistrationForm({ onSuccess, onCancel }: PersonRegistrationFormProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    countryCode: '',
    localNumber: '',
    nationalId: '',
    idFormatTemplateId: '',
    driverLicenseNumber: '',
    driverLicenseTemplateId: '',
    dateOfBirth: '',
    dateCountryCode: 'ZW',
    address: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const dateInputRef = useRef<HTMLInputElement>(null)


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    setError('')

    // Age validation for loan recipients (18+ years required)
    if (formData.dateOfBirth) {
      const birthDate = new Date(formData.dateOfBirth)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      const dayDiff = today.getDate() - birthDate.getDate()

      // Adjust age if birthday hasn't occurred this year
      const actualAge = (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) ? age - 1 : age

      if (actualAge < 18) {
        setError('Person must be at least 18 years old to receive loans.')
        setLoading(false)
        // Focus the date input field to highlight the error
        setTimeout(() => {
          if (dateInputRef.current) {
            dateInputRef.current.focus()
          }
        }, 100)
        return
      }
    }

    try {
      const response = await fetch('/api/persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          nationalId: formData.nationalId,
          idFormatTemplateId: formData.idFormatTemplateId || null,
          driverLicenseNumber: formData.driverLicenseNumber || null,
          driverLicenseTemplateId: formData.driverLicenseTemplateId || null,
          dateOfBirth: formData.dateOfBirth || null,
          address: formData.address,
          notes: formData.notes
        })
      })

      const data = await response.json()

      if (response.ok) {
        onSuccess(data)
      } else {
        setError(data.error || 'Failed to register person')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 w-full max-w-full mx-auto">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Register New Person/Contractor</h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="min-w-0 relative overflow-visible">
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
              className="w-full"
            />
          </div>
        </div>

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DateInput
            value={formData.dateOfBirth}
            onChange={(isoDate, countryCode) => {
              setFormData({
                ...formData,
                dateOfBirth: isoDate,
                dateCountryCode: countryCode
              })
            }}
            label="Date of Birth"
            placeholder="Enter date of birth"
            defaultCountryCode={formData.dateCountryCode}
            showCountrySelector={false}
            className=""
            ref={dateInputRef}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <textarea
            value={formData.address}
            onChange={(e) => setFormData({...formData, address: e.target.value})}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Any additional notes about this person..."
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Registering...' : 'Register Person'}
          </button>
        </div>
      </form>
    </div>
  )
}