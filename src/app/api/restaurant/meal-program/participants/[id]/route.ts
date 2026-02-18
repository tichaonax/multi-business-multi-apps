import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// ─── GET /api/restaurant/meal-program/participants/[id] ──────────────────────
// Get a single participant with recent transaction history.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = params

    const participant = await prisma.mealProgramParticipants.findUnique({
      where: { id },
      include: {
        employees: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            employeeNumber: true,
            nationalId: true,
          },
        },
        persons: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            nationalId: true,
            notes: true,
          },
        },
        transactions: {
          orderBy: { transactionDate: 'desc' },
          take: 30,
          select: {
            id: true,
            transactionDate: true,
            subsidyAmount: true,
            cashAmount: true,
            totalAmount: true,
            subsidizedProductName: true,
            subsidizedIsEligibleItem: true,
            itemsSummary: true,
            soldByEmployee: {
              select: { fullName: true },
            },
          },
        },
      },
    })

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    const profile =
      participant.participantType === 'EMPLOYEE' ? participant.employees : participant.persons

    return NextResponse.json({
      success: true,
      data: {
        id: participant.id,
        businessId: participant.businessId,
        participantType: participant.participantType,
        isActive: participant.isActive,
        notes: participant.notes,
        registeredAt: participant.registeredAt,
        fullName: profile?.fullName,
        phone: participant.participantType === 'EMPLOYEE'
          ? (participant.employees?.phone)
          : (participant.persons?.phone),
        nationalId: participant.participantType === 'EMPLOYEE'
          ? (participant.employees?.nationalId)
          : (participant.persons?.nationalId),
        employeeNumber: participant.employees?.employeeNumber,
        transactions: participant.transactions.map((t: any) => ({
          id: t.id,
          date: t.transactionDate,
          subsidyAmount: Number(t.subsidyAmount),
          cashAmount: Number(t.cashAmount),
          totalAmount: Number(t.totalAmount),
          subsidizedProductName: t.subsidizedProductName,
          subsidizedIsEligibleItem: t.subsidizedIsEligibleItem,
          itemsSummary: t.itemsSummary,
          cashierName: t.soldByEmployee?.fullName || 'Unknown',
        })),
      },
    })
  } catch (error) {
    console.error('[meal-program/participants/[id] GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PUT /api/restaurant/meal-program/participants/[id] ──────────────────────
// Update a participant's active status or notes.
// Body: { isActive?, notes? }
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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
        { error: 'You do not have permission to update participants' },
        { status: 403 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { isActive, notes } = body

    const updated = await prisma.mealProgramParticipants.update({
      where: { id },
      data: {
        ...(isActive !== undefined ? { isActive } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      select: {
        id: true,
        isActive: true,
        notes: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }
    console.error('[meal-program/participants/[id] PUT]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
