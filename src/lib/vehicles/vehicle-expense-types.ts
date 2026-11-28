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

/** MBM-347: a request line's vehicle cost columns from what the form sent
 *  (combo, supplier request lines …) — all null when it isn't a vehicle cost */
export function vehicleLineFields(item: any) {
  const vehicleId = item?.vehicleId || null
  return {
    vehicleId,
    vehicleExpenseType: vehicleId ? (isVehicleExpenseType(item.vehicleExpenseType) ? item.vehicleExpenseType : 'OTHER') : null,
    vehicleLicenseType: vehicleId ? item.vehicleLicenseType || null : null,
    vehicleLicenseExpiry: vehicleId && item.vehicleLicenseExpiry ? new Date(item.vehicleLicenseExpiry) : null,
    vehicleLicenseIncludes: vehicleId ? licenseIncludesColumn(item.vehicleLicenseIncludes) : null,
  }
}

/** MBM-354: the other licences on the same receipt, as stored ("RADIO,INSURANCE"; null: none) */
export function licenseIncludesColumn(v: unknown): string | null {
  const list = (Array.isArray(v) ? v : String(v || '').split(','))
    .map(t => String(t).trim()).filter(t => ['REGISTRATION', 'RADIO', 'INSURANCE'].includes(t))
  return list.length ? [...new Set(list)].join(',') : null
}

/** MBM-347: the expense domain whose lines are vehicle costs */
export const VEHICLE_DOMAIN_ID = 'domain-vehicle'

/** MBM-347: lines classified under the Vehicle domain that don't say which
 *  vehicle or what kind of cost — they can't be submitted. Returns their
 *  descriptions (empty: all fine). `db` is a Prisma client or transaction. */
export async function vehicleLinesMissingDetails(
  db: any,
  lines: Array<{ description?: string | null; categoryId?: string | null; vehicleId?: string | null; vehicleExpenseType?: string | null }>,
): Promise<string[]> {
  const ids = [...new Set(lines.map(l => l.categoryId).filter((v): v is string => !!v))]
  if (!ids.length) return []
  const vehicleCats = await db.expenseCategories.findMany({ where: { id: { in: ids }, domainId: VEHICLE_DOMAIN_ID }, select: { id: true } })
  const vehicleSet = new Set(vehicleCats.map((c: { id: string }) => c.id))
  return lines
    .filter(l => l.categoryId && vehicleSet.has(l.categoryId) && (!l.vehicleId || !l.vehicleExpenseType))
    .map(l => l.description?.trim() || 'an item')
}
