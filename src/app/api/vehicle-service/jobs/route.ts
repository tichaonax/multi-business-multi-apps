import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

// GET /api/vehicle-service/jobs?businessId=&status=&search=&contractorId=&dateFrom=&dateTo=
// search matches: customer name/phone, vehicle make/model/plate, primary contractor name,
// any task's contractor name, or any task's service (subcategory) name — e.g. "oil change".
// contractorId matches jobs where that contractor is the primary contractor OR has a task.
// dateFrom/dateTo filter on createdAt (inclusive; dateTo extended to end-of-day).
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const jobStatus = searchParams.get('status') || undefined
    const search = searchParams.get('search')?.trim() || undefined
    const contractorId = searchParams.get('contractorId') || undefined
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }

    const createdAtFilter: any = {}
    if (dateFrom) createdAtFilter.gte = new Date(dateFrom)
    if (dateTo) {
      const end = new Date(dateTo)
      end.setDate(end.getDate() + 1)
      createdAtFilter.lt = end
    }

    const andFilters: any[] = []
    if (contractorId) {
      andFilters.push({
        OR: [
          { primaryContractorId: contractorId },
          { tasks: { some: { contractorId } } },
        ],
      })
    }
    if (search) {
      andFilters.push({
        OR: [
          { business_customers: { name: { contains: search, mode: 'insensitive' } } },
          { business_customers: { phone: { contains: search } } },
          { vehicleMake: { contains: search, mode: 'insensitive' } },
          { vehicleModel: { contains: search, mode: 'insensitive' } },
          { vehiclePlate: { contains: search, mode: 'insensitive' } },
          { primaryContractor: { persons: { fullName: { contains: search, mode: 'insensitive' } } } },
          { tasks: { some: { contractor: { persons: { fullName: { contains: search, mode: 'insensitive' } } } } } },
          { tasks: { some: { subcategory: { name: { contains: search, mode: 'insensitive' } } } } },
        ],
      })
    }

    const where: any = {
      businessId,
      ...(jobStatus ? { status: jobStatus } : {}),
      ...(Object.keys(createdAtFilter).length > 0 ? { createdAt: createdAtFilter } : {}),
      ...(andFilters.length > 0 ? { AND: andFilters } : {}),
    }

    const jobs = await prisma.vehicleServiceJobs.findMany({
      where,
      select: {
        id: true,
        status: true,
        vehicleMake: true,
        vehicleModel: true,
        vehiclePlate: true,
        orderId: true,
        createdAt: true,
        jobCardPrintedAt: true,
        jobCardReturnedAt: true,
        vehicleReleasedAt: true,
        primaryContractor: { select: { id: true, persons: { select: { fullName: true } } } },
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
        jobCardPrintedAt: j.jobCardPrintedAt,
        jobCardReturnedAt: j.jobCardReturnedAt,
        vehicleReleasedAt: j.vehicleReleasedAt,
        primaryContractorName: j.primaryContractor?.persons?.fullName ?? null,
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
// Body: { businessId, primaryContractorId, customerId?, vehicleMake?, vehicleModel?, vehiclePlate?, vehicleVin?, notes? }
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { businessId, primaryContractorId, customerId, vehicleMake, vehicleModel, vehiclePlate, vehicleVin, notes } = body as {
      businessId?: string; primaryContractorId?: string; customerId?: string; vehicleMake?: string; vehicleModel?: string
      vehiclePlate?: string; vehicleVin?: string; notes?: string
    }
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    if (!primaryContractorId) return NextResponse.json({ error: 'primaryContractorId is required' }, { status: 400 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }

    const primaryContractor = await prisma.vehicleServiceContractors.findUnique({
      where: { id: primaryContractorId },
      select: { businessId: true, status: true },
    })
    if (!primaryContractor || primaryContractor.businessId !== businessId) {
      return NextResponse.json({ error: 'Primary contractor not found for this business' }, { status: 400 })
    }
    if (primaryContractor.status !== 'active') {
      return NextResponse.json({ error: `Selected primary contractor is ${primaryContractor.status} and cannot take new jobs` }, { status: 400 })
    }

    const job = await prisma.vehicleServiceJobs.create({
      data: {
        businessId,
        primaryContractorId,
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
