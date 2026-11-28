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

// MBM-354: the authorities issue these three on one receipt
export const COMBINED_LICENSE_TYPES = ['REGISTRATION', 'RADIO', 'INSURANCE'] as const

/** "RADIO,INSURANCE" (as stored on a cost line) or an array → the valid types */
export function parseLicenseIncludes(v: string | string[] | null | undefined): string[] {
  const list = Array.isArray(v) ? v : (v || '').split(',')
  return [...new Set(list.map(t => t.trim()).filter(t => (COMBINED_LICENSE_TYPES as readonly string[]).includes(t)))]
}

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
  /** MBM-354: the other licences on the same receipt (registration, radio,
   *  insurance), renewed with it. The registration carries the fee. */
  includeTypes?: string[] | string | null
  /** The exact licence being renewed (the Renew form), else the latest active one */
  supersedesLicenseId?: string | null
}

export type RenewLicenseResult =
  | { status: 'renewed'; id: string; supersededId: string | null }
  | { status: 'already'; id: string }

export type RenewGroupResult = RenewLicenseResult & {
  /** MBM-354: every licence on the receipt (the entered one included) */
  group?: Array<{ licenseType: string } & RenewLicenseResult>
}

export async function renewVehicleLicense(tx: any, input: RenewLicenseInput): Promise<RenewGroupResult> {
  const others = parseLicenseIncludes(input.includeTypes).filter(t => t !== input.licenseType)
  if (!others.length || !(COMBINED_LICENSE_TYPES as readonly string[]).includes(input.licenseType)) {
    return renewOneLicense(tx, input)
  }
  // MBM-354: one receipt. The registration (or, without it, the type being
  // entered) is the main one: the fee, late fee, receipt and funding link go
  // on it. The others cost 0 and point to it (includedInLicenseId), so only
  // it alerts. Each supersedes its own current licence, so their alerts resolve.
  const types = [input.licenseType, ...others]
  const main = types.includes('REGISTRATION') ? 'REGISTRATION' : input.licenseType
  const { usage: _usage, lateFee: _lateFee, ...shared } = input.extra || {}
  const group: Array<{ licenseType: string } & RenewLicenseResult> = []
  let mainId: string | null = null
  for (const type of [main, ...types.filter(t => t !== main)]) {
    const isMain = type === main
    const r = await renewOneLicense(tx, {
      ...input,
      licenseType: type as RenewableLicenseType,
      renewalCost: isMain ? input.renewalCost : 0,
      fundedSourceRef: isMain ? input.fundedSourceRef : null,
      supersedesLicenseId: type === input.licenseType ? input.supersedesLicenseId : null,
      extra: isMain
        ? { ...(type === input.licenseType ? input.extra : shared), includedInLicenseId: null }
        : { ...shared, ...(type === input.licenseType && input.extra?.usage !== undefined ? { usage: input.extra.usage } : {}), lateFee: 0, includedInLicenseId: mainId },
    })
    if (isMain) mainId = r.id
    group.push({ licenseType: type, ...r })
  }
  const entered = group.find(g => g.licenseType === input.licenseType)!
  return { ...entered, group }
}

async function renewOneLicense(tx: any, input: RenewLicenseInput): Promise<RenewLicenseResult> {
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
    // MBM-354: entered already, but this receipt says it came with the registration
    const includedIn = input.extra?.includedInLicenseId as string | null | undefined
    if (includedIn && !covering.includedInLicenseId && includedIn !== covering.id) {
      await tx.vehicleLicenses.update({ where: { id: covering.id }, data: { includedInLicenseId: includedIn } })
    }
    return { status: 'already', id: covering.id }
  }

  const current = (input.supersedesLicenseId && active.find((l: any) => l.id === input.supersedesLicenseId)) || active[0] || null
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
  /** MBM-354: "RADIO,INSURANCE": the other licences on the same receipt */
  vehicleLicenseIncludes?: string | null
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
      // MBM-354: with the registration on the same receipt, it carries the fee
      const linkType = type !== 'REGISTRATION' && parseLicenseIncludes(cost.vehicleLicenseIncludes).includes('REGISTRATION') ? 'REGISTRATION' : type
      const entered = await tx.vehicleLicenses.findFirst({
        where: { vehicleId: cost.vehicleId, licenseType: linkType, isActive: true, fundedSourceRef: null, createdAt: { gte: new Date(cost.requestedAt) } },
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
    includeTypes: cost.vehicleLicenseIncludes ?? null,
  })
}
