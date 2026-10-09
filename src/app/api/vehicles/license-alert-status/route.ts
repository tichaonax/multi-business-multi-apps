import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * MBM-306 — resolves whether specific vehicle/driver licenses referenced by
 * an already-posted compliance alert (System Alerts chat digest, bell
 * notification) have since been renewed, without ever rewriting the stored
 * alert text itself. The alert text is a point-in-time record; this
 * endpoint is what lets the shared ComplianceDigestSections component
 * render that static text as "resolved" (crossed out, non-interactive,
 * showing the new expiry) purely from current DB state, so every viewer of
 * the same alert — and every reopening of it — sees the same resolved view.
 *
 * Vehicle licenses: resolution is the persisted supersedesLicenseId link
 * (see prisma/schema.prisma) — a license is "renewed" iff it's inactive AND
 * something else explicitly supersedes it, not just "inactive for any
 * reason" (e.g. a vehicle retirement also deactivates licenses, but that
 * isn't a renewal and shouldn't render as one).
 *
 * Driver licenses have no equivalent history row (licenseExpiry is updated
 * in place) — resolution there is inferred: the current expiry has moved
 * strictly later than the date the alert was generated against.
 */

const BodySchema = z.object({
  licenseIds: z.array(z.string()).max(100).optional().default([]),
  drivers: z.array(z.object({ driverId: z.string(), oldExpiry: z.string() })).max(100).optional().default([]),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.issues }, { status: 400 })
    }
    const { licenseIds, drivers } = parsed.data

    const licenses: Record<string, { resolved: boolean; renewedAt?: string; newLicenseNumber?: string; newExpiryDate?: string }> = {}
    if (licenseIds.length > 0) {
      const rows = await prisma.vehicleLicenses.findMany({
        where: { id: { in: licenseIds } },
        select: {
          id: true,
          isActive: true,
          supersededBy: { select: { licenseNumber: true, expiryDate: true, createdAt: true } },
        },
      })
      for (const row of rows) {
        licenses[row.id] = (!row.isActive && row.supersededBy)
          ? {
              resolved: true,
              renewedAt: row.supersededBy.createdAt.toISOString(),
              newLicenseNumber: row.supersededBy.licenseNumber,
              newExpiryDate: row.supersededBy.expiryDate.toISOString(),
            }
          : { resolved: false }
      }
    }

    const driverResults: Record<string, { resolved: boolean; renewedAt?: string; newExpiryDate?: string }> = {}
    if (drivers.length > 0) {
      const driverIds = [...new Set(drivers.map(d => d.driverId))]
      const rows = await prisma.vehicleDrivers.findMany({
        where: { id: { in: driverIds } },
        select: { id: true, licenseExpiry: true, updatedAt: true },
      })
      const byId = new Map(rows.map(r => [r.id, r]))
      for (const { driverId, oldExpiry } of drivers) {
        const row = byId.get(driverId)
        const oldTime = new Date(oldExpiry).getTime()
        const resolved = !!row?.licenseExpiry && row.licenseExpiry.getTime() > oldTime
        driverResults[driverId] = resolved
          ? { resolved: true, renewedAt: row!.updatedAt.toISOString(), newExpiryDate: row!.licenseExpiry!.toISOString() }
          : { resolved: false }
      }
    }

    return NextResponse.json({ success: true, data: { licenses, drivers: driverResults } })
  } catch (error) {
    console.error('Error resolving license alert status:', error)
    return NextResponse.json({ error: 'Failed to resolve alert status' }, { status: 500 })
  }
}
