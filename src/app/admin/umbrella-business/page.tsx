'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
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
  logoImageId?: string | null
  invoiceCounter?: number
  quotationCounter?: number
  invoiceStartNumber?: number
  quotationStartNumber?: number
}

export default function UmbrellaBusinessManagement() {
  const { data: session } = useSession()
  const toast = useToastContext()
  const [umbrellaData, setUmbrellaData] = useState<UmbrellaBusinessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [invoiceStartNumber, setInvoiceStartNumber] = useState('')
  const [quotationStartNumber, setQuotationStartNumber] = useState('')
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
        setInvoiceStartNumber(String(data.invoiceStartNumber ?? 0))
        setQuotationStartNumber(String(data.quotationStartNumber ?? 0))
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2 MB')
      return
    }
    setLogoUploading(true)
    try {
      const formPayload = new FormData()
      formPayload.append('files', file)
      const uploadRes = await fetch('/api/universal/images', { method: 'POST', body: formPayload })
      if (!uploadRes.ok) { toast.error('Upload failed'); return }
      const uploadJson = await uploadRes.json()
      const logoImageId: string = uploadJson.data?.[0]?.filename
      const patchRes = await fetch('/api/admin/umbrella-business', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoImageId }),
      })
      if (patchRes.ok) {
        setUmbrellaData((prev) => prev ? { ...prev, logoImageId } : prev)
        toast.push('Logo updated successfully!')
      } else {
        toast.error('Failed to save logo')
      }
    } catch {
      toast.error('Upload error')
    } finally {
      setLogoUploading(false)
      e.target.value = ''
    }
  }

  const handleRemoveLogo = async () => {
    setLogoUploading(true)
    try {
      const res = await fetch('/api/admin/umbrella-business', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoImageId: null }),
      })
      if (res.ok) {
        setUmbrellaData((prev) => prev ? { ...prev, logoImageId: null } : prev)
        toast.push('Logo removed')
      }
    } finally {
      setLogoUploading(false)
    }
  }

  const handleSaveInvoiceSettings = async () => {
    try {
      const res = await fetch('/api/admin/umbrella-business', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceStartNumber: parseInt(invoiceStartNumber) || 0,
          quotationStartNumber: parseInt(quotationStartNumber) || 0,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        setUmbrellaData((prev) => prev ? { ...prev, ...json.data } : prev)
        toast.push('Invoice settings saved!')
      } else {
        toast.error('Failed to save')
      }
    } catch {
      toast.error('Error saving settings')
    }
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
        toast.error('Failed to update umbrella business information')
      }
    } catch (error) {
      console.error('Error updating umbrella business:', error)
      toast.error('Error updating umbrella business information')
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
                      className="input w-full px-4 py-2.5 text-base"
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
                      className="input w-full px-4 py-2.5 text-base"
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
                      className="input w-full px-4 py-2.5 text-base"
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
                      className="input w-full px-4 py-2.5 text-base"
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

            {/* Company Logo */}
            <div className="card p-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-primary">Company Logo</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Appears on invoices and quotations. JPG, PNG or WebP, max 2 MB.</p>
                </div>
              </div>
              <div className="flex items-start gap-6">
                {/* Preview */}
                <div className="w-40 h-24 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-800 shrink-0 overflow-hidden">
                  {umbrellaData?.logoImageId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/images/${umbrellaData.logoImageId}`}
                      alt="Company logo"
                      className="max-h-20 max-w-36 object-contain"
                    />
                  ) : (
                    <span className="text-gray-300 dark:text-gray-600 text-3xl">🏢</span>
                  )}
                </div>
                {/* Actions */}
                <div className="space-y-2">
                  <label className={`inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg cursor-pointer transition-colors ${logoUploading ? 'opacity-50 pointer-events-none' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                    {logoUploading ? 'Uploading…' : '📤 Upload Logo'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                  </label>
                  {umbrellaData?.logoImageId && (
                    <button
                      onClick={handleRemoveLogo}
                      disabled={logoUploading}
                      className="block text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400"
                    >
                      Remove logo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Invoice / Quotation Settings */}
            <div className="card p-6 mt-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-primary">Invoice & Quotation Numbering</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Set a starting number if you have existing paper invoices or quotations. The next document will use the next number after the start value.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Invoice start number
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 font-mono">INV-</span>
                    <input
                      type="number"
                      min="0"
                      value={invoiceStartNumber}
                      onChange={(e) => setInvoiceStartNumber(e.target.value)}
                      className="input w-28 px-3 py-2 text-sm font-mono"
                      placeholder="0"
                    />
                  </div>
                  {umbrellaData?.invoiceCounter !== undefined && (
                    <p className="text-xs text-gray-400 mt-1">
                      Current counter: {umbrellaData.invoiceCounter} → next will be INV-{String((umbrellaData.invoiceCounter ?? 0) + 1).padStart(4, '0')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Quotation start number
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 font-mono">QUO-</span>
                    <input
                      type="number"
                      min="0"
                      value={quotationStartNumber}
                      onChange={(e) => setQuotationStartNumber(e.target.value)}
                      className="input w-28 px-3 py-2 text-sm font-mono"
                      placeholder="0"
                    />
                  </div>
                  {umbrellaData?.quotationCounter !== undefined && (
                    <p className="text-xs text-gray-400 mt-1">
                      Current counter: {umbrellaData.quotationCounter} → next will be QUO-{String((umbrellaData.quotationCounter ?? 0) + 1).padStart(4, '0')}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleSaveInvoiceSettings}
                className="btn-primary text-sm"
              >
                Save Numbering Settings
              </button>
            </div>

            {/* Preview Section */}
            <div className="card p-6 mt-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Contract Preview</h3>
              <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {formData.umbrellaBusinessName.toUpperCase()}
                  </h2>
                  <div className="border-b border-gray-300 dark:border-gray-600 w-2/3 mx-auto mb-2"></div>
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Primary Business Name</h3>
                </div>

                <div className="mt-6">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">EMPLOYER:</h4>
                  <div className="ml-4 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{formData.umbrellaBusinessName}</p>
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
    </ProtectedRoute>
  )
}