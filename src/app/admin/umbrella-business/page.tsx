'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'
import { useToastContext } from '@/components/ui/toast'

interface UmbrellaBusinessData {
  id: string
  umbrellaBusinessName: string
  umbrellaBusinessAddress: string
  umbrellaBusinessPhone: string
  umbrellaBusinessEmail: string
  umbrellaBusinessRegistration: string
  umbrellaBusinessPhoneFormat?: string
}

export default function UmbrellaBusinessManagement() {
  const { data: session } = useSession()
  const toast = useToastContext()
  const [umbrellaData, setUmbrellaData] = useState<UmbrellaBusinessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    umbrellaBusinessName: '',
    umbrellaBusinessAddress: '',
    umbrellaBusinessPhone: '',
    umbrellaBusinessEmail: '',
    umbrellaBusinessRegistration: ''
  })

  useEffect(() => {
    fetchUmbrellaBusinessData()
  }, [])

  const fetchUmbrellaBusinessData = async () => {
    try {
      const response = await fetch('/api/admin/umbrella-business')
      if (response.ok) {
        const data = await response.json()
        setUmbrellaData(data)
        setFormData({
          umbrellaBusinessName: data.umbrellaBusinessName || 'Demo Umbrella Company',
          umbrellaBusinessAddress: data.umbrellaBusinessAddress || '',
          umbrellaBusinessPhone: data.umbrellaBusinessPhone || '',
          umbrellaBusinessEmail: data.umbrellaBusinessEmail || '',
          umbrellaBusinessRegistration: data.umbrellaBusinessRegistration || ''
        })
      }
    } catch (error) {
      console.error('Error fetching umbrella business data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handlePhoneChange = (fullPhoneNumber: string, countryCode: string, localNumber: string) => {
    setFormData(prev => ({
      ...prev,
      umbrellaBusinessPhone: fullPhoneNumber
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/admin/umbrella-business', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const updatedData = await response.json()
        setUmbrellaData(updatedData)
        toast.push('Umbrella business information updated successfully!')
      } else {
        toast.push('Failed to update umbrella business information')
      }
    } catch (error) {
      console.error('Error updating umbrella business:', error)
      toast.push('Error updating umbrella business information')
    } finally {
      setSaving(false)
    }
  }

  if (!session) {
    return (
      <ContentLayout title="☂️ Umbrella Business Management">
        <div className="text-center py-8">
          <p className="text-secondary">Please sign in to manage umbrella business settings.</p>
        </div>
      </ContentLayout>
    )
  }

  if (loading) {
    return (
      <ContentLayout title="☂️ Umbrella Business Management">
        <div className="text-center py-8">
          <p className="text-secondary">Loading...</p>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout
          title="☂️ Umbrella Business Management"
          subtitle="Manage the details of your umbrella business that appears on all employee contracts"
        >
          <div className="max-w-4xl">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-primary">Umbrella Business Details</h3>
                <span className="text-sm text-gray-500">
                  These details will appear on all employee contracts
                </span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      name="umbrellaBusinessName"
                      value={formData.umbrellaBusinessName}
                      onChange={handleInputChange}
                      required
                      className="input w-full"
                      placeholder="Enter umbrella business name"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This name will appear prominently at the top of all contracts
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Business Address
                    </label>
                    <textarea
                      name="umbrellaBusinessAddress"
                      value={formData.umbrellaBusinessAddress}
                      onChange={handleInputChange}
                      rows={3}
                      className="input w-full"
                      placeholder="Enter complete business address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Phone Number
                    </label>
                    <PhoneNumberInput
                      value={formData.umbrellaBusinessPhone}
                      onChange={handlePhoneChange}
                      placeholder="77 123 4567"
                      label=""
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="umbrellaBusinessEmail"
                      value={formData.umbrellaBusinessEmail}
                      onChange={handleInputChange}
                      className="input w-full"
                      placeholder="Enter email address"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      name="umbrellaBusinessRegistration"
                      value={formData.umbrellaBusinessRegistration}
                      onChange={handleInputChange}
                      className="input w-full"
                      placeholder="Enter business registration number"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    <p className="font-medium mb-1">Contract Impact:</p>
                    <ul className="text-xs space-y-1">
                      <li>• Business name appears as the main employer on all contracts</li>
                      <li>• Contact details are shown in the employer section</li>
                      <li>• Changes apply to all new contracts immediately</li>
                    </ul>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary"
                  >
                    {saving ? 'Updating...' : 'Update Umbrella Business'}
                  </button>
                </div>
              </form>
            </div>

            {/* Preview Section */}
            <div className="card p-6 mt-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Contract Preview</h3>
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {formData.umbrellaBusinessName.toUpperCase()}
                  </h2>
                  <div className="border-b border-gray-300 w-2/3 mx-auto mb-2"></div>
                  <h3 className="text-lg font-semibold text-gray-700">Primary Business Name</h3>
                </div>

                <div className="mt-6">
                  <h4 className="font-semibold text-gray-800 mb-2">EMPLOYER:</h4>
                  <div className="ml-4 space-y-1 text-sm">
                    <p className="font-semibold">{formData.umbrellaBusinessName}</p>
                    {formData.umbrellaBusinessAddress && (
                      <p>Address: {formData.umbrellaBusinessAddress}</p>
                    )}
                    {formData.umbrellaBusinessPhone && (
                      <p>Phone: {formData.umbrellaBusinessPhone}</p>
                    )}
                    {formData.umbrellaBusinessEmail && (
                      <p>Email: {formData.umbrellaBusinessEmail}</p>
                    )}
                    {formData.umbrellaBusinessRegistration && (
                      <p>Registration Number: {formData.umbrellaBusinessRegistration}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}