import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

// GET /api/vehicle-service/jobs?businessId=&status=
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const jobStatus = searchParams.get('status') || undefined
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }

    const jobs = await prisma.vehicleServiceJobs.findMany({
      where: { businessId, ...(jobStatus ? { status: jobStatus } : {}) },
      select: {
        id: true,
        status: true,
        vehicleMake: true,
        vehicleModel: true,
        vehiclePlate: true,
        orderId: true,
        createdAt: true,
        business_customers: { select: { id: true, name: true, phone: true } },
        tasks: {
          select: { id: true, status: true, agreedFeeAmount: true, customerPriceOverride: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      jobs: jobs.map(j => ({
        id: j.id,
        status: j.status,
        vehicleMake: j.vehicleMake,
        vehicleModel: j.vehicleModel,
        vehiclePlate: j.vehiclePlate,
        orderId: j.orderId,
        createdAt: j.createdAt,
        customerName: j.business_customers?.name ?? null,
        customerPhone: j.business_customers?.phone ?? null,
        taskCount: j.tasks.length,
        completedTaskCount: j.tasks.filter(t => t.status === 'completed').length,
        totalCustomerPrice: j.tasks.reduce((sum, t) => sum + Number(t.customerPriceOverride ?? t.agreedFeeAmount), 0),
      })),
    })
  } catch (error) {
    console.error('List vehicle service jobs error:', error)
    return NextResponse.json({ error: 'Failed to list jobs' }, { status: 500 })
  }
}

// POST /api/vehicle-service/jobs
// Body: { businessId, customerId?, vehicleMake?, vehicleModel?, vehiclePlate?, vehicleVin?, notes? }
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { businessId, customerId, vehicleMake, vehicleModel, vehiclePlate, vehicleVin, notes } = body as {
      businessId?: string; customerId?: string; vehicleMake?: string; vehicleModel?: string
      vehiclePlate?: string; vehicleVin?: string; notes?: string
    }
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }

    const job = await prisma.vehicleServiceJobs.create({
      data: {
        businessId,
        customerId: customerId || null,
        vehicleMake: vehicleMake || null,
        vehicleModel: vehicleModel || null,
        vehiclePlate: vehiclePlate || null,
        vehicleVin: vehicleVin || null,
        notes: notes || null,
        createdBy: user.id,
      },
    })

    return NextResponse.json({ success: true, job })
  } catch (error) {
    console.error('Create vehicle service job error:', error)
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }
}
