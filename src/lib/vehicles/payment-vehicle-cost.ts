// MBM-347: a direct expense payment's vehicle cost reaches Vehicle Management
// only while the money is approved.
//
// The payment form's vehicle details are kept on the payment
// (ExpenseAccountPayments.vehicleCost) until then. Every place that changes a
// payment's status calls syncPaymentVehicleCosts afterwards:
//   SUBMITTED / APPROVED / PAID  → the Fleet record is written (or updated),
//                                  via the same helper as combo / petty cash /
//                                  receipt lines (oil, tyres, service →
//                                  Maintenance; the rest → Expenses), keyed
//                                  "payment:<id>" so it is never added twice;
//                                  a Licensing / Insurance cost with a new
//                                  expiry renews that licence.
//   anything else (QUEUED, REQUEST, PENDING_APPROVAL, REJECTED, CANCELLED,
//   REVERSED, …)                 → the Fleet record is removed.
//
// A payment whose receipts are themselves tagged to a vehicle (MBM-302) is
// left to those receipts, so the same money is not recorded twice.
import { Prisma } from '@prisma/client'
import { upsertLinkedVehicleRecord, removeLinkedVehicleRecord, type VehicleExpenseTypeInput } from './create-linked-vehicle-record'
import { renewFromVehicleCost } from './renew-vehicle-license'
import { isVehicleExpenseType, licenseIncludesColumn } from './vehicle-expense-types'

export const COMMITTED_PAYMENT_STATUSES = ['SUBMITTED', 'APPROVED', 'PAID']

export interface PaymentVehicleCost {
  vehicleId: string
  expenseType: string
  licenseType?: string | null
  licenseExpiry?: string | null
  /** MBM-354: "RADIO,INSURANCE": the other licences on the same receipt */
  licenseIncludes?: string | null
  fuelQuantity?: number | null
  fuelType?: string | null
  mileageAtExpense?: number | null
  driverId?: string | null
}

// Older client queues may still send these
const LEGACY_TYPES: Record<string, string> = { REPAIR: 'MAINTENANCE', REPAIRS: 'MAINTENANCE', REGISTRATION: 'LICENSING', TOLLS: 'TOLL' }

/** The payment form's `vehicleExpense` → what is stored on the payment (null: not a vehicle cost) */
export function toPaymentVehicleCost(ve: any): PaymentVehicleCost | null {
  if (!ve?.vehicleId) return null
  const raw = String(ve.expenseType || 'OTHER').toUpperCase()
  const type = LEGACY_TYPES[raw] ?? raw
  const num = (v: unknown) => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v))
  return {
    vehicleId: String(ve.vehicleId),
    expenseType: isVehicleExpenseType(type) ? type : 'OTHER',
    licenseType: ve.licenseType || null,
    licenseExpiry: ve.licenseExpiry || null,
    licenseIncludes: licenseIncludesColumn(ve.licenseIncludes),
    fuelQuantity: num(ve.fuelQuantity),
    fuelType: ve.fuelType || null,
    mileageAtExpense: num(ve.mileageAtExpense),
    driverId: ve.driverId || null,
  }
}

/** Bring Vehicle Management in line with these payments' statuses. `tx` is a Prisma client or transaction. */
export async function syncPaymentVehicleCosts(tx: any, paymentIds: string[]): Promise<void> {
  const ids = [...new Set(paymentIds.filter(Boolean))]
  if (!ids.length) return
  const payments = await tx.expenseAccountPayments.findMany({
    where: { id: { in: ids }, vehicleCost: { not: Prisma.DbNull } },
    select: { id: true, status: true, amount: true, paymentDate: true, notes: true, createdBy: true, createdAt: true, vehicleCost: true },
  })
  for (const p of payments) {
    const cost = p.vehicleCost as PaymentVehicleCost | null
    if (!cost?.vehicleId) continue
    const sourceRef = `payment:${p.id}`

    const committed = COMMITTED_PAYMENT_STATUSES.includes(p.status)
    const receiptTagged = committed
      ? await tx.expensePaymentReceipts.count({ where: { expensePaymentId: p.id, NOT: { vehicleId: null } } })
      : 0
    if (!committed || receiptTagged > 0) {
      await removeLinkedVehicleRecord(tx, sourceRef)
      continue
    }

    const amount = Number(p.amount)
    const r = await upsertLinkedVehicleRecord(tx, {
      vehicleId: cost.vehicleId,
      expenseType: cost.expenseType as VehicleExpenseTypeInput,
      amount,
      date: p.paymentDate,
      description: p.notes?.trim() || null,
      mileageAtExpense: cost.mileageAtExpense ?? null,
      fuelQuantity: cost.fuelQuantity ?? null,
      fuelType: cost.fuelType ?? null,
      driverId: cost.driverId ?? null,
      expensePaymentId: p.id,
      sourceRef,
      createdBy: p.createdBy,
    })
    if (!r.ok) throw new Error(`Vehicle cost on this payment: ${r.error}`)
    await renewFromVehicleCost(tx, {
      vehicleId: cost.vehicleId,
      vehicleExpenseType: cost.expenseType,
      vehicleLicenseType: cost.licenseType ?? null,
      vehicleLicenseExpiry: cost.licenseExpiry ?? null,
      vehicleLicenseIncludes: cost.licenseIncludes ?? null,
      amount,
      date: p.paymentDate,
      sourceRef,
      requestedAt: p.createdAt,
    })
  }
}

/** MBM-347: supplier payment request lines tagged to a vehicle — in Vehicle
 *  Management while APPROVED / PAID (at the approved amount), out otherwise */
export async function syncSupplierItemVehicleCosts(tx: any, itemIds: string[], userId: string): Promise<void> {
  const ids = [...new Set(itemIds.filter(Boolean))]
  if (!ids.length) return
  const items = await tx.supplierPaymentRequestItems.findMany({
    where: { id: { in: ids }, NOT: { vehicleId: null } },
    select: {
      id: true, status: true, description: true, amount: true, approvedAmount: true,
      vehicleId: true, vehicleExpenseType: true, vehicleLicenseType: true, vehicleLicenseExpiry: true, vehicleLicenseIncludes: true,
      request: { select: { approvedAt: true, submittedAt: true, supplier: { select: { name: true } } } },
    },
  })
  for (const item of items) {
    const sourceRef = `supplier-item:${item.id}`
    if (!['APPROVED', 'PAID'].includes(item.status)) {
      await removeLinkedVehicleRecord(tx, sourceRef)
      continue
    }
    const amount = Number(item.approvedAmount ?? item.amount)
    const date = item.request?.approvedAt ?? new Date()
    const supplier = item.request?.supplier?.name
    const r = await upsertLinkedVehicleRecord(tx, {
      vehicleId: item.vehicleId,
      expenseType: (item.vehicleExpenseType || 'OTHER') as VehicleExpenseTypeInput,
      amount,
      date,
      description: [item.description, supplier ? `(supplier: ${supplier})` : null].filter(Boolean).join(' ') || null,
      sourceRef,
      createdBy: userId,
    })
    if (!r.ok) throw new Error(`Vehicle line "${item.description || 'item'}": ${r.error}`)
    await renewFromVehicleCost(tx, { ...item, amount, date, sourceRef, requestedAt: item.request?.submittedAt })
  }
}
