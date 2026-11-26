// MBM-344: one way to renew a vehicle licence, whatever the entry path — the
// renewal receipt form, or a Licensing / Insurance cost on a combo request
// line or a petty cash spend. It does what the License form's renewal does
// (POST /api/vehicles/licenses): the new licence supersedes the current one
// (supersedesLicenseId, MBM-306) and the current one is retired, so the
// compliance alert list drops it at once and every posted alert copy (bell,
// chat digest) shows it resolved.
//
// Idempotent: when an active licence of that type already runs to the new
// expiry date or later, nothing is created (a receipt is linked to it).

export const RENEWABLE_LICENSE_TYPES = ['REGISTRATION', 'RADIO', 'ROAD_USE', 'INSURANCE', 'INSPECTION'] as const
export type RenewableLicenseType = (typeof RENEWABLE_LICENSE_TYPES)[number]

export interface RenewLicenseInput {
  vehicleId: string
  licenseType: RenewableLicenseType
  expiryDate: Date
  issueDate?: Date
  licenseNumber?: string | null
  renewalCost?: number | null
  renewalReceiptId?: string | null
  /** Other licence fields the entry path has (authority, late fee, document, …) */
  extra?: Record<string, unknown>
}

export type RenewLicenseResult =
  | { status: 'renewed'; id: string; supersededId: string | null }
  | { status: 'already'; id: string }

export async function renewVehicleLicense(tx: any, input: RenewLicenseInput): Promise<RenewLicenseResult> {
  const { vehicleId, licenseType, expiryDate } = input
  const active = await tx.vehicleLicenses.findMany({
    where: { vehicleId, licenseType, isActive: true },
    orderBy: { expiryDate: 'desc' },
  })

  // Already renewed to this date or later (the same payment entered twice)
  const covering = active.find((l: any) => l.expiryDate >= expiryDate)
  if (covering) {
    if (input.renewalReceiptId && !covering.renewalReceiptId) {
      await tx.vehicleLicenses.update({ where: { id: covering.id }, data: { renewalReceiptId: input.renewalReceiptId } })
    }
    return { status: 'already', id: covering.id }
  }

  const current = active[0] || null
  for (const old of active) {
    await tx.vehicleLicenses.update({ where: { id: old.id }, data: { isActive: false } })
  }
  const created = await tx.vehicleLicenses.create({
    data: {
      vehicleId,
      licenseType,
      licenseNumber: input.licenseNumber?.trim() || current?.licenseNumber || 'Renewed',
      issuingAuthority: current?.issuingAuthority ?? null,
      issueDate: input.issueDate ?? new Date(),
      expiryDate,
      renewalCost: input.renewalCost ?? null,
      reminderDays: current?.reminderDays ?? 30,
      usage: current?.usage ?? null,
      renewalReceiptId: input.renewalReceiptId ?? null,
      supersedesLicenseId: current?.id ?? null,
      ...(input.extra || {}),
      updatedAt: new Date(),
    },
  })
  return { status: 'renewed', id: created.id, supersededId: current?.id ?? null }
}

/** A Licensing / Insurance vehicle cost with a new expiry renews that licence.
 *  INSURANCE costs renew the INSURANCE licence; LICENSING ones the type given. */
export async function renewFromVehicleCost(tx: any, cost: {
  vehicleId: string
  vehicleExpenseType: string | null
  vehicleLicenseType?: string | null
  vehicleLicenseExpiry?: Date | string | null
  amount: number
  date: Date
}): Promise<RenewLicenseResult | null> {
  if (!cost.vehicleLicenseExpiry) return null
  const type = cost.vehicleExpenseType === 'INSURANCE' ? 'INSURANCE'
    : cost.vehicleExpenseType === 'LICENSING' ? cost.vehicleLicenseType : null
  if (!type || !(RENEWABLE_LICENSE_TYPES as readonly string[]).includes(type)) return null
  return renewVehicleLicense(tx, {
    vehicleId: cost.vehicleId,
    licenseType: type as RenewableLicenseType,
    expiryDate: new Date(cost.vehicleLicenseExpiry),
    issueDate: cost.date,
    renewalCost: cost.amount,
  })
}
