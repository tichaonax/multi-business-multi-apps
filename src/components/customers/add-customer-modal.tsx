'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { NationalIdInput } from '@/components/ui/national-id-input'

interface AddCustomerModalProps {
  onClose: () => void
  onCustomerCreated: () => void
}

export function AddCustomerModal({ onClose, onCustomerCreated }: AddCustomerModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [businesses, setBusinesses] = useState([])
  const [idTemplates, setIdTemplates] = useState([])
  const [formData, setFormData] = useState({
    type: 'INDIVIDUAL',
    firstName: '',
    lastName: '',
    fullName: '',
    companyName: '',
    dateOfBirth: '',
    gender: '',
    primaryEmail: '',
    primaryPhone: '',
    alternatePhone: '',
    address: '',
    city: '',
    state: '',
    country: 'Zimbabwe',
    postalCode: '',
    nationalId: '',
    nationalIdTemplateId: '',
    passportNumber: '',
    taxNumber: '',
    businessId: '',
    allowLayby: true,
    allowCredit: false
  })

  useEffect(() => {
    fetchBusinesses()
    fetchIdTemplates()
  }, [])

  const fetchBusinesses = async () => {
    try {
      const response = await fetch('/api/businesses')
      if (response.ok) {
        const data = await response.json()
        setBusinesses(data.businesses || [])
      }
    } catch (error) {
      console.error('Error fetching businesses:', error)
    }
  }

  const fetchIdTemplates = async () => {
    try {
      const response = await fetch('/api/admin/id-format-templates')
      if (response.ok) {
        const data = await response.json()
        setIdTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Error fetching ID templates:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Auto-generate fullName if not provided
      const fullName = formData.fullName ||
        (formData.type === 'BUSINESS' ? formData.companyName : `${formData.firstName} ${formData.lastName}`.trim())

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          fullName
        })
      })

      const data = await response.json()

      if (response.ok) {
        onCustomerCreated()
      } else {
        setError(data.error || 'Failed to create customer')
      }
    } catch (error) {
      setError('An error occurred while creating customer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-primary">Add New Customer</h2>
          <button
            onClick={onClose}
            className="text-secondary hover:text-primary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Customer Type */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Customer Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary"
              required
            >
              <option value="INDIVIDUAL">Individual</option>
              <option value="BUSINESS">Business</option>
              <option value="EMPLOYEE">Employee</option>
              <option value="USER">User</option>
              <option value="GOVERNMENT">Government</option>
              <option value="NGO">NGO</option>
            </select>
          </div>

          {/* Name Fields */}
          {formData.type === 'BUSINESS' ? (
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Company Name *
              </label>
              <Input
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                required
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  First Name
                </label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Last Name
                </label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Full Name Override */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Full Name (Optional - auto-generated if empty)
            </label>
            <Input
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Email
              </label>
              <Input
                type="email"
                value={formData.primaryEmail}
                onChange={(e) => setFormData({ ...formData, primaryEmail: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Phone Number *
              </label>
              <PhoneNumberInput
                value={formData.primaryPhone}
                onChange={(value) => setFormData({ ...formData, primaryPhone: value })}
              />
            </div>
          </div>

          {/* National ID */}
          {idTemplates.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                National ID
              </label>
              <NationalIdInput
                value={formData.nationalId}
                templateId={formData.nationalIdTemplateId}
                templates={idTemplates}
                onChange={(value) => setFormData({ ...formData, nationalId: value })}
                onTemplateChange={(templateId) => setFormData({ ...formData, nationalIdTemplateId: templateId })}
              />
            </div>
          )}

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Address
            </label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                City
              </label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Country
              </label>
              <Input
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>
          </div>

          {/* Business Assignment */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Assign to Business (Optional)
            </label>
            <select
              value={formData.businessId}
              onChange={(e) => setFormData({ ...formData, businessId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary"
            >
              <option value="">No business assignment</option>
              {businesses.map((business: any) => (
                <option key={business.id} value={business.id}>
                  {business.name} ({business.type})
                </option>
              ))}
            </select>
          </div>

          {/* Account Options */}
          {formData.businessId && (
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.allowLayby}
                  onChange={(e) => setFormData({ ...formData, allowLayby: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-primary">Allow Layby (Payment Plans)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.allowCredit}
                  onChange={(e) => setFormData({ ...formData, allowCredit: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-primary">Allow Credit Account</span>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Customer'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
