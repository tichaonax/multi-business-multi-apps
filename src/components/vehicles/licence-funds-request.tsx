'use client'

// MBM-346: the "Request funds" side of the licence renewal window, and the
// status banner both sides show.
//
// Often the first step of a renewal is asking for the money: this sends an
// ordinary expense (combo) request — one line, a Licensing (or Insurance)
// cost for this vehicle and licence type — to the approvers. It carries no
// new expiry date, so approving it records the cost against the vehicle but
// does not create a licence; the user enters the licence once it is bought
// (the "Enter licence" tab). See GET /api/vehicles/[vehicleId]/licence-requests.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { LicenceIncludesBoxes, licenceGroupLabel } from './licence-includes'

export interface LicenceRequestStatus {
  id: string
  itemId: string
  title: string
  status: string
  accountId: string
  accountName: string | null
  amount: number
  approvedAmount: number | null
  requestedBy: string | null
  createdAt: string
  approvedAt: string | null
  /** MBM-354: every licence the request is for (the receipt's group) */
  licenseTypes?: string[]
}

const PENDING = ['SUBMITTED']
const APPROVED = ['APPROVED', 'PARTIALLY_APPROVED', 'PARTIALLY_PAID', 'PAID', 'SETTLE_REQUESTED', 'SETTLED']

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const money = (n: number) => `$${n.toFixed(2)}`

/** The latest request for this vehicle + licence type (null: none since the current licence) */
export function useLicenceRequest(vehicleId: string, licenseType: string, enabled = true) {
  const [req, setReq] = useState<LicenceRequestStatus | null>(null)
  const [loaded, setLoaded] = useState(false)
  const reload = useCallback(async () => {
    if (!enabled) return
    try {
      const res = await fetchWithValidation(`/api/vehicles/${vehicleId}/licence-requests?licenseType=${encodeURIComponent(licenseType)}`)
      setReq(res?.data ?? null)
    } catch { setReq(null) } finally { setLoaded(true) }
  }, [vehicleId, licenseType, enabled])
  useEffect(() => { reload() }, [reload])
  return { req, loaded, reload }
}

/** MBM-347: approved — the licence entered now is the one this request paid for */
export const isApprovedRequest = (r: LicenceRequestStatus | null) => !!r && APPROVED.includes(r.status)

export const isPendingRequest = (r: LicenceRequestStatus | null) => !!r && PENDING.includes(r.status)

/** "⏳ Funds requested … awaiting approval" / "✅ Funds approved …" / declined */
export function LicenceRequestBanner({ req }: { req: LicenceRequestStatus | null }) {
  if (!req) return null
  const link = (
    <Link href={`/expense-accounts/${req.accountId}/combo-requests/${req.id}`} target="_blank" className="underline font-medium whitespace-nowrap">
      View request
    </Link>
  )
  if (PENDING.includes(req.status)) {
    return (
      <div className="p-3 rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-sm">
        ⏳ <strong>Funds requested</strong> on {day(req.createdAt)} ({money(req.amount)}{req.accountName ? ` from ${req.accountName}` : ''}
        {req.requestedBy ? `, by ${req.requestedBy}` : ''}) — <strong>awaiting approval</strong>. {link}
        <div className="text-xs mt-1 opacity-80">If the licence is already bought, you can still enter it on the Enter licence tab.</div>
      </div>
    )
  }
  if (APPROVED.includes(req.status)) {
    return (
      <div className="p-3 rounded-md border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm">
        ✅ <strong>Funds approved</strong>{req.approvedAt ? ` on ${day(req.approvedAt)}` : ''}
        {req.approvedAmount != null ? ` (${money(req.approvedAmount)})` : ''} — buy the licence, then enter it below. {link}
      </div>
    )
  }
  return (
    <div className="p-3 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-secondary text-sm">
      ✖ The funds request of {day(req.createdAt)} was {req.status.toLowerCase().replace('_', ' ')} — request again, or enter the licence if it is bought. {link}
    </div>
  )
}

interface Account { id: string; accountName: string; accountNumber?: string; businessId: string | null; businessName: string | null; isActive: boolean }

/** The request form (the Request funds tab) */
export function LicenceFundsRequestForm({ vehicleId, licenseType, licenseLabel, defaultAmount, onSubmitted, onSaving, formId }: {
  vehicleId: string
  licenseType: string
  licenseLabel: string
  defaultAmount?: number | null
  onSubmitted: () => void
  onSaving?: (saving: boolean) => void
  /** The footer's submit button targets this form */
  formId: string
}) {
  const [vehicle, setVehicle] = useState<{ licensePlate: string; make: string; model: string; year?: number; businessId: string | null } | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState('')
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : '')
  const [lateFee, setLateFee] = useState('')
  const [notes, setNotes] = useState('')
  // MBM-354: the other licences on the same receipt
  const [includes, setIncludes] = useState<string[]>([])
  const [error, setError] = useState('')
  const [saving, setSavingState] = useState(false)
  const setSaving = (b: boolean) => { setSavingState(b); onSaving?.(b) }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [v, a] = await Promise.all([
          fetchWithValidation(`/api/vehicles?id=${vehicleId}`),
          fetchWithValidation('/api/expense-account'),
        ])
        if (cancelled) return
        const veh = Array.isArray(v?.data) ? v.data[0] : null
        setVehicle(veh ?? null)
        const list: Account[] = (a?.data?.accounts || [])
          .filter((x: Account) => x.isActive)
          .sort((x: Account, y: Account) => x.accountName.localeCompare(y.accountName))
        setAccounts(list)
        // Default to the vehicle's business account; a vehicle with no
        // business (or several matches) leaves the choice to the user
        const matches = list.filter(x => veh?.businessId && x.businessId === veh.businessId)
        if (matches.length >= 1) setAccountId(matches[0].id)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load expense accounts')
      }
    })()
    return () => { cancelled = true }
  }, [vehicleId])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(amount || '0')
    const fee = parseFloat(lateFee || '0')
    if (!accountId) { setError('Choose the expense account to pay from'); return }
    if (!(amt > 0)) { setError('Enter the renewal amount'); return }
    if (isNaN(fee) || fee < 0) { setError('Late fee must be 0 or more'); return }
    setError('')
    setSaving(true)
    try {
      const plate = vehicle?.licensePlate || 'vehicle'
      const isInsurance = licenseType === 'INSURANCE'
      const line = (description: string, estimatedAmount: number) => ({
        description,
        estimatedAmount,
        quantity: 1,
        vehicleId,
        vehicleExpenseType: isInsurance ? 'INSURANCE' : 'LICENSING',
        vehicleLicenseType: licenseType,
        vehicleLicenseIncludes: includes.length ? includes.join(',') : null,
        // No expiry: approving records the cost; the licence is entered once bought
      })
      const what = includes.length ? licenceGroupLabel(licenseType, includes) : licenseLabel
      const items = [line(`${what} renewal — ${plate}`, amt)]
      if (fee > 0) items.push(line(`${what} late fee — ${plate}`, fee))
      await fetchWithValidation(`/api/expense-account/${accountId}/combo-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Licence renewal: ${includes.length ? licenceGroupLabel(licenseType, includes) : licenseLabel} — ${plate}${vehicle ? ` (${vehicle.make} ${vehicle.model})` : ''}`,
          notes: notes.trim() || null,
          status: 'SUBMITTED',
          sections: [{ sectionType: 'CUSTOM', sectionName: 'Vehicle licence', items }],
        }),
      })
      onSubmitted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the request')
    } finally {
      setSaving(false)
    }
  }

  const fieldClass = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelClass = 'block text-xs font-medium text-secondary mb-1'
  const total = (parseFloat(amount || '0') || 0) + (parseFloat(lateFee || '0') || 0)

  return (
    <form id={formId} onSubmit={submit} className="space-y-4">
      <p className="text-sm text-secondary">
        Ask for the money to buy the renewal. The approvers are notified; once it is approved, buy the licence and
        come back here to enter it.
      </p>
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-300 text-sm">{error}</div>
      )}
      <div>
        <label className={labelClass}>Pay from (expense account) *</label>
        <select value={accountId} onChange={e => setAccountId(e.target.value)} className={fieldClass} disabled={saving}>
          <option value="">{accounts.length === 0 ? 'No expense accounts available' : 'Choose an account…'}</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>
              {a.accountName}{a.businessName ? ` — ${a.businessName}` : ''}
            </option>
          ))}
        </select>
      </div>
      <LicenceIncludesBoxes licenseType={licenseType} value={includes} onChange={setIncludes} disabled={saving} />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Renewal amount *</label>
          <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={fieldClass} placeholder="0.00" disabled={saving} />
        </div>
        <div>
          <label className={labelClass}>Late fee / penalty</label>
          <input type="number" min="0" step="0.01" value={lateFee} onChange={e => setLateFee(e.target.value)} className={fieldClass} placeholder="0.00" disabled={saving} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Note for the approver</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${fieldClass} resize-none`} placeholder="e.g. Expired 30 Oct — needed before the next trip" disabled={saving} />
      </div>
      <div className="text-sm text-secondary">Total requested: <strong className="text-primary">{money(total)}</strong></div>
    </form>
  )
}

/** A small "⏳ Funds requested" / "✅ Funds approved" tag for a licence row */
export function LicenceRequestBadge({ vehicleId, licenseType }: { vehicleId: string; licenseType: string }) {
  const { req } = useLicenceRequest(vehicleId, licenseType)
  if (!req) return null
  if (PENDING.includes(req.status)) {
    return <span className="text-xs font-medium px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200">⏳ Funds requested</span>
  }
  if (APPROVED.includes(req.status)) {
    return <span className="text-xs font-medium px-2 py-1 rounded bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200">✅ Funds approved</span>
  }
  return null
}
