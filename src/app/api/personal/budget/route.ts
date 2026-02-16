import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasUserPermission } from '@/lib/permission-utils'
import { randomUUID } from 'crypto';
import { getServerUser } from '@/lib/get-server-user'
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Check if user has permission to access personal finance
    if (!hasUserPermission(user, 'canAccessPersonalFinance')) {
      return NextResponse.json({ error: 'Insufficient permissions to access personal finance' }, { status: 403 })
    }

    const budgetEntries = await prisma.personalBudgets.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })

    const balance = budgetEntries.reduce((acc, entry) => {
      return entry.type === 'deposit' 
        ? acc + Number(entry.amount)
        : acc - Number(entry.amount)
    }, 0)

    // Convert Decimal amounts to numbers for JSON serialization
    const entriesWithConvertedAmounts = budgetEntries.map(entry => ({
      ...entry,
      amount: entry.amount ? Number(entry.amount) : 0
    }))

    return NextResponse.json({
      balance,
      entries: entriesWithConvertedAmounts
    })
  } catch (error) {
    console.error('Budget fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch budget' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Check if user has permission to add money
    if (!hasUserPermission(user, 'canAddMoney')) {
      return NextResponse.json({ error: 'Insufficient permissions to add money' }, { status: 403 })
    }

    const { amount, description, type = 'deposit' } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount required' }, { status: 400 })
    }

    const budgetEntry = await prisma.personalBudgets.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        amount: Number(amount),
        description: description || '',
        type
      }
    })

    return NextResponse.json(budgetEntry)
  } catch (error) {
    console.error('Budget creation error:', error)
    return NextResponse.json({ error: 'Failed to add budget entry' }, { status: 500 })
  }
}