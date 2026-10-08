'use client'

import { useState, useEffect } from 'react'
import { X, RefreshCw } from 'lucide-react'
import { DateInput } from '@/components/ui/date-input'
import { useToastContext } from '@/components/ui/toast'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { Vehicle } from '@/types/vehicle'

type LicensingStatus = 'NON_EXEMPT' | 'EXEMPT' | 'RETIRED'

interface VehicleStatusModalProps {
  vehicle: Vehicle
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

// Spec §6 — RETIRED -> EXEMPT is deliberately absent: a retired vehicle
// must be reinstated to Non-exempt first (§6.1), not offered as a direct
// destination at all.
const PERMITTED_DESTINATIONS: Record<LicensingStatus, { value: LicensingStatus; label: string; description: string }[]> = {
  NON_EXEMPT: [
    { value: 'EXEMPT', label: 'Exempt', description: 'Replace registration & insurance with an exemption license' },
    { value: 'RETIRED', label: 'Retired', description: 'Stop all licensing tracking for this vehicle' },
  ],
  EXEMPT: [
    { value: 'NON_EXEMPT', label: 'Non-exempt', description: 'Resume standard registration & insurance tracking' },
    { value: 'RETIRED', label: 'Retired', description: 'Stop all licensing tracking for this vehicle' },
  ],
  RETIRED: [
    { value: 'NON_EXEMPT', label: 'Non-exempt (Reinstate)', description: 'Bring this vehicle back into service — requires valid registration & insurance details' },
  ],
}

const STATUS_LABEL: Record<LicensingStatus, string> = {
  NON_EXEMPT: 'Non-exempt',
  EXEMPT: 'Exempt',
  RETIRED: 'Retired',
}

const emptyLicenseFields = { licenseNumber: '', issuingAuthority: '', issueDate: '', expiryDate: '', renewalCost: '', lateFee: '', reminderDays: '30' }
const emptyExemptionFields = { licenseNumber: '', issuingAuthority: '', issueDate: '', expiryDate: '', exemptionFee: '', reminderDays: '30' }

export function VehicleStatusModal({ vehicle, isOpen, onClose, onSave }: VehicleStatusModalProps) {
  const toast = useToastContext()
  const [destination, setDestination] = useState<LicensingStatus | null>(null)
  const [registration, setRegistration] = useState(emptyLicenseFields)
  const [insurance, setInsurance] = useState(emptyLicenseFields)
  const [exemption, setExemption] = useState(emptyExemptionFields)
  const [retirementReason, setRetirementReason] = useState('')
  const [retirementReasonDescription, setRetirementReasonDescription] = useState('')
  const [reasons, setReasons] = useState<{ id: string; name: string }[]>([])
  const [showNewReasonInput, setShowNewReasonInput] = useState(false)
  const [newReasonName, setNewReasonName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Reset to the picker every time the modal opens for a (possibly
  // different) vehicle — selecting a destination must never mutate
  // anything until the save actually succeeds (spec §7.1, §7.4).
  useEffect(() => {
    if (isOpen) {
      setDestination(null)
      setRegistration(emptyLicenseFields)
      setInsurance(emptyLicenseFields)
      setExemption(emptyExemptionFields)
      setRetirementReason('')
      setRetirementReasonDescription('')
      setError('')
    }
  }, [isOpen, vehicle.id])

  useEffect(() => {
    if (!isOpen) return
    fetchWithValidation('/api/vehicles/retirement-reasons')
      .then(res => { if (res?.success) setReasons(res.data) })
      .catch(() => {})
  }, [isOpen])

  if (!isOpen) return null

  const currentStatus = vehicle.licensingStatus as LicensingStatus
  const destinations = PERMITTED_DESTINATIONS[currentStatus] ?? []

  const addNewReason = async () => {
    const name = newReasonName.trim()
    if (!name) return
    try {
      const res = await fetchWithValidation('/api/vehicles/retirement-reasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (res?.success) {
        setReasons(prev => prev.some(r => r.name === res.data.name) ? prev : [...prev, res.data])
        setRetirementReason(res.data.name)
        setShowNewReasonInput(false)
        setNewReasonName('')
      }
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Failed to add reason')
    }
  }

  const handleSubmit = async () => {
    if (!destination) return
    setError('')

    let payload: any = { destinationStatus: destination }

    if (destination === 'NON_EXEMPT') {
      if (!registration.licenseNumber || !registration.issueDate || !registration.expiryDate) {
        setError('Registration details are required'); return
      }
      if (!insurance.licenseNumber || !insurance.issueDate || !insurance.expiryDate) {
        setError('Insurance details are required'); return
      }
      payload.registration = {
        licenseNumber: registration.licenseNumber,
        issuingAuthority: registration.issuingAuthority || undefined,
        issueDate: registration.issueDate,
        expiryDate: registration.expiryDate,
        renewalCost: registration.renewalCost ? parseFloat(registration.renewalCost) : undefined,
        lateFee: registration.lateFee ? parseFloat(registration.lateFee) : undefined,
        reminderDays: parseInt(registration.reminderDays) || 30,
      }
      payload.insurance = {
        licenseNumber: insurance.licenseNumber,
        issuingAuthority: insurance.issuingAuthority || undefined,
        issueDate: insurance.issueDate,
        expiryDate: insurance.expiryDate,
        renewalCost: insurance.renewalCost ? parseFloat(insurance.renewalCost) : undefined,
        lateFee: insurance.lateFee ? parseFloat(insurance.lateFee) : undefined,
        reminderDays: parseInt(insurance.reminderDays) || 30,
      }
    } else if (destination === 'EXEMPT') {
      if (!exemption.licenseNumber || !exemption.issueDate || !exemption.expiryDate) {
        setError('Exemption license details are required'); return
      }
      payload.exemption = {
        licenseNumber: exemption.licenseNumber,
        issuingAuthority: exemption.issuingAuthority || undefined,
        issueDate: exemption.issueDate,
        expiryDate: exemption.expiryDate,
        exemptionFee: exemption.exemptionFee ? parseFloat(exemption.exemptionFee) : undefined,
        reminderDays: parseInt(exemption.reminderDays) || 30,
      }
    } else if (destination === 'RETIRED') {
      if (!retirementReason) { setError('A retirement reason is required'); return }
      if (retirementReason === 'Other' && !retirementReasonDescription.trim()) {
        setError('A description is required when the reason is "Other"'); return
      }
      payload.retirementReason = retirementReason
      payload.retirementReasonDescription = retirementReasonDescription.trim() || undefined
    }

    setLoading(true)
    try {
      await fetchWithValidation(`/api/vehicles/${vehicle.id}/status-transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      toast.push(`Vehicle status changed to ${STATUS_LABEL[destination]}`)
      onSave()
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to change vehicle status'
      setError(msg)
      toast.push(msg)
    } finally {
      setLoading(false)
    }
  }

  const fieldClass = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelClass = 'block text-xs font-medium text-secondary mb-1'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl ring-2 ring-amber-500/30 w-full max-w-2xl flex flex-col max-h-[90vh] overflow-x-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-semibold text-primary flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-amber-600" />
            Change Vehicle Status — {vehicle.licensePlate}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto overflow-x-hidden flex-1 px-5 py-4 space-y-4">
          <div className="text-sm text-secondary">
            Current status: <span className="font-semibold text-primary">{STATUS_LABEL[currentStatus]}</span>
          </div>

          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {!destination ? (
            // Step 1 — pick a permitted destination only (no illegal
            // transition is ever offered as a button, e.g. Retired -> Exempt).
            <div className="space-y-2">
              <p className={labelClass}>Change to:</p>
              {destinations.length === 0 && (
                <p className="text-sm text-secondary">No status changes are available for this vehicle.</p>
              )}
              {destinations.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDestination(d.value)}
                  className="w-full text-left px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
                >
                  <div className="text-sm font-semibold text-primary">{d.label}</div>
                  <div className="text-xs text-secondary">{d.description}</div>
                </button>
              ))}
              {currentStatus === 'RETIRED' && (
                <p className="text-xs text-secondary italic mt-2">
                  To become Exempt, reinstate as Non-exempt first, then change status again.
                </p>
              )}
            </div>
          ) : destination === 'NON_EXEMPT' ? (
            <div className="space-y-4">
              <button type="button" onClick={() => setDestination(null)} className="text-xs text-amber-600 hover:underline">← Choose a different status</button>
              <div>
                <p className="text-sm font-semibold text-primary mb-2">Registration</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>License Number *</label>
                    <input type="text" value={registration.licenseNumber} onChange={e => setRegistration({ ...registration, licenseNumber: e.target.value })} className={fieldClass} required />
                  </div>
                  <div>
                    <label className={labelClass}>Issuing Authority</label>
                    <input type="text" value={registration.issuingAuthority} onChange={e => setRegistration({ ...registration, issuingAuthority: e.target.value })} className={fieldClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Issue Date *</label>
                    <DateInput value={registration.issueDate} onChange={v => setRegistration({ ...registration, issueDate: v })} required />
                  </div>
                  <div>
                    <label className={labelClass}>Expiry Date *</label>
                    <DateInput value={registration.expiryDate} onChange={v => setRegistration({ ...registration, expiryDate: v })} required />
                  </div>
                  <div>
                    <label className={labelClass}>Renewal Cost</label>
                    <input type="number" step="0.01" value={registration.renewalCost} onChange={e => setRegistration({ ...registration, renewalCost: e.target.value })} className={fieldClass} />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-primary mb-2">Insurance</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>License Number *</label>
                    <input type="text" value={insurance.licenseNumber} onChange={e => setInsurance({ ...insurance, licenseNumber: e.target.value })} className={fieldClass} required />
                  </div>
                  <div>
                    <label className={labelClass}>Issuing Authority</label>
                    <input type="text" value={insurance.issuingAuthority} onChange={e => setInsurance({ ...insurance, issuingAuthority: e.target.value })} className={fieldClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Issue Date *</label>
                    <DateInput value={insurance.issueDate} onChange={v => setInsurance({ ...insurance, issueDate: v })} required />
                  </div>
                  <div>
                    <label className={labelClass}>Expiry Date *</label>
                    <DateInput value={insurance.expiryDate} onChange={v => setInsurance({ ...insurance, expiryDate: v })} required />
                  </div>
                  <div>
                    <label className={labelClass}>Renewal Cost</label>
                    <input type="number" step="0.01" value={insurance.renewalCost} onChange={e => setInsurance({ ...insurance, renewalCost: e.target.value })} className={fieldClass} />
                  </div>
                </div>
              </div>
            </div>
          ) : destination === 'EXEMPT' ? (
            <div className="space-y-3">
              <button type="button" onClick={() => setDestination(null)} className="text-xs text-amber-600 hover:underline">← Choose a different status</button>
              <p className="text-sm font-semibold text-primary">Exemption License</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Exemption License Number *</label>
                  <input type="text" value={exemption.licenseNumber} onChange={e => setExemption({ ...exemption, licenseNumber: e.target.value })} className={fieldClass} required />
                </div>
                <div>
                  <label className={labelClass}>Issuing Authority</label>
                  <input type="text" value={exemption.issuingAuthority} onChange={e => setExemption({ ...exemption, issuingAuthority: e.target.value })} className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Issue Date *</label>
                  <DateInput value={exemption.issueDate} onChange={v => setExemption({ ...exemption, issueDate: v })} required />
                </div>
                <div>
                  <label className={labelClass}>Expiry Date *</label>
                  <DateInput value={exemption.expiryDate} onChange={v => setExemption({ ...exemption, expiryDate: v })} required />
                </div>
                <div>
                  <label className={labelClass}>Exemption Fee</label>
                  <input type="number" step="0.01" value={exemption.exemptionFee} onChange={e => setExemption({ ...exemption, exemptionFee: e.target.value })} className={fieldClass} />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <button type="button" onClick={() => setDestination(null)} className="text-xs text-amber-600 hover:underline">← Choose a different status</button>
              <p className="text-sm font-semibold text-primary">Retirement Details</p>
              <div>
                <label className={labelClass}>Retirement Reason *</label>
                <select value={retirementReason} onChange={e => setRetirementReason(e.target.value)} className={fieldClass} required>
                  <option value="">Select a reason...</option>
                  {reasons.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
                {!showNewReasonInput ? (
                  <button type="button" onClick={() => setShowNewReasonInput(true)} className="text-xs text-amber-600 hover:underline mt-1">+ Add new reason</button>
                ) : (
                  <div className="flex items-center gap-2 mt-2">
                    <input type="text" value={newReasonName} onChange={e => setNewReasonName(e.target.value)} placeholder="New reason" className={fieldClass} />
                    <button type="button" onClick={addNewReason} className="px-3 py-2 text-xs bg-amber-600 text-white rounded-md hover:bg-amber-700 shrink-0">Add</button>
                  </div>
                )}
              </div>
              {retirementReason === 'Other' && (
                <div>
                  <label className={labelClass}>Explanation *</label>
                  <textarea value={retirementReasonDescription} onChange={e => setRetirementReasonDescription(e.target.value)} className={fieldClass} rows={3} required />
                </div>
              )}
            </div>
          )}
        </div>

        {destination && (
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-secondary hover:text-primary">Cancel</button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : `Save — Change to ${STATUS_LABEL[destination]}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
