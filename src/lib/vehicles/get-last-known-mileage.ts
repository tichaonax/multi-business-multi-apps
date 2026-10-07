// MBM-302: the highest mileage reading recorded anywhere for a vehicle —
// across trips (Vehicles.currentMileage, only updated when a trip ends),
// VehicleExpenses.mileageAtExpense and VehicleMaintenanceRecords.mileageAtService.
// Mileage only increases, so the max across every source is always the
// latest known reading regardless of which table it came from or when.
// Shared by GET /api/vehicles/[vehicleId]/last-mileage (the receipt form's
// prefill) and create-linked-vehicle-record.ts (the server-side guard) so
// both use the exact same number — Vehicles.currentMileage alone is NOT a
// reliable "last known mileage": nothing updates it when a plain expense or
// maintenance record is saved with a mileage reading, only when a trip ends.
export async function getLastKnownMileage(client: any, vehicleId: string): Promise<number> {
  const [vehicle, expenseMax, maintenanceMax] = await Promise.all([
    client.vehicles.findUnique({ where: { id: vehicleId }, select: { currentMileage: true } }),
    client.vehicleExpenses.aggregate({ where: { vehicleId }, _max: { mileageAtExpense: true } }),
    client.vehicleMaintenanceRecords.aggregate({ where: { vehicleId }, _max: { mileageAtService: true } }),
  ])
  return Math.max(
    vehicle?.currentMileage ?? 0,
    expenseMax._max.mileageAtExpense ?? 0,
    maintenanceMax._max.mileageAtService ?? 0
  )
}
