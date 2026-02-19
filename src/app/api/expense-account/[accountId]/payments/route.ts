import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  validatePaymentAmount,
  validateBatchPaymentTotal,
} from '@/lib/expense-account-utils'
import { validatePayee } from '@/lib/payee-utils'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { canUserViewAccount, canUserWriteAccount } from '@/lib/expense-account-access'
import { v4 as uuidv4 } from 'uuid'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-account/[accountId]/payments
 * Get list of expense account payments with pagination and filtering
 *
 * Query params:
 * - payeeType: Filter by payee type (USER | EMPLOYEE | PERSON | BUSINESS) (optional)
 * - payeeId: Filter by specific payee (optional)
 * - categoryId: Filter by expense category (optional)
 * - subcategoryId: Filter by expense subcategory (optional)
 * - status: Filter by status (DRAFT | SUBMITTED) (optional)
 * - startDate: Filter payments from this date (optional)
 * - endDate: Filter payments up to this date (optional)
 * - limit: Number of payments to return (default: 20)
 * - offset: Number of payments to skip (default: 0)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permissions = getEffectivePermissions(user)
    const { accountId } = await params

    if (!permissions.canAccessExpenseAccount && user.role !== 'admin') {
      if (!(await canUserViewAccount(user.id, accountId))) {
        return NextResponse.json(
          { error: 'You do not have permission to access this expense account' },
          { status: 403 }
        )
      }
    }

    // Check if expense account exists
    const account = await prisma.expenseAccounts.findUnique({
      where: { id: accountId },
      select: { id: true, accountName: true },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Expense account not found' },
        { status: 404 }
      )
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const payeeType = searchParams.get('payeeType')
    const payeeId = searchParams.get('payeeId')
    const categoryId = searchParams.get('categoryId')
    const subcategoryId = searchParams.get('subcategoryId')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: any = {
      expenseAccountId: accountId,
    }

    if (payeeType) {
      where.payeeType = payeeType
    }

    if (payeeId) {
      // Filter by specific payee based on type
      if (payeeType === 'USER') where.payeeUserId = payeeId
      else if (payeeType === 'EMPLOYEE') where.payeeEmployeeId = payeeId
      else if (payeeType === 'PERSON') where.payeePersonId = payeeId
      else if (payeeType === 'BUSINESS') where.payeeBusinessId = payeeId
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (subcategoryId) {
      where.subcategoryId = subcategoryId
    }

    if (status) {
      where.status = status
    }

    if (startDate || endDate) {
      where.paymentDate = {}
      if (startDate) {
        where.paymentDate.gte = new Date(startDate)
      }
      if (endDate) {
        where.paymentDate.lte = new Date(endDate)
      }
    }

    // Get payments with pagination
    const [payments, totalCount] = await Promise.all([
      prisma.expenseAccountPayments.findMany({
        where,
        include: {
          payeeUser: {
            select: { id: true, name: true, email: true },
          },
          payeeEmployee: {
            select: {
              id: true,
              employeeNumber: true,
              firstName: true,
              lastName: true,
              fullName: true,
              nationalId: true,
            },
          },
          payeePerson: {
            select: {
              id: true,
              fullName: true,
              nationalId: true,
              phone: true,
            },
          },
          payeeBusiness: {
            select: { id: true, name: true, type: true },
          },
          payeeSupplier: {
            select: { id: true, name: true, supplierNumber: true },
          },
          category: {
            select: { id: true, name: true, emoji: true, color: true },
          },
          subcategory: {
            select: { id: true, name: true, emoji: true },
          },
          creator: {
            select: { id: true, name: true, email: true },
          },
          submitter: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { paymentDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.expenseAccountPayments.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        payments: payments.map((p) => ({
          id: p.id,
          expenseAccountId: p.expenseAccountId,
          payeeType: p.payeeType,
          payeeUser: p.payeeUser,
          payeeEmployee: p.payeeEmployee,
          payeePerson: p.payeePerson,
          payeeBusiness: p.payeeBusiness,
          payeeSupplier: (p as any).payeeSupplier,
          category: p.category,
          subcategory: p.subcategory,
          amount: Number(p.amount),
          paymentDate: p.paymentDate.toISOString(),
          notes: p.notes,
          receiptNumber: p.receiptNumber,
          receiptServiceProvider: p.receiptServiceProvider,
          receiptReason: p.receiptReason,
          isFullPayment: p.isFullPayment,
          batchId: p.batchId,
          status: p.status,
          createdBy: p.creator,
          submittedBy: p.submitter,
          submittedAt: p.submittedAt?.toISOString(),
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching expense account payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expense account payments' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/expense-account/[accountId]/payments
 * Create new expense account payment(s) - supports both single and batch
 *
 * Body (Single Payment):
 * - payeeType: "USER" | "EMPLOYEE" | "PERSON" | "BUSINESS" (required)
 * - payeeUserId: string (required if payeeType=USER)
 * - payeeEmployeeId: string (required if payeeType=EMPLOYEE)
 * - payeePersonId: string (required if payeeType=PERSON)
 * - payeeBusinessId: string (required if payeeType=BUSINESS)
 * - categoryId: string (required)
 * - subcategoryId: string (optional)
 * - amount: number (required)
 * - paymentDate: string ISO date (optional, default: now)
 * - notes: string (optional)
 * - receiptNumber: string (optional)
 * - receiptServiceProvider: string (optional)
 * - receiptReason: string (optional)
 * - isFullPayment: boolean (optional, default: true)
 * - status: "DRAFT" | "SUBMITTED" (optional, default: "SUBMITTED")
 *
 * Body (Batch Payment):
 * - payments: array of payment objects (required)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permissions = getEffectivePermissions(user)
    const { accountId } = await params

    if (!permissions.canMakeExpensePayments && user.role !== 'admin') {
      if (!(await canUserWriteAccount(user.id, accountId))) {
        return NextResponse.json(
          { error: 'You do not have permission to make expense payments' },
          { status: 403 }
        )
      }
    }

    // Check if expense account exists and is active
    const account = await prisma.expenseAccounts.findUnique({
      where: { id: accountId },
      select: { id: true, accountName: true, isActive: true, balance: true },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Expense account not found' },
        { status: 404 }
      )
    }

    if (!account.isActive) {
      return NextResponse.json(
        { error: 'Cannot make payments from inactive expense account' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()

    // Check if batch payment or single payment
    const isBatch = Array.isArray(body.payments)
    const paymentsToCreate = isBatch ? body.payments : [body]

    // Generate unique batchId if this is a batch
    const batchId = isBatch ? uuidv4() : null

    // Validate all payments
    for (let i = 0; i < paymentsToCreate.length; i++) {
      const payment = paymentsToCreate[i]
      const paymentIndex = i + 1

      // Validate required fields
      if (!payment.payeeType) {
        return NextResponse.json(
          { error: `Payment ${paymentIndex}: Payee type is required`, index: i },
          { status: 400 }
        )
      }

      // Validate payee ID based on type
      if (payment.payeeType === 'USER' && !payment.payeeUserId) {
        return NextResponse.json(
          { error: `Payment ${paymentIndex}: User ID is required for USER payee`, index: i },
          { status: 400 }
        )
      }
      if (payment.payeeType === 'EMPLOYEE' && !payment.payeeEmployeeId) {
        return NextResponse.json(
          { error: `Payment ${paymentIndex}: Employee ID is required for EMPLOYEE payee`, index: i },
          { status: 400 }
        )
      }
      if (payment.payeeType === 'PERSON' && !payment.payeePersonId) {
        return NextResponse.json(
          { error: `Payment ${paymentIndex}: Person ID is required for PERSON payee`, index: i },
          { status: 400 }
        )
      }
      if (payment.payeeType === 'BUSINESS' && !payment.payeeBusinessId) {
        return NextResponse.json(
          { error: `Payment ${paymentIndex}: Business ID is required for BUSINESS payee`, index: i },
          { status: 400 }
        )
      }
      if (payment.payeeType === 'SUPPLIER' && !payment.payeeSupplierId) {
        return NextResponse.json(
          { error: `Payment ${paymentIndex}: Supplier ID is required for SUPPLIER payee`, index: i },
          { status: 400 }
        )
      }

      if (!payment.categoryId) {
        return NextResponse.json(
          { error: `Payment ${paymentIndex}: Category ID is required`, index: i },
          { status: 400 }
        )
      }

      if (payment.amount === undefined || payment.amount === null) {
        return NextResponse.json(
          { error: `Payment ${paymentIndex}: Amount is required`, index: i },
          { status: 400 }
        )
      }

      // Validate amount format
      const amountValidation = validatePaymentAmount(
        Number(payment.amount),
        Number(account.balance)
      )
      if (!amountValidation.valid) {
        return NextResponse.json(
          { error: `Payment ${paymentIndex}: ${amountValidation.error}`, index: i },
          { status: 400 }
        )
      }

      // Validate payment date
      const payDate = payment.paymentDate ? new Date(payment.paymentDate) : new Date()
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // Anyone with canMakeExpensePayments can backdate up to 30 days.
      // Dates older than 30 days require canEnterHistoricalData (sibling/archival entry).
      const isDeepHistoricalDate = payDate < thirtyDaysAgo

      if (isDeepHistoricalDate && !permissions.canEnterHistoricalData) {
        return NextResponse.json(
          { error: `Payment ${paymentIndex}: You do not have permission to enter expense data older than 30 days`, index: i },
          { status: 403 }
        )
      }

      // Payment date cannot be in the future
      if (payDate > now) {
        return NextResponse.json(
          { error: `Payment ${paymentIndex}: Payment date cannot be in the future`, index: i },
          { status: 400 }
        )
      }

      // Validate payee exists and is active
      const payeeId =
        payment.payeeUserId ||
        payment.payeeEmployeeId ||
        payment.payeePersonId ||
        payment.payeeBusinessId ||
        payment.payeeSupplierId

      const payeeValidation = await validatePayee(payment.payeeType, payeeId)
      if (!payeeValidation.valid) {
        return NextResponse.json(
          {
            error: `Payment ${paymentIndex}: ${payeeValidation.error}`,
            index: i,
          },
          { status: 400 }
        )
      }

      // Validate payment amount for individuals without national ID
      if (payment.payeeType === 'PERSON') {
        const person = await prisma.persons.findUnique({
          where: { id: payeeId },
          select: { nationalId: true, fullName: true },
        })

        console.log('[PaymentAPI] Validating person payment:', {
          payeeId,
          personFound: !!person,
          personNationalId: person?.nationalId,
          amount: payment.amount
        })

        if (person && !person.nationalId) {
          // Get settings to check max payment without ID
          // Fetch from settings API (should ideally be cached)
          let maxPaymentWithoutId = 100 // Default fallback
          try {
            const settingsRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:8080'}/api/admin/settings`, {
              headers: { 'Cookie': request.headers.get('cookie') || '' }
            })
            if (settingsRes.ok) {
              const settings = await settingsRes.json()
              maxPaymentWithoutId = settings.maxPaymentWithoutId || 100
            }
          } catch (error) {
            console.error('[PaymentAPI] Failed to fetch settings, using default:', error)
          }

          console.log('[PaymentAPI] Person has no national ID - checking limit:', {
            maxPaymentWithoutId,
            amount: Number(payment.amount),
            willBlock: Number(payment.amount) >= maxPaymentWithoutId
          })

          if (Number(payment.amount) >= maxPaymentWithoutId) {
            console.log('[PaymentAPI] BLOCKING payment - exceeds limit')
            return NextResponse.json(
              {
                error: `Payment ${paymentIndex}: Cannot pay $${maxPaymentWithoutId.toFixed(2)} or more to ${person.fullName} without a national ID. Maximum allowed: $${(maxPaymentWithoutId - 0.01).toFixed(2)}. Please add their national ID or reduce the amount.`,
                index: i,
              },
              { status: 400 }
            )
          }
        }
      }

      // Validate category exists
      const category = await prisma.expenseCategories.findUnique({
        where: { id: payment.categoryId },
      })
      if (!category) {
        return NextResponse.json(
          { error: `Payment ${paymentIndex}: Expense category not found`, index: i },
          { status: 404 }
        )
      }

      // Validate subcategory if category requires it
      if (category.requiresSubcategory && !payment.subcategoryId) {
        return NextResponse.json(
          {
            error: `Payment ${paymentIndex}: This category requires a subcategory`,
            index: i,
          },
          { status: 400 }
        )
      }

      // Validate subcategory exists if provided
      if (payment.subcategoryId) {
        const subcategory = await prisma.expenseSubcategories.findUnique({
          where: { id: payment.subcategoryId },
        })
        if (!subcategory) {
          return NextResponse.json(
            {
              error: `Payment ${paymentIndex}: Expense subcategory not found`,
              index: i,
            },
            { status: 404 }
          )
        }
        // Validate subcategory belongs to category
        if (subcategory.categoryId !== payment.categoryId) {
          return NextResponse.json(
            {
              error: `Payment ${paymentIndex}: Subcategory does not belong to the selected category`,
              index: i,
            },
            { status: 400 }
          )
        }
      }

      // Validate sub-subcategory exists if provided
      if (payment.subSubcategoryId) {
        const subSubcategory = await prisma.expenseSubSubcategories.findUnique({
          where: { id: payment.subSubcategoryId },
        })
        if (!subSubcategory) {
          return NextResponse.json(
            {
              error: `Payment ${paymentIndex}: Expense sub-subcategory not found`,
              index: i,
            },
            { status: 404 }
          )
        }
        // Validate sub-subcategory belongs to subcategory
        if (subSubcategory.subcategoryId !== payment.subcategoryId) {
          return NextResponse.json(
            {
              error: `Payment ${paymentIndex}: Sub-subcategory does not belong to the selected subcategory`,
              index: i,
            },
            { status: 400 }
          )
        }
      }
    }

    // Calculate total payment amount (only for SUBMITTED status)
    const totalAmount = paymentsToCreate
      .filter((p) => (p.status || 'SUBMITTED') === 'SUBMITTED')
      .reduce((sum, p) => sum + Number(p.amount), 0)

    // Check expense account balance for submitted payments
    if (totalAmount > 0) {
      const batchValidation = await validateBatchPaymentTotal(accountId, totalAmount)
      if (!batchValidation.valid) {
        return NextResponse.json(
          {
            error: batchValidation.error,
            required: totalAmount,
            available: batchValidation.availableBalance,
          },
          { status: 400 }
        )
      }
    }

    // Create payments in transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdPayments = []

      for (const payment of paymentsToCreate) {
        const paymentStatus = payment.status || 'SUBMITTED'
        const paymentDate = payment.paymentDate ? new Date(payment.paymentDate) : new Date()

        // Create payment
        const newPayment = await tx.expenseAccountPayments.create({
          data: {
            expenseAccountId: accountId,
            payeeType: payment.payeeType,
            payeeUserId: payment.payeeUserId || null,
            payeeEmployeeId: payment.payeeEmployeeId || null,
            payeePersonId: payment.payeePersonId || null,
            payeeBusinessId: payment.payeeBusinessId || null,
            payeeSupplierId: payment.payeeSupplierId || null,
            categoryId: payment.categoryId,
            subcategoryId: payment.subcategoryId || null,
            amount: Number(payment.amount),
            paymentDate,
            notes: payment.notes?.trim() || null,
            receiptNumber: payment.receiptNumber?.trim() || null,
            receiptServiceProvider: payment.receiptServiceProvider?.trim() || null,
            receiptReason: payment.receiptReason?.trim() || null,
            isFullPayment: payment.isFullPayment !== undefined ? payment.isFullPayment : true,
            batchId,
            status: paymentStatus,
            createdBy: user.id,
            submittedBy: paymentStatus === 'SUBMITTED' ? user.id : null,
            submittedAt: paymentStatus === 'SUBMITTED' ? new Date() : null,
          },
          include: {
            payeeUser: {
              select: { id: true, name: true, email: true },
            },
            payeeEmployee: {
              select: {
                id: true,
                employeeNumber: true,
                fullName: true,
              },
            },
            payeePerson: {
              select: {
                id: true,
                fullName: true,
                nationalId: true,
              },
            },
            payeeBusiness: {
              select: { id: true, name: true, type: true },
            },
            payeeSupplier: {
              select: { id: true, name: true, supplierNumber: true },
            },
            category: {
              select: { id: true, name: true, emoji: true },
            },
            subcategory: {
              select: { id: true, name: true, emoji: true },
            },
          },
        })

        createdPayments.push(newPayment)
      }

      // Update expense account balance (only submitted payments affect balance)
      // Calculate balance from deposits and payments within the transaction
      const depositsSum = await tx.expenseAccountDeposits.aggregate({
        where: { expenseAccountId: accountId },
        _sum: { amount: true },
      })

      const paymentsSum = await tx.expenseAccountPayments.aggregate({
        where: {
          expenseAccountId: accountId,
          status: 'SUBMITTED',
        },
        _sum: { amount: true },
      })

      const totalDeposits = Number(depositsSum._sum.amount || 0)
      const totalPayments = Number(paymentsSum._sum.amount || 0)
      const newBalance = totalDeposits - totalPayments

      // Update the account balance
      await tx.expenseAccounts.update({
        where: { id: accountId },
        data: { balance: newBalance, updatedAt: new Date() },
      })

      return { payments: createdPayments, newBalance }
    })

    return NextResponse.json(
      {
        success: true,
        message: isBatch
          ? `${result.payments.length} payments created successfully`
          : 'Payment created successfully',
        data: {
          payments: result.payments.map((p) => ({
            id: p.id,
            expenseAccountId: p.expenseAccountId,
            payeeType: p.payeeType,
            payeeUser: p.payeeUser,
            payeeEmployee: p.payeeEmployee,
            payeePerson: p.payeePerson,
            payeeBusiness: p.payeeBusiness,
            category: p.category,
            subcategory: p.subcategory,
            amount: Number(p.amount),
            paymentDate: p.paymentDate.toISOString(),
            notes: p.notes,
            receiptNumber: p.receiptNumber,
            status: p.status,
            batchId: p.batchId,
            createdAt: p.createdAt.toISOString(),
          })),
          expenseAccountBalance: result.newBalance,
          totalAmount,
          batchId,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating expense account payment(s):', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create expense account payment(s)',
      },
      { status: 500 }
    )
  }
}
