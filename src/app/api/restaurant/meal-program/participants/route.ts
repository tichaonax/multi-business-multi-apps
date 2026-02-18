import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// ─── GET /api/restaurant/meal-program/participants ───────────────────────────
// List participants (employees auto-enrolled + registered externals) for a business.
// Query params: businessId (required), search (optional), type (EMPLOYEE | EXTERNAL | all)
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || 'all' // EMPLOYEE | EXTERNAL | all

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    // Verify business is a restaurant
    const business = await prisma.businesses.findFirst({
      where: { id: businessId, type: 'restaurant', isActive: true },
      select: { id: true }
    })
    if (!business) {
      return NextResponse.json({ error: 'Restaurant business not found' }, { status: 404 })
    }

    const searchLower = search.toLowerCase()

    // ── Employees (auto-enrolled) ──────────────────────────────────────────
    let employeeResults: any[] = []
    if (type === 'all' || type === 'EMPLOYEE') {
      const employees = await prisma.employees.findMany({
        where: {
          isActive: true,
          OR: [
            { primaryBusinessId: businessId },
            {
              employee_business_assignments: {
                some: { businessId, isActive: true },
              },
            },
          ],
          ...(search
            ? {
                AND: [
                  {
                    OR: [
                      { fullName: { contains: search, mode: 'insensitive' } },
                      { phone: { contains: search } },
                      { employeeNumber: { contains: search, mode: 'insensitive' } },
                      { nationalId: { contains: search, mode: 'insensitive' } },
                    ],
                  },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          fullName: true,
          phone: true,
          employeeNumber: true,
          nationalId: true,
          employmentStatus: true,
          terminationDate: true,
          meal_program_participant: {
            select: { id: true, isActive: true, registeredAt: true },
          },
          employee_contracts_employee_contracts_employeeIdToemployees: {
            where: { status: 'active' },
            select: { endDate: true },
            orderBy: { endDate: 'desc' },
            take: 1,
          },
        },
        orderBy: { fullName: 'asc' },
      })

      // ── Lazy contract-expiry deactivation ──────────────────────────────
      // Any employee whose active contract has passed its end date should
      // automatically have their meal program record deactivated.
      const nowForExpiry = new Date()
      const expiredEmployees = employees.filter((e: any) => {
        const contract = e.employee_contracts_employee_contracts_employeeIdToemployees?.[0]
        const contractEnd = contract?.endDate ? new Date(contract.endDate) : null
        return contractEnd && contractEnd < nowForExpiry && e.meal_program_participant?.isActive === true
      })
      const expiredParticipantIds = expiredEmployees.map(
        (e: any) => e.meal_program_participant!.id as string
      )
      if (expiredParticipantIds.length > 0) {
        await prisma.mealProgramParticipants.updateMany({
          where: { id: { in: expiredParticipantIds } },
          data: { isActive: false },
        })
      }
      const expiredParticipantIdSet = new Set(expiredParticipantIds)

      // Check today's purchases in a single query for all employees
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const employeeParticipantIds = employees
        .map((e: { meal_program_participant?: { id: string } | null }) => e.meal_program_participant?.id)
        .filter(Boolean) as string[]

      const todayTxns = employeeParticipantIds.length
        ? await prisma.mealProgramTransactions.findMany({
            where: {
              participantId: { in: employeeParticipantIds },
              transactionDate: { gte: today, lt: tomorrow },
            },
            select: { participantId: true },
          })
        : []

      const purchasedTodaySet = new Set(todayTxns.map((t: { participantId: string }) => t.participantId))

      employeeResults = employees.map((e: any) => ({
        participantRecordId: e.meal_program_participant?.id || null,
        participantType: 'EMPLOYEE',
        isEnrolled: !!e.meal_program_participant,
        isActive: expiredParticipantIdSet.has(e.meal_program_participant?.id ?? '')
          ? false
          : (e.meal_program_participant?.isActive ?? true),
        employeeId: e.id,
        fullName: e.fullName,
        phone: e.phone,
        employeeNumber: e.employeeNumber,
        nationalId: e.nationalId,
        employmentStatus: e.employmentStatus,
        terminationDate: e.terminationDate,
        contractEndDate: e.employee_contracts_employee_contracts_employeeIdToemployees?.[0]?.endDate ?? null,
        alreadyPurchasedToday: purchasedTodaySet.has(e.meal_program_participant?.id ?? ''),
      }))
    }

    // ── External persons ───────────────────────────────────────────────────
    let externalResults: any[] = []
    if (type === 'all' || type === 'EXTERNAL') {
      const externals = await prisma.mealProgramParticipants.findMany({
        where: {
          businessId,
          participantType: 'EXTERNAL',
          ...(search
            ? {
                persons: {
                  OR: [
                    { fullName: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search } },
                    { nationalId: { contains: search, mode: 'insensitive' } },
                  ],
                },
              }
            : {}),
        },
        include: {
          persons: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              nationalId: true,
              notes: true,
            },
          },
        },
        orderBy: { registeredAt: 'desc' },
      })

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const externalParticipantIds = externals.map((e: { id: string }) => e.id)
      const todayTxns = externalParticipantIds.length
        ? await prisma.mealProgramTransactions.findMany({
            where: {
              participantId: { in: externalParticipantIds },
              transactionDate: { gte: today, lt: tomorrow },
            },
            select: { participantId: true },
          })
        : []
      const purchasedTodaySet = new Set(todayTxns.map((t: { participantId: string }) => t.participantId))

      externalResults = externals.map((p: any) => ({
        participantRecordId: p.id,
        participantType: 'EXTERNAL',
        isEnrolled: true,
        isActive: p.isActive,
        personId: p.personId,
        fullName: p.persons?.fullName || 'Unknown',
        phone: p.persons?.phone || '',
        nationalId: p.persons?.nationalId || null,
        notes: p.notes,
        registeredAt: p.registeredAt,
        alreadyPurchasedToday: purchasedTodaySet.has(p.id),
      }))
    }

    return NextResponse.json({
      success: true,
      data: [...employeeResults, ...externalResults],
      meta: {
        total: employeeResults.length + externalResults.length,
        employees: employeeResults.length,
        externals: externalResults.length,
      },
    })
  } catch (error) {
    console.error('[meal-program/participants GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/restaurant/meal-program/participants ──────────────────────────
// Register a new external participant.
// Body: { businessId, personData: { fullName, phone, nationalId? }, notes? }
// Requires canManageEmployees permission.
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = user.role === 'admin'
    const canManage =
      isAdmin ||
      (user.businessMemberships || []).some(
        (m: any) =>
          m.permissions?.canManageEmployees === true ||
          m.permissions?.isAdmin === true ||
          m.role === 'business-owner' ||
          m.role === 'business-manager'
      )
    if (!canManage) {
      return NextResponse.json(
        { error: 'You do not have permission to register meal program participants' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { businessId, personData, notes, employeeId, isActive: initialIsActive } = body

    // ── Employee enrollment branch ──────────────────────────────────────────
    // Supports { businessId, employeeId, isActive? } to enroll/toggle an employee
    if (employeeId) {
      if (!businessId) {
        return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
      }

      const empBusiness = await prisma.businesses.findFirst({
        where: { id: businessId, type: 'restaurant', isActive: true },
        select: { id: true },
      })
      if (!empBusiness) {
        return NextResponse.json({ error: 'Restaurant business not found' }, { status: 404 })
      }

      const employee = await prisma.employees.findFirst({
        where: { id: employeeId },
        select: { id: true, fullName: true },
      })
      if (!employee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
      }

      const desiredActive = initialIsActive !== false // default true

      const existing = await prisma.mealProgramParticipants.findFirst({
        where: { employeeId, businessId },
      })
      if (existing) {
        const updated = await prisma.mealProgramParticipants.update({
          where: { id: existing.id },
          data: { isActive: desiredActive },
        })
        return NextResponse.json({ success: true, data: updated })
      }

      const participant = await prisma.mealProgramParticipants.create({
        data: {
          businessId,
          employeeId,
          participantType: 'EMPLOYEE',
          isActive: desiredActive,
          registeredBy: user.id,
          notes: notes || undefined,
        },
      })
      return NextResponse.json({ success: true, data: participant }, { status: 201 })
    }

    // ── External participant registration ───────────────────────────────────
    if (!businessId || !personData?.fullName || !personData?.phone) {
      return NextResponse.json(
        { error: 'businessId, personData.fullName, and personData.phone are required' },
        { status: 400 }
      )
    }

    // Verify business is a restaurant
    const business = await prisma.businesses.findFirst({
      where: { id: businessId, type: 'restaurant', isActive: true },
      select: { id: true }
    })
    if (!business) {
      return NextResponse.json({ error: 'Restaurant business not found' }, { status: 404 })
    }

    // Create Person + MealProgramParticipants record atomically
    const result = await prisma.$transaction(async (tx: any) => {
      // Check if a person with this phone already exists
      let person = await tx.persons.findFirst({
        where: { phone: personData.phone },
      })

      if (!person) {
        person = await tx.persons.create({
          data: {
            fullName: personData.fullName,
            phone: personData.phone,
            nationalId: personData.nationalId || undefined,
            notes: notes || undefined,
            createdBy: user.id,
          },
        })
      }

      // Check if already enrolled for this business
      const existing = await tx.mealProgramParticipants.findFirst({
        where: { businessId, personId: person.id },
      })
      if (existing) {
        throw new Error('ALREADY_ENROLLED')
      }

      const participant = await tx.mealProgramParticipants.create({
        data: {
          businessId,
          participantType: 'EXTERNAL',
          personId: person.id,
          isActive: true,
          registeredBy: user.id,
          notes: notes || undefined,
        },
        include: {
          persons: {
            select: { id: true, fullName: true, phone: true, nationalId: true },
          },
        },
      })

      return { participant, person }
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          participantRecordId: result.participant.id,
          participantType: 'EXTERNAL',
          personId: result.person.id,
          fullName: result.person.fullName,
          phone: result.person.phone,
          nationalId: result.person.nationalId,
          isActive: result.participant.isActive,
          registeredAt: result.participant.registeredAt,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error?.message === 'ALREADY_ENROLLED') {
      return NextResponse.json(
        { error: 'This person is already enrolled in the meal program for this business' },
        { status: 409 }
      )
    }
    console.error('[meal-program/participants POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
