import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { generateAccountNumber } from '@/lib/expense-account-utils'

/**
 * GET /api/business-loans
 * List all business loans with balance summary. Admin only.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageBusinessLoans) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const loans = await prisma.businessLoan.findMany({
      include: {
        managedBy: { select: { id: true, name: true, email: true } },
        lenderUser: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } },
        expenseAccount: { select: { id: true, accountNumber: true, balance: true } },
        _count: {
          select: { expenseEntries: true, preLockRepayments: true, withdrawalRequests: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ loans })
  } catch (error) {
    console.error('GET /api/business-loans error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/business-loans
 * Create a new business loan and its linked expense account. Admin only.
 *
 * Body: { description, totalAmount, lenderName, lenderContactInfo?, lenderUserId?,
 *         managedByUserId, notes? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageBusinessLoans) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { description, totalAmount, lenderName, lenderContactInfo, lenderUserId, managedByUserId, notes } = body

    if (!description || !totalAmount || !lenderName || !managedByUserId) {
      return NextResponse.json(
        { error: 'description, totalAmount, lenderName, and managedByUserId are required' },
        { status: 400 }
      )
    }

    if (Number(totalAmount) <= 0) {
      return NextResponse.json({ error: 'totalAmount must be positive' }, { status: 400 })
    }

    // Verify the assigned user exists
    const managedByUser = await prisma.users.findUnique({ where: { id: managedByUserId }, select: { id: true } })
    if (!managedByUser) {
      return NextResponse.json({ error: 'managedByUserId refers to a non-existent user' }, { status: 400 })
    }

    // If lenderUserId provided, verify it exists
    if (lenderUserId) {
      const lender = await prisma.users.findUnique({ where: { id: lenderUserId }, select: { id: true } })
      if (!lender) {
        return NextResponse.json({ error: 'lenderUserId refers to a non-existent user' }, { status: 400 })
      }
    }

    // Generate unique numbers
    const loanDate = new Date()
    const dateStr = loanDate.toISOString().slice(0, 10).replace(/-/g, '')
    const lastLoan = await prisma.businessLoan.findFirst({
      where: { loanNumber: { startsWith: `LN-${dateStr}-` } },
      orderBy: { loanNumber: 'desc' },
    })
    const seq = lastLoan ? parseInt(lastLoan.loanNumber.split('-')[2]) + 1 : 1
    const loanNumber = `LN-${dateStr}-${seq.toString().padStart(4, '0')}`

    const accountNumber = await generateAccountNumber()

    const result = await prisma.$transaction(async (tx) => {
      // Create the expense account for this loan (starts at $0, isLoanAccount=true)
      const expenseAccount = await tx.expenseAccounts.create({
        data: {
          accountNumber,
          accountName: `Loan: ${lenderName} — ${description}`,
          balance: 0,
          isLoanAccount: true,
          accountType: 'GENERAL',
          createdBy: user.id,
        },
      })

      // Create the loan record
      const loan = await tx.businessLoan.create({
        data: {
          loanNumber,
          description,
          totalAmount,
          lenderName,
          lenderContactInfo: lenderContactInfo ?? null,
          lenderUserId: lenderUserId ?? null,
          managedByUserId,
          expenseAccountId: expenseAccount.id,
          notes: notes ?? null,
          createdBy: user.id,
          status: 'RECORDING',
        },
      })

      return { loan, expenseAccount }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('POST /api/business-loans error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
