'use client'

// MBM-344: marks a request line as a vehicle cost — which vehicle, and what
// kind of cost (Fuel / Petrol, Oil Change, Licensing, …). Used on combo
// request lines and petty cash spends; the line then syncs to Fleet
// Management (on approval / when recorded). No vehicle = not a vehicle cost.
import { useEffect, useState } from 'react'
import { VEHICLE_EXPENSE_TYPES } from '@/lib/vehicles/vehicle-expense-types'
import { SearchableSelect } from '@/components/ui/searchable-select'

export { VEHICLE_DOMAIN_ID } from '@/lib/vehicles/vehicle-expense-types'

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

export function VehicleCostPicker({ value, onChange, disabled, compact, required }: {
  value: VehicleCost
  onChange: (v: VehicleCost) => void
  disabled?: boolean
  /** One line, small (a request line) */
  compact?: boolean
  /** MBM-347: a Vehicle-category line — the vehicle and the kind of cost must be chosen */
  required?: boolean
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
      {/* MBM-347: searchable — type part of the plate or the make */}
      <div className={compact ? 'min-w-[14rem]' : 'min-w-[16rem]'}>
        <SearchableSelect
          options={vehicles.map(v => ({ value: v.id, label: v.label }))}
          value={vehicleId || ''}
          onChange={id => id ? set({ vehicleId: id, vehicleExpenseType: expenseType || (required ? '' : 'FUEL') || null }) : onChange(NO_VEHICLE_COST)}
          placeholder={required ? 'Choose the vehicle…' : 'Not a vehicle cost'}
          searchPlaceholder="Search plate, make, model…"
          allLabel="Not a vehicle cost"
          required={required}
          disabled={disabled}
          error={required && !vehicleId ? 'Vehicle required' : undefined}
        />
      </div>
      {(vehicleId || required) && (
        <div className={compact ? 'min-w-[11rem]' : 'min-w-[12rem]'}>
          <SearchableSelect
            options={VEHICLE_EXPENSE_TYPES.map(t => ({ value: t.value, label: t.label }))}
            value={expenseType || ''}
            onChange={t => set({ vehicleExpenseType: t || null, ...(t === 'LICENSING' || t === 'INSURANCE' ? {} : { vehicleLicenseType: null, vehicleLicenseExpiry: null }) })}
            placeholder="Kind of cost…"
            searchPlaceholder="Search…"
            required
            disabled={disabled || !vehicleId}
            error={required && vehicleId && !expenseType ? 'Kind of cost required' : undefined}
          />
        </div>
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

/** MBM-347: "🚗 ACT 8086 · Licensing (Registration)" on a request line that is a vehicle cost */
export function VehicleCostTag({ item }: { item: { vehicleId?: string | null; vehicleExpenseType?: string | null; vehicleLicenseType?: string | null; vehicle?: { licensePlate?: string | null } | null } }) {
  if (!item?.vehicleId) return null
  const type = VEHICLE_EXPENSE_TYPES.find(t => t.value === item.vehicleExpenseType)?.label || item.vehicleExpenseType || 'Vehicle cost'
  const licence = item.vehicleLicenseType ? LICENSE_TYPES.find(t => t.value === item.vehicleLicenseType)?.label || item.vehicleLicenseType : null
  return (
    <span className="inline-flex items-center gap-1 ml-1.5 px-1.5 py-0.5 rounded text-[11px] font-medium bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200 whitespace-nowrap">
      🚗 {item.vehicle?.licensePlate || 'Vehicle'} · {type}{licence ? ` (${licence})` : ''}
    </span>
  )
}
