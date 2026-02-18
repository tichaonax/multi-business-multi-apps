import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// ─── GET /api/restaurant/meal-program/participants/check-today ───────────────
// Check if a participant has already used their $0.50 subsidy today.
// Query: participantId (MealProgramParticipants.id) OR employeeId (for lazy employee lookup)
// Also supports businessId + employeeId for lazy enrollment check without a participant record
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const participantId = searchParams.get('participantId')
    const employeeId = searchParams.get('employeeId')
    const businessId = searchParams.get('businessId')

    if (!participantId && !(employeeId && businessId)) {
      return NextResponse.json(
        { error: 'Either participantId or (employeeId + businessId) is required' },
        { status: 400 }
      )
    }

    let resolvedParticipantId = participantId

    // If employeeId + businessId provided, find or return not-enrolled
    if (!resolvedParticipantId && employeeId && businessId) {
      const participant = await prisma.mealProgramParticipants.findFirst({
        where: { businessId, employeeId },
        select: { id: true, isActive: true },
      })
      if (!participant) {
        // Employee is eligible but not yet enrolled — no purchase today
        return NextResponse.json({
          success: true,
          alreadyPurchasedToday: false,
          participantId: null,
          isEnrolled: false,
          lastTransaction: null,
        })
      }
      if (!participant.isActive) {
        return NextResponse.json({
          success: true,
          alreadyPurchasedToday: false,
          participantId: participant.id,
          isEnrolled: true,
          isActive: false,
          lastTransaction: null,
        })
      }
      resolvedParticipantId = participant.id
    }

    // Check today's transactions
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const lastTransaction = await prisma.mealProgramTransactions.findFirst({
      where: {
        participantId: resolvedParticipantId!,
        transactionDate: { gte: today, lt: tomorrow },
      },
      orderBy: { transactionDate: 'desc' },
      select: {
        id: true,
        transactionDate: true,
        subsidyAmount: true,
        cashAmount: true,
        totalAmount: true,
        subsidizedProductName: true,
        subsidizedIsEligibleItem: true,
      },
    })

    return NextResponse.json({
      success: true,
      alreadyPurchasedToday: !!lastTransaction,
      participantId: resolvedParticipantId,
      isEnrolled: true,
      isActive: true,
      lastTransaction: lastTransaction
        ? {
            id: lastTransaction.id,
            time: lastTransaction.transactionDate,
            subsidyAmount: Number(lastTransaction.subsidyAmount),
            cashAmount: Number(lastTransaction.cashAmount),
            totalAmount: Number(lastTransaction.totalAmount),
            subsidizedProductName: lastTransaction.subsidizedProductName,
            subsidizedIsEligibleItem: lastTransaction.subsidizedIsEligibleItem,
          }
        : null,
    })
  } catch (error) {
    console.error('[meal-program/participants/check-today GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
