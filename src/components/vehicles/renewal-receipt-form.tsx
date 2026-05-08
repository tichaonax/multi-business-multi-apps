'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { DateInput } from '@/components/ui/date-input'
import { DocumentUpload } from '@/components/ui/document-upload'
import { useToastContext } from '@/components/ui/toast'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { Vehicle } from '@/types/vehicle'

interface RenewalReceiptFormProps {
  vehicle: Vehicle
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

const emptyLicense = () => ({
  include: false,
  licenseNumber: '',
  issuingAuthority: '',
  issueDate: '',
  expiryDate: '',
  renewalCost: '',
  usage: '',
  lateFee: '',
  isExempt: false,
  reminderDays: '30',
})

const inputClass = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-primary transition-colors'
const labelClass = 'block text-xs font-medium text-secondary mb-1'

interface LicenseFieldsProps {
  lic: ReturnType<typeof emptyLicense>
  setter: React.Dispatch<React.SetStateAction<any>>
  showUsage?: boolean
  licId: 'radio' | 'insurance' | 'reg'
  onLicChange: (setter: React.Dispatch<React.SetStateAction<any>>, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
}

const LicenseFields = ({ lic, setter, showUsage, licId, onLicChange }: LicenseFieldsProps) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        id={`include-${licId}`}
        checked={lic.include}
        onChange={e => setter((p: any) => ({ ...p, include: e.target.checked }))}
        className="w-4 h-4 text-blue-600 rounded"
      />
      <label htmlFor={`include-${licId}`} className="text-sm text-secondary">
        Include this licence in the renewal
      </label>
    </div>

    {lic.include && (
      <>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Licence Number *</label>
            <input name="licenseNumber" value={lic.licenseNumber} onChange={e => onLicChange(setter, e)} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Issuing Authority</label>
            <input name="issuingAuthority" value={lic.issuingAuthority} onChange={e => onLicChange(setter, e)} className={inputClass} placeholder={lic.isExempt ? 'NOT APPLICABLE' : ''} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Issue Date *</label>
            <DateInput name="issueDate" value={lic.issueDate} onChange={v => setter((p: any) => ({ ...p, issueDate: v }))} required />
          </div>
          <div>
            <label className={labelClass}>Expiry Date *</label>
            <DateInput name="expiryDate" value={lic.expiryDate} onChange={v => setter((p: any) => ({ ...p, expiryDate: v }))} required />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Renewal Cost</label>
            <input type="number" name="renewalCost" value={lic.renewalCost} onChange={e => onLicChange(setter, e)} className={inputClass} min="0" step="0.01" placeholder="0" />
          </div>
          <div>
            <label className={labelClass}>Late Fee</label>
            <input type="number" name="lateFee" value={lic.lateFee} onChange={e => onLicChange(setter, e)} className={inputClass} min="0" step="0.01" placeholder="0" />
          </div>
          <div>
            <label className={labelClass}>Reminder Days</label>
            <input type="number" name="reminderDays" value={lic.reminderDays} onChange={e => onLicChange(setter, e)} className={inputClass} min="1" max="365" />
          </div>
        </div>

        {showUsage && (
          <div>
            <label className={labelClass}>Usage</label>
            <input name="usage" value={lic.usage} onChange={e => onLicChange(setter, e)} className={inputClass} placeholder="e.g. PRIVATE VEHICLE" />
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer">
          <input
            type="checkbox"
            id={`exempt-${licId}`}
            name="isExempt"
            checked={lic.isExempt}
            onChange={e => setter((p: any) => ({ ...p, isExempt: e.target.checked }))}
            className="w-4 h-4 text-blue-600 rounded"
          />
          Exempt (licence waived / not applicable)
        </label>
      </>
    )}
  </div>
)

export function RenewalReceiptForm({ vehicle, isOpen, onClose, onSave }: RenewalReceiptFormProps) {
  const toast = useToastContext()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'REGISTRATION' | 'RADIO' | 'INSURANCE'>('REGISTRATION')

  const [receipt, setReceipt] = useState({
    receiptNumber: '',
    transactionType: 'VEHICLE LICENSING',
    datePaid: '',
    paymentReceivedBy: '',
    officeOfIssue: '',
    arrears: '',
    penalties: '',
    administrationFee: '',
    transactionFee: '',
    surcharge: '',
    debtManagementAmount: '',
    deposit: '',
    totalPaid: '',
    currency: 'ZiG',
    isExempt: vehicle.isExempt || false,
    documentUrl: '',
    documentName: '',
    notes: '',
  })

  const [registrationLic, setRegistrationLic] = useState({
    ...emptyLicense(),
    include: true,
    licenseNumber: vehicle.licensePlate,
  })
  const [radioLic, setRadioLic] = useState(emptyLicense())
  const [insuranceLic, setInsuranceLic] = useState(emptyLicense())

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setReceipt(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleLicChange = (
    setter: React.Dispatch<React.SetStateAction<ReturnType<typeof emptyLicense> & { include?: boolean; licenseNumber?: string }>>,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    setter(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
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
        setReceipt(prev => ({ ...prev, documentUrl: res.documentUrl, documentName: res.documentName || file.name }))
      }
    } catch {
      toast.error('Upload failed')
    }
  }

  const handleDocRemove = () => {
    setReceipt(prev => ({ ...prev, documentUrl: '', documentName: '' }))
  }

  const parseNum = (v: string) => (v !== '' ? parseFloat(v) : undefined)

  const buildLicenseEntries = () => {
    const entries: object[] = []
    if (registrationLic.include) {
      entries.push({
        licenseType: 'REGISTRATION',
        licenseNumber: registrationLic.licenseNumber,
        issuingAuthority: registrationLic.issuingAuthority || undefined,
        issueDate: registrationLic.issueDate,
        expiryDate: registrationLic.expiryDate,
        renewalCost: parseNum(registrationLic.renewalCost),
        lateFee: parseNum(registrationLic.lateFee),
        isExempt: registrationLic.isExempt,
        reminderDays: parseInt(registrationLic.reminderDays) || 30,
      })
    }
    if (radioLic.include) {
      entries.push({
        licenseType: 'RADIO',
        licenseNumber: radioLic.licenseNumber,
        issuingAuthority: radioLic.issuingAuthority || undefined,
        issueDate: radioLic.issueDate,
        expiryDate: radioLic.expiryDate,
        usage: radioLic.usage || undefined,
        renewalCost: parseNum(radioLic.renewalCost),
        lateFee: parseNum(radioLic.lateFee),
        isExempt: radioLic.isExempt,
        reminderDays: parseInt(radioLic.reminderDays) || 30,
      })
    }
    if (insuranceLic.include) {
      entries.push({
        licenseType: 'INSURANCE',
        licenseNumber: insuranceLic.licenseNumber,
        issuingAuthority: insuranceLic.issuingAuthority || undefined,
        issueDate: insuranceLic.issueDate,
        expiryDate: insuranceLic.expiryDate,
        renewalCost: parseNum(insuranceLic.renewalCost),
        lateFee: parseNum(insuranceLic.lateFee),
        isExempt: insuranceLic.isExempt,
        reminderDays: parseInt(insuranceLic.reminderDays) || 30,
      })
    }
    return entries
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        vehicleId: vehicle.id,
        receiptNumber: receipt.receiptNumber || undefined,
        transactionType: receipt.transactionType || undefined,
        datePaid: receipt.datePaid || undefined,
        paymentReceivedBy: receipt.paymentReceivedBy || undefined,
        officeOfIssue: receipt.officeOfIssue || undefined,
        arrears: parseNum(receipt.arrears),
        penalties: parseNum(receipt.penalties),
        administrationFee: parseNum(receipt.administrationFee),
        transactionFee: parseNum(receipt.transactionFee),
        surcharge: receipt.isExempt ? undefined : parseNum(receipt.surcharge),
        debtManagementAmount: receipt.isExempt ? parseNum(receipt.debtManagementAmount) : undefined,
        deposit: parseNum(receipt.deposit),
        totalPaid: parseNum(receipt.totalPaid),
        currency: receipt.currency,
        isExempt: receipt.isExempt,
        documentUrl: receipt.documentUrl || undefined,
        documentName: receipt.documentName || undefined,
        notes: receipt.notes || undefined,
        licenses: buildLicenseEntries(),
      }

      const res = await fetchWithValidation('/api/vehicles/renewal-receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res?.success) {
        toast.success('Renewal receipt recorded')
        onSave()
        onClose()
      } else {
        toast.error(res?.error || 'Failed to save receipt')
      }
    } catch {
      toast.error('Failed to save receipt')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl ring-2 ring-purple-500/30 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-primary">Record Renewal Receipt</h2>
            <p className="text-xs text-secondary mt-0.5">{vehicle.licensePlate} — {vehicle.make} {vehicle.model}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form id="renewal-receipt-form" onSubmit={handleSubmit} className="overflow-y-auto overflow-x-hidden flex-1 p-4 space-y-5">
          {/* Section 1: Receipt Header */}
          <div>
            <h3 className="text-sm font-semibold text-primary mb-3 pb-1 border-b border-gray-200 dark:border-gray-700">Receipt Details</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Receipt Number</label>
                <input name="receiptNumber" value={receipt.receiptNumber} onChange={handleReceiptChange} className={inputClass} placeholder="e.g. R025394267" />
              </div>
              <div>
                <label className={labelClass}>Transaction Type</label>
                <input name="transactionType" value={receipt.transactionType} onChange={handleReceiptChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Date Paid</label>
                <DateInput name="datePaid" value={receipt.datePaid} onChange={v => setReceipt(p => ({ ...p, datePaid: v }))} />
              </div>
              <div>
                <label className={labelClass}>Currency</label>
                <select name="currency" value={receipt.currency} onChange={handleReceiptChange} className={inputClass}>
                  <option value="ZiG">ZiG</option>
                  <option value="USD">USD</option>
                  <option value="ZWL">ZWL</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Payment Received By</label>
                <input name="paymentReceivedBy" value={receipt.paymentReceivedBy} onChange={handleReceiptChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Office of Issue</label>
                <input name="officeOfIssue" value={receipt.officeOfIssue} onChange={handleReceiptChange} className={inputClass} />
              </div>
            </div>
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input
                type="checkbox"
                id="receiptIsExempt"
                name="isExempt"
                checked={receipt.isExempt}
                onChange={handleReceiptChange}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-secondary">Exempt renewal (minimal / zero fees — use Debt Management Amount instead of Surcharge)</span>
            </label>
          </div>

          {/* Section 2: Payment Breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-primary mb-3 pb-1 border-b border-gray-200 dark:border-gray-700">Payment Breakdown</h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { key: 'arrears', label: 'Arrears' },
                { key: 'penalties', label: 'Penalties' },
                { key: 'administrationFee', label: 'Admin Fee' },
                { key: 'transactionFee', label: 'Transaction Fee' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className={labelClass}>{label}</label>
                  <input type="number" name={key} value={(receipt as any)[key]} onChange={handleReceiptChange} className={inputClass} min="0" step="0.01" placeholder="0" />
                </div>
              ))}
              {receipt.isExempt ? (
                <div>
                  <label className={labelClass}>Debt Mgmt Amount</label>
                  <input type="number" name="debtManagementAmount" value={receipt.debtManagementAmount} onChange={handleReceiptChange} className={inputClass} min="0" step="0.01" placeholder="0" />
                </div>
              ) : (
                <div>
                  <label className={labelClass}>Surcharge</label>
                  <input type="number" name="surcharge" value={receipt.surcharge} onChange={handleReceiptChange} className={inputClass} min="0" step="0.01" placeholder="0" />
                </div>
              )}
              <div>
                <label className={labelClass}>Deposit</label>
                <input type="number" name="deposit" value={receipt.deposit} onChange={handleReceiptChange} className={inputClass} min="0" step="0.01" placeholder="0" />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Total Paid</label>
                <input type="number" name="totalPaid" value={receipt.totalPaid} onChange={handleReceiptChange} className={inputClass} min="0" step="0.01" placeholder="0" />
              </div>
            </div>
          </div>

          {/* Section 3-5: Licence Tabs */}
          <div>
            <h3 className="text-sm font-semibold text-primary mb-3 pb-1 border-b border-gray-200 dark:border-gray-700">Licences Renewed</h3>
            <div className="flex gap-1 mb-3">
              {(['REGISTRATION', 'RADIO', 'INSURANCE'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-secondary hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tab === 'REGISTRATION' ? 'Vehicle Lic.' : tab === 'RADIO' ? 'Radio/TV' : 'Insurance'}
                  {tab === 'REGISTRATION' && registrationLic.include && <span className="ml-1 text-green-400">✓</span>}
                  {tab === 'RADIO' && radioLic.include && <span className="ml-1 text-green-400">✓</span>}
                  {tab === 'INSURANCE' && insuranceLic.include && <span className="ml-1 text-green-400">✓</span>}
                </button>
              ))}
            </div>
            {activeTab === 'REGISTRATION' && <LicenseFields lic={registrationLic} setter={setRegistrationLic} licId="reg" onLicChange={handleLicChange} />}
            {activeTab === 'RADIO' && <LicenseFields lic={radioLic} setter={setRadioLic} showUsage licId="radio" onLicChange={handleLicChange} />}
            {activeTab === 'INSURANCE' && <LicenseFields lic={insuranceLic} setter={setInsuranceLic} licId="insurance" onLicChange={handleLicChange} />}
          </div>

          {/* Section 6: Document + Notes side by side */}
          <div className="grid grid-cols-2 gap-4 items-start">
            <div>
              <h3 className="text-sm font-semibold text-primary mb-2 pb-1 border-b border-gray-200 dark:border-gray-700">Scanned Receipt</h3>
              <DocumentUpload
                label="Receipt Document (PDF/JPG)"
                currentUrl={receipt.documentUrl}
                currentName={receipt.documentName}
                onUpload={handleDocUpload}
                onRemove={handleDocRemove}
              />
            </div>
            <div>
              <label className={labelClass}>Notes</label>
              <textarea name="notes" value={receipt.notes} onChange={handleReceiptChange} rows={4} className={`${inputClass} resize-none`} placeholder="Optional notes..." />
            </div>
          </div>
        </form>

        {/* Sticky footer */}
        <div className="flex justify-end gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-secondary bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            Cancel
          </button>
          <button form="renewal-receipt-form" type="submit" disabled={loading} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? 'Saving...' : 'Save Receipt'}
          </button>
        </div>
      </div>
    </div>
  )
}
