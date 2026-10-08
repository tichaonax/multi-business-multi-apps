import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { createAuditLog } from '@/lib/audit'
import { resweepVehicleLicenseReminders } from '@/lib/vehicles/license-reminder-notify'

/**
 * MBM-305 — the single, atomic entry point for changing a vehicle's
 * licensing status (Non-exempt / Exempt / Retired). Every destination's
 * required fields, the deactivation of licenses no longer applicable, the
 * creation of whatever new license(s) the destination needs, the
 * VehicleStatusHistory record, and the Vehicles row update all happen in
 * one prisma.$transaction — either the whole thing lands or none of it
 * does (spec §7.3/§7.4, AC-10).
 */

const LicenseFieldsSchema = z.object({
  licenseNumber: z.string().min(1, 'License number is required'),
  issuingAuthority: z.string().optional(),
  issueDate: z.string().min(1, 'Issue date is required'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  renewalCost: z.number().min(0).optional(),
  lateFee: z.number().min(0).optional(),
  reminderDays: z.number().int().min(1).max(365).default(30),
})

const ExemptionFieldsSchema = z.object({
  licenseNumber: z.string().min(1, 'Exemption license number is required'),
  issuingAuthority: z.string().optional(),
  issueDate: z.string().min(1, 'Issue date is required'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  exemptionFee: z.number().min(0).optional(),
  reminderDays: z.number().int().min(1).max(365).default(30),
})

const TransitionSchema = z.discriminatedUnion('destinationStatus', [
  z.object({
    destinationStatus: z.literal('NON_EXEMPT'),
    registration: LicenseFieldsSchema,
    insurance: LicenseFieldsSchema,
  }),
  z.object({
    destinationStatus: z.literal('EXEMPT'),
    exemption: ExemptionFieldsSchema,
  }),
  z.object({
    destinationStatus: z.literal('RETIRED'),
    retirementReason: z.string().min(1, 'Retirement reason is required'),
    retirementReasonDescription: z.string().optional(),
  }),
])

// Spec §6 — RETIRED -> EXEMPT is deliberately absent: a retired vehicle
// must be reinstated to NON_EXEMPT first (§6.1).
const PERMITTED_TRANSITIONS: Record<string, string[]> = {
  NON_EXEMPT: ['EXEMPT', 'RETIRED'],
  EXEMPT: ['NON_EXEMPT', 'RETIRED'],
  RETIRED: ['NON_EXEMPT'],
}

function canChangeVehicleStatus(user: { role?: string; permissions?: any }): boolean {
  return isSystemAdmin(user as any) || user?.permissions?.canManageVehicles === true
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canChangeVehicleStatus(user)) {
      return NextResponse.json({ error: 'You do not have permission to change vehicle status' }, { status: 403 })
    }

    const { id: vehicleId } = await params
    const body = await request.json()
    const parsed = TransitionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.issues }, { status: 400 })
    }
    const data = parsed.data
    const destination = data.destinationStatus

    const vehicle = await prisma.vehicles.findUnique({ where: { id: vehicleId } })
    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })

    const currentStatus = vehicle.licensingStatus

    if (currentStatus === destination) {
      return NextResponse.json({ error: `Vehicle is already ${destination.replace('_', '-').toLowerCase()}` }, { status: 400 })
    }
    if (!PERMITTED_TRANSITIONS[currentStatus]?.includes(destination)) {
      const message = currentStatus === 'RETIRED' && destination === 'EXEMPT'
        ? 'A retired vehicle must first be reinstated as Non-exempt before it can become Exempt.'
        : `Cannot change status from ${currentStatus} to ${destination}.`
      return NextResponse.json({ error: message }, { status: 400 })
    }

    if (destination === 'RETIRED') {
      const reasonExists = await prisma.vehicleRetirementReasons.findUnique({ where: { name: data.retirementReason } })
      if (!reasonExists) {
        return NextResponse.json({ error: 'Unknown retirement reason — add it first' }, { status: 400 })
      }
      if (data.retirementReason === 'Other' && !data.retirementReasonDescription?.trim()) {
        return NextResponse.json({ error: 'A description is required when the reason is "Other"' }, { status: 400 })
      }
    }

    const now = new Date()
    const activeLicenses = await prisma.vehicleLicenses.findMany({ where: { vehicleId, isActive: true } })

    const createdLicenseIds: string[] = []
    const deactivatedLicenseIds: string[] = []

    const updatedVehicle = await prisma.$transaction(async (tx) => {
      // 1. Deactivate whatever's no longer applicable to the destination.
      const toDeactivate = destination === 'RETIRED'
        ? activeLicenses
        : destination === 'NON_EXEMPT'
          ? activeLicenses.filter(l => l.licenseType === 'EXEMPTION')
          : activeLicenses.filter(l => l.licenseType !== 'EXEMPTION') // -> EXEMPT

      for (const lic of toDeactivate) {
        await tx.vehicleLicenses.update({ where: { id: lic.id }, data: { isActive: false } })
        deactivatedLicenseIds.push(lic.id)
      }

      // 2. Create whatever the destination needs.
      if (destination === 'NON_EXEMPT') {
        const reg = await tx.vehicleLicenses.create({
          data: {
            vehicleId, licenseType: 'REGISTRATION',
            licenseNumber: data.registration.licenseNumber,
            issuingAuthority: data.registration.issuingAuthority,
            issueDate: new Date(data.registration.issueDate),
            expiryDate: new Date(data.registration.expiryDate),
            renewalCost: data.registration.renewalCost,
            lateFee: data.registration.lateFee,
            reminderDays: data.registration.reminderDays,
            updatedAt: now,
          },
        })
        createdLicenseIds.push(reg.id)

        const ins = await tx.vehicleLicenses.create({
          data: {
            vehicleId, licenseType: 'INSURANCE',
            licenseNumber: data.insurance.licenseNumber,
            issuingAuthority: data.insurance.issuingAuthority,
            issueDate: new Date(data.insurance.issueDate),
            expiryDate: new Date(data.insurance.expiryDate),
            renewalCost: data.insurance.renewalCost,
            lateFee: data.insurance.lateFee,
            reminderDays: data.insurance.reminderDays,
            updatedAt: now,
          },
        })
        createdLicenseIds.push(ins.id)
      } else if (destination === 'EXEMPT') {
        const exemption = await tx.vehicleLicenses.create({
          data: {
            vehicleId, licenseType: 'EXEMPTION',
            licenseNumber: data.exemption.licenseNumber,
            issuingAuthority: data.exemption.issuingAuthority,
            issueDate: new Date(data.exemption.issueDate),
            expiryDate: new Date(data.exemption.expiryDate),
            exemptionFee: data.exemption.exemptionFee,
            reminderDays: data.exemption.reminderDays,
            updatedAt: now,
          },
        })
        createdLicenseIds.push(exemption.id)
      }

      // 3. The vehicle's current, denormalized status.
      const retirementReason = destination === 'RETIRED' ? data.retirementReason : null
      const retirementReasonDescription = destination === 'RETIRED' ? (data.retirementReasonDescription?.trim() || null) : null

      const vehicleRow = await tx.vehicles.update({
        where: { id: vehicleId },
        data: {
          licensingStatus: destination,
          statusEffectiveAt: now,
          retirementReason,
          retirementReasonDescription,
          retiredAt: destination === 'RETIRED' ? now : null,
        },
      })

      // 4. The history trail.
      await tx.vehicleStatusHistory.create({
        data: {
          vehicleId,
          previousStatus: currentStatus,
          newStatus: destination,
          effectiveAt: now,
          changedByUserId: user.id,
          retirementReason,
          retirementReasonDescription,
          createdLicenseIds,
          deactivatedLicenseIds,
        },
      })

      return vehicleRow
    })

    await createAuditLog({
      userId: user.id,
      action: 'VEHICLE_STATUS_CHANGED',
      entityType: 'Vehicle',
      entityId: vehicleId,
      oldValues: { licensingStatus: currentStatus },
      newValues: { licensingStatus: destination },
      metadata: {
        licensePlate: vehicle.licensePlate,
        make: vehicle.make,
        model: vehicle.model,
        createdLicenseIds,
        deactivatedLicenseIds,
        ...(destination === 'RETIRED'
          ? { retirementReason: data.retirementReason, retirementReasonDescription: data.retirementReasonDescription }
          : {}),
      },
    }).catch(() => {})

    // Fire-and-forget: reflect the new status in the bell/chat/panel right
    // away rather than waiting for the next scheduled sweep (spec §9.4).
    resweepVehicleLicenseReminders().catch(() => {})

    return NextResponse.json({ success: true, data: updatedVehicle })
  } catch (error) {
    console.error('Error changing vehicle status:', error)
    return NextResponse.json(
      { error: 'Failed to change vehicle status', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    )
  }
}
