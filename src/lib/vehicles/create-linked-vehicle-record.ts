// MBM-302: creates (or updates, if already linked) the Fleet Management
// record a vehicle-tagged receipt entry represents — either a VehicleExpenses
// row (fuel/toll/parking/insurance/other) or a VehicleMaintenanceRecords row
// (oil/tire/maintenance, the richer service-work model). Writes directly via
// Prisma rather than going through /api/vehicles/expenses or
// /api/vehicles/maintenance: the maintenance route's own serviceType mapping
// table (ROUTINE/EMERGENCY/WARRANTY/UPGRADE) doesn't include OIL_CHANGE/
// TIRE_REPLACEMENT/BRAKE_SERVICE even though its own Zod schema and the real
// Prisma enum accept them — it would 400 on exactly the values this needs.
//
// Called inside the receipt POST/PUT route's existing transaction, and from
// the vehicle-expense-modal.tsx -> payment-batch creation path so that flow
// starts populating expensePaymentId too (see plan Scope C).

export type VehicleExpenseTypeInput =
  | 'FUEL' | 'TOLL' | 'PARKING' | 'MAINTENANCE' | 'INSURANCE' | 'OTHER'
  | 'OIL' | 'TIRE'

export interface LinkedVehicleRecordInput {
  vehicleId: string
  expenseType: VehicleExpenseTypeInput
  amount: number
  date: Date
  description?: string | null
  mileageAtExpense?: number | null
  fuelQuantity?: number | null
  fuelType?: string | null
  driverId?: string | null
  receiptId: string
  expensePaymentId: string
  createdBy: string
}

export type LinkedVehicleRecordResult =
  | { ok: true; table: 'VehicleExpenses' | 'VehicleMaintenanceRecords'; id: string }
  | { ok: false; error: string }

// Types routed to the richer service-work model — see plan Design section.
const MAINTENANCE_TYPES = new Set(['OIL', 'TIRE', 'MAINTENANCE'])

const SERVICE_TYPE_MAP: Record<string, 'OIL_CHANGE' | 'TIRE_REPLACEMENT' | 'REPAIR'> = {
  OIL: 'OIL_CHANGE',
  TIRE: 'TIRE_REPLACEMENT',
  MAINTENANCE: 'REPAIR',
}

const SERVICE_NAME_MAP: Record<string, string> = {
  OIL: 'Oil Change',
  TIRE: 'Tire Replacement',
  MAINTENANCE: 'Maintenance',
}

/**
 * Creates the linked vehicle record, or — if this receipt already has one
 * (receiptId match) — updates it in place instead of creating a duplicate.
 * If the expense type changed bucket (e.g. was FUEL, now OIL), the old
 * record is deleted and a fresh one created in the new table.
 *
 * `tx` is a Prisma transaction client (loosely typed as `any`, matching the
 * convention already used for transaction callbacks elsewhere in this
 * codebase, e.g. combo-request-expiry.ts).
 */
export async function upsertLinkedVehicleRecord(tx: any, input: LinkedVehicleRecordInput): Promise<LinkedVehicleRecordResult> {
  const { vehicleId, expenseType, amount, date, description, mileageAtExpense, fuelQuantity, fuelType, driverId, receiptId, expensePaymentId, createdBy } = input

  if (expenseType === 'FUEL' && (!fuelQuantity || !fuelType)) {
    return { ok: false, error: 'Fuel quantity and fuel type are required for fuel expenses' }
  }

  const vehicle = await tx.vehicles.findUnique({ where: { id: vehicleId }, select: { currentMileage: true, businessId: true } })
  if (!vehicle) {
    return { ok: false, error: 'Vehicle not found' }
  }

  const wantsMaintenance = MAINTENANCE_TYPES.has(expenseType)

  // Find any existing linked record for this receipt, in either table —
  // edit case. If it's in the "wrong" table for the current expenseType
  // (the type changed bucket since it was first linked), delete it so we
  // don't leave an orphaned stale record behind.
  const [existingExpense, existingMaintenance] = await Promise.all([
    tx.vehicleExpenses.findFirst({ where: { receiptId }, select: { id: true } }),
    tx.vehicleMaintenanceRecords.findFirst({ where: { receiptId }, select: { id: true } }),
  ])

  if (wantsMaintenance) {
    if (existingExpense) await tx.vehicleExpenses.delete({ where: { id: existingExpense.id } })

    const serviceType = SERVICE_TYPE_MAP[expenseType]
    const serviceName = SERVICE_NAME_MAP[expenseType]
    // Service mileage can't exceed the vehicle's current reading — same rule
    // /api/vehicles/maintenance enforces. Default to the vehicle's own
    // current mileage (not 0) when the receipt form didn't capture one —
    // a zero reading on an existing vehicle would misleadingly look like
    // a data error.
    const effectiveMileage = typeof mileageAtExpense === 'number' ? mileageAtExpense : vehicle.currentMileage
    if (effectiveMileage > vehicle.currentMileage) {
      return { ok: false, error: 'Service mileage cannot be greater than current vehicle mileage' }
    }

    if (existingMaintenance) {
      const updated = await tx.vehicleMaintenanceRecords.update({
        where: { id: existingMaintenance.id },
        data: {
          serviceType, serviceName, serviceDate: date, mileageAtService: effectiveMileage,
          serviceCost: amount, notes: description || null, driverId: driverId || null,
          expensePaymentId,
        },
      })
      return { ok: true, table: 'VehicleMaintenanceRecords', id: updated.id }
    }

    const created = await tx.vehicleMaintenanceRecords.create({
      data: {
        vehicleId, serviceType, serviceName, serviceDate: date, mileageAtService: effectiveMileage,
        serviceCost: amount, notes: description || null, driverId: driverId || null,
        receiptId, expensePaymentId, createdBy, updatedAt: new Date(),
      },
    })
    return { ok: true, table: 'VehicleMaintenanceRecords', id: created.id }
  }

  // Plain VehicleExpenses path (FUEL/TOLL/PARKING/INSURANCE/OTHER)
  if (existingMaintenance) await tx.vehicleMaintenanceRecords.delete({ where: { id: existingMaintenance.id } })

  const expenseData = {
    vehicleId,
    businessId: vehicle.businessId || null,
    expenseType,
    amount,
    expenseDate: date,
    description: description || null,
    mileageAtExpense: typeof mileageAtExpense === 'number' ? mileageAtExpense : null,
    fuelQuantity: expenseType === 'FUEL' && fuelQuantity ? fuelQuantity : null,
    fuelType: expenseType === 'FUEL' && fuelType ? fuelType : null,
    driverId: driverId || null,
    expensePaymentId,
  }

  if (existingExpense) {
    const updated = await tx.vehicleExpenses.update({ where: { id: existingExpense.id }, data: expenseData })
    return { ok: true, table: 'VehicleExpenses', id: updated.id }
  }

  const created = await tx.vehicleExpenses.create({
    data: { ...expenseData, receiptId, createdBy, updatedAt: new Date() },
  })
  return { ok: true, table: 'VehicleExpenses', id: created.id }
}
