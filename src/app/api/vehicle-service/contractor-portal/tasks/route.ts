import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET /api/vehicle-service/contractor-portal/tasks
//
// Restricted surface for contractors. Gated purely by VehicleServiceContractors.userId
// matching the logged-in session — deliberately does NOT go through BusinessPermissions
// (contractors have no business memberships at all).
//
// Returns ONLY incomplete tasks assigned to the logged-in contractor, and ONLY
// job-related work details. No pricing, fees, customer charges, or order/invoice
// data is ever selected here — see MBM-261 Phase 4.
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const contractor = await prisma.vehicleServiceContractors.findUnique({
      where: { userId: user.id },
      select: { id: true, status: true },
    })
    if (!contractor) {
      return NextResponse.json({ error: 'No contractor profile linked to this account' }, { status: 403 })
    }

    const tasks = await prisma.vehicleServiceTasks.findMany({
      where: {
        contractorId: contractor.id,
        status: { not: 'completed' },
      },
      select: {
        id: true,
        status: true,
        workDescription: true,
        assignedAt: true,
        subcategory: { select: { name: true, emoji: true } },
        job: {
          select: {
            vehicleMake: true,
            vehicleModel: true,
            vehiclePlate: true,
            vehicleVin: true,
          },
        },
      },
      orderBy: { assignedAt: 'asc' },
    })

    return NextResponse.json({
      contractorStatus: contractor.status,
      tasks: tasks.map(t => ({
        id: t.id,
        status: t.status,
        workDescription: t.workDescription,
        assignedAt: t.assignedAt,
        serviceName: t.subcategory.name,
        serviceEmoji: t.subcategory.emoji,
        vehicle: [t.job.vehicleMake, t.job.vehicleModel].filter(Boolean).join(' ') || null,
        vehiclePlate: t.job.vehiclePlate,
        vehicleVin: t.job.vehicleVin,
      })),
    })
  } catch (error) {
    console.error('Contractor portal tasks error:', error)
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 })
  }
}
