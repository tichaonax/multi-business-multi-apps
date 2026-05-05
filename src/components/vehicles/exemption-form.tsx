'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { DateInput } from '@/components/ui/date-input'
import { DocumentUpload } from '@/components/ui/document-upload'
import { useToastContext } from '@/components/ui/toast'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { Vehicle } from '@/types/vehicle'

interface ExemptionFormProps {
  vehicle: Vehicle
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

const EXEMPTION_TYPES = [
  { value: 'RADIO_TV_LICENCE', label: 'Radio/TV Licence Exemption' },
  { value: 'ROAD_USE', label: 'Road Use Exemption' },
  { value: 'INSURANCE', label: 'Insurance Exemption' },
  { value: 'OTHER', label: 'Other' },
]

export function ExemptionForm({ vehicle, isOpen, onClose, onSave }: ExemptionFormProps) {
  const toast = useToastContext()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    exemptionType: 'RADIO_TV_LICENCE',
    startDate: '',
    endDate: '',
    exemptionReason: '',
    exemptionReasonDescription: '',
    requestedByName: '',
    requestedByEmail: '',
    requestedByContact: '',
    dataCapturingOfficialName: '',
    loginUserId: '',
    issueOffice: '',
    issueDate: '',
    documentUrl: '',
    documentName: '',
    notes: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleDocUpload = async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    form.append('vehicleId', vehicle.id)
    try {
      const res = await fetchWithValidation('/api/vehicles/licenses/documents', {
        method: 'POST',
        body: form,
      })
      if (res?.documentUrl) {
        setFormData(prev => ({ ...prev, documentUrl: res.documentUrl, documentName: res.documentName || file.name }))
      }
    } catch {
      toast.error('Upload failed')
    }
  }

  const handleDocRemove = () => {
    setFormData(prev => ({ ...prev, documentUrl: '', documentName: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        vehicleId: vehicle.id,
        ...formData,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        issueDate: formData.issueDate || undefined,
        requestedByEmail: formData.requestedByEmail || undefined,
        documentUrl: formData.documentUrl || undefined,
        documentName: formData.documentName || undefined,
        notes: formData.notes || undefined,
      }

      const res = await fetchWithValidation('/api/vehicles/exemptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res?.success) {
        toast.success('Exemption certificate recorded')
        onSave()
        onClose()
      } else {
        toast.error(res?.error || 'Failed to save exemption')
      }
    } catch {
      toast.error('Failed to save exemption')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const inputClass = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-primary transition-colors'
  const labelClass = 'block text-xs font-medium text-secondary mb-1'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70">
      <div className="bg-white dark:bg-gray-950 rounded-xl shadow-2xl ring-2 ring-green-500/40 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0 bg-green-50 dark:bg-green-950/40">
          <div>
            <h2 className="text-base font-semibold text-primary">Record Exemption Certificate</h2>
            <p className="text-xs text-secondary mt-0.5">{vehicle.licensePlate} — {vehicle.make} {vehicle.model}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-green-100 dark:hover:bg-green-900/30 text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form id="exemption-form" onSubmit={handleSubmit} className="overflow-y-auto overflow-x-hidden flex-1 px-5 py-4 space-y-4">
          {/* Exemption Particulars */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400 mb-2 pb-1 border-b border-green-200 dark:border-green-800">Exemption Particulars</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3">
                <label className={labelClass}>Exemption Type *</label>
                <select name="exemptionType" value={formData.exemptionType} onChange={handleChange} className={inputClass} required>
                  {EXEMPTION_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Start Date</label>
                <DateInput name="startDate" value={formData.startDate} onChange={v => setFormData(p => ({ ...p, startDate: v }))} />
              </div>
              <div>
                <label className={labelClass}>End Date</label>
                <DateInput name="endDate" value={formData.endDate} onChange={v => setFormData(p => ({ ...p, endDate: v }))} />
              </div>
              <div>
                <label className={labelClass}>Exemption Reason</label>
                <input name="exemptionReason" value={formData.exemptionReason} onChange={handleChange} className={inputClass} placeholder="e.g. NO RADIO/TV FITTED" />
              </div>
              <div className="col-span-3">
                <label className={labelClass}>Reason Description</label>
                <input name="exemptionReasonDescription" value={formData.exemptionReasonDescription} onChange={handleChange} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Requested By */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400 mb-2 pb-1 border-b border-green-200 dark:border-green-800">Requested By</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Name</label>
                <input name="requestedByName" value={formData.requestedByName} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" name="requestedByEmail" value={formData.requestedByEmail} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Contact Number</label>
                <input name="requestedByContact" value={formData.requestedByContact} onChange={handleChange} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Data Capturing Official */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400 mb-2 pb-1 border-b border-green-200 dark:border-green-800">Data Capturing Official</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Name and Surname</label>
                <input name="dataCapturingOfficialName" value={formData.dataCapturingOfficialName} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Login User ID</label>
                <input name="loginUserId" value={formData.loginUserId} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Issue Office</label>
                <input name="issueOffice" value={formData.issueOffice} onChange={handleChange} className={inputClass} placeholder="e.g. ZAS HARARE SHOWGROUNDS" />
              </div>
              <div>
                <label className={labelClass}>Issue Date</label>
                <DateInput name="issueDate" value={formData.issueDate} onChange={v => setFormData(p => ({ ...p, issueDate: v }))} />
              </div>
            </div>
          </div>

          {/* Certificate + Notes side by side */}
          <div className="grid grid-cols-2 gap-4 items-start">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400 mb-2 pb-1 border-b border-green-200 dark:border-green-800">Certificate Document</h3>
              <DocumentUpload
                label="Certificate (PDF/JPG)"
                currentUrl={formData.documentUrl}
                currentName={formData.documentName}
                onUpload={handleDocUpload}
                onRemove={handleDocRemove}
              />
            </div>
            <div>
              <label className={labelClass}>Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows={4} className={`${inputClass} resize-none`} placeholder="Optional notes..." />
            </div>
          </div>
        </form>

        {/* Sticky footer */}
        <div className="flex justify-end gap-3 px-5 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-secondary bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            Cancel
          </button>
          <button form="exemption-form" type="submit" disabled={loading} className="px-5 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors">
            {loading ? 'Saving...' : 'Save Exemption'}
          </button>
        </div>
      </div>
    </div>
  )
}
