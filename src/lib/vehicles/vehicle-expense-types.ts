// MBM-344: the vehicle expense types a cost can carry — the vehicle expense
// form, combo request lines and petty cash spending lines use the same list.
// FUEL/OIL/TIRE/MAINTENANCE/LICENSING/... map to Fleet Management in
// upsertLinkedVehicleRecord (create-linked-vehicle-record.ts).
export const VEHICLE_EXPENSE_TYPES = [
  { value: 'FUEL', label: 'Fuel / Petrol' },
  { value: 'MAINTENANCE', label: 'Maintenance / Repairs' },
  { value: 'OIL', label: 'Oil Change' },
  { value: 'TIRE', label: 'Tires' },
  { value: 'LICENSING', label: 'Licensing' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'TOLL', label: 'Tolls' },
  { value: 'PARKING', label: 'Parking' },
  { value: 'OTHER', label: 'Other' },
] as const

export const isVehicleExpenseType = (v: unknown): v is (typeof VEHICLE_EXPENSE_TYPES)[number]['value'] =>
  VEHICLE_EXPENSE_TYPES.some(t => t.value === v)
