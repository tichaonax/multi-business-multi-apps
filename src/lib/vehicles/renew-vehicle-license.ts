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
  /** MBM-347: the request line / payment that paid for it (its cost is already a vehicle expense) */
  fundedSourceRef?: string | null
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
    // MBM-347: the licence was entered already; this payment is what it cost
    if (input.fundedSourceRef && !covering.fundedSourceRef) {
      await tx.vehicleLicenses.update({ where: { id: covering.id }, data: { fundedSourceRef: input.fundedSourceRef } })
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
      fundedSourceRef: input.fundedSourceRef ?? null,
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
  /** MBM-347: "combo-item:<id>", "payment:<id>", … — links the licence to the cost */
  sourceRef?: string | null
  /** MBM-347: when the money was asked for — a licence entered since then (by
   *  hand, before the approval) is the one this cost paid for */
  requestedAt?: Date | string | null
}): Promise<RenewLicenseResult | null> {
  const type = cost.vehicleExpenseType === 'INSURANCE' ? 'INSURANCE'
    : cost.vehicleExpenseType === 'LICENSING' ? cost.vehicleLicenseType : null
  if (!type || !(RENEWABLE_LICENSE_TYPES as readonly string[]).includes(type)) return null
  if (!cost.vehicleLicenseExpiry) {
    // No new expiry: nothing to renew. If the licence was already entered
    // after the request was made, link it, so its cost isn't counted twice.
    if (cost.sourceRef && cost.requestedAt) {
      const entered = await tx.vehicleLicenses.findFirst({
        where: { vehicleId: cost.vehicleId, licenseType: type, isActive: true, fundedSourceRef: null, createdAt: { gte: new Date(cost.requestedAt) } },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })
      if (entered) {
        await tx.vehicleLicenses.update({ where: { id: entered.id }, data: { fundedSourceRef: cost.sourceRef } })
        return { status: 'already', id: entered.id }
      }
    }
    return null
  }
  return renewVehicleLicense(tx, {
    vehicleId: cost.vehicleId,
    licenseType: type as RenewableLicenseType,
    expiryDate: new Date(cost.vehicleLicenseExpiry),
    issueDate: cost.date,
    renewalCost: cost.amount,
    fundedSourceRef: cost.sourceRef ?? null,
  })
}
