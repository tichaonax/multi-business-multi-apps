'use client'

// MBM-344: marks a request line as a vehicle cost — which vehicle, and what
// kind of cost (Fuel / Petrol, Oil Change, Licensing, …). Used on combo
// request lines and petty cash spends; the line then syncs to Fleet
// Management (on approval / when recorded). No vehicle = not a vehicle cost.
import { useEffect, useState } from 'react'
import { VEHICLE_EXPENSE_TYPES } from '@/lib/vehicles/vehicle-expense-types'

interface VehicleOption { id: string; label: string }

// Asked once per page
let vehiclesPromise: Promise<VehicleOption[]> | null = null
function loadVehicles(): Promise<VehicleOption[]> {
  if (!vehiclesPromise) {
    vehiclesPromise = fetch('/api/vehicles?isActive=true&limit=100', { credentials: 'include' })
      .then(r => r.json())
      .then(j => ((j?.data ?? []) as Array<{ id: string; year: number; make: string; model: string; licensePlate: string }>)
        .map(v => ({ id: v.id, label: `${v.licensePlate} · ${v.year} ${v.make} ${v.model}` })))
      .catch(() => { vehiclesPromise = null; return [] })
  }
  return vehiclesPromise
}

export interface VehicleCost {
  vehicleId: string | null
  vehicleExpenseType: string | null
  /** LICENSING: the licence it renews; INSURANCE renews the insurance */
  vehicleLicenseType?: string | null
  /** YYYY-MM-DD — with it, the licence is renewed (its alert clears) */
  vehicleLicenseExpiry?: string | null
}

export const NO_VEHICLE_COST: VehicleCost = { vehicleId: null, vehicleExpenseType: null, vehicleLicenseType: null, vehicleLicenseExpiry: null }

const LICENSE_TYPES = [
  { value: 'REGISTRATION', label: 'Registration' },
  { value: 'ROAD_USE', label: 'Road use' },
  { value: 'RADIO', label: 'Radio' },
  { value: 'INSPECTION', label: 'Inspection' },
]

export function VehicleCostPicker({ value, onChange, disabled, compact }: {
  value: VehicleCost
  onChange: (v: VehicleCost) => void
  disabled?: boolean
  /** One line, small (a request line) */
  compact?: boolean
}) {
  const [vehicles, setVehicles] = useState<VehicleOption[]>([])
  useEffect(() => { loadVehicles().then(setVehicles) }, [])

  const { vehicleId, vehicleExpenseType: expenseType } = value
  const set = (v: Partial<VehicleCost>) => onChange({ ...value, ...v })
  const renews = expenseType === 'LICENSING' || expenseType === 'INSURANCE'
  const cls = `rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${compact ? 'px-1.5 py-1 text-xs' : 'px-2 py-1.5 text-sm'}`
  const small = `${compact ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`
  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'mt-1'}`}>
      <span className={small}>🚗 Vehicle</span>
      <select className={cls} value={vehicleId || ''} disabled={disabled}
        onChange={e => e.target.value ? set({ vehicleId: e.target.value, vehicleExpenseType: expenseType || 'FUEL' }) : onChange(NO_VEHICLE_COST)}>
        <option value="">Not a vehicle cost</option>
        {vehicles.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
      </select>
      {vehicleId && (
        <select className={cls} value={expenseType || 'FUEL'} disabled={disabled}
          onChange={e => set({ vehicleExpenseType: e.target.value, ...(e.target.value === 'LICENSING' || e.target.value === 'INSURANCE' ? {} : { vehicleLicenseType: null, vehicleLicenseExpiry: null }) })}>
          {VEHICLE_EXPENSE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      )}
      {vehicleId && expenseType === 'LICENSING' && (
        <select className={cls} value={value.vehicleLicenseType || ''} disabled={disabled}
          onChange={e => set({ vehicleLicenseType: e.target.value || null })}>
          <option value="">Licence…</option>
          {LICENSE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      )}
      {vehicleId && renews && (
        <label className={`flex items-center gap-1 ${small}`} title="With the new expiry date, the licence is renewed and its alert clears">
          new expiry
          <input type="date" className={cls} value={value.vehicleLicenseExpiry || ''} disabled={disabled}
            onChange={e => set({ vehicleLicenseExpiry: e.target.value || null })} />
        </label>
      )}
    </div>
  )
}
