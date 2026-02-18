import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasUserPermission } from '@/lib/permission-utils'
import { Decimal } from '@prisma/client/runtime/library'

const SUBSIDY_AMOUNT = new Decimal('0.50')

/**
 * POST /api/restaurant/meal-program/transactions
 *
 * Process a meal program transaction:
 *  - $0.50 subsidy always applied from the business expense account
 *  - One item subsidised per transaction; any remaining balance is paid in cash
 *  - Additional items beyond the subsidised item are full-price cash
 *  - Each participant may only use the daily subsidy ONCE per calendar day
 *
 * Body:
 *   businessId          string
 *   participantId       string              (MealProgramParticipants.id)
 *   subsidizedItem      { productId?, productName, unitPrice, isEligibleItem }
 *   cashItems?          [{ productId?, productName, unitPrice, quantity }]
 *   soldByEmployeeId?   string
 *   notes?              string
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      businessId,
      participantId: participantIdFromBody,
      employeeId: employeeIdFromBody,
      subsidizedItem,
      cashItems = [],
      soldByEmployeeId,
      notes,
    } = body

    if (!businessId || (!participantIdFromBody && !employeeIdFromBody) || !subsidizedItem) {
      return NextResponse.json(
        { success: false, error: 'businessId, (participantId or employeeId) and subsidizedItem are required' },
        { status: 400 }
      )
    }

    if (!subsidizedItem.productName || subsidizedItem.unitPrice === undefined) {
      return NextResponse.json(
        { success: false, error: 'subsidizedItem must include productName and unitPrice' },
        { status: 400 }
      )
    }

    // ----- Resolve participant (existing record, or auto-enroll employee on first use) -----
    let participant: any
    if (participantIdFromBody) {
      participant = await prisma.mealProgramParticipants.findFirst({
        where: { id: participantIdFromBody, businessId },
        include: {
          employees: { select: { id: true, fullName: true } },
          persons: { select: { id: true, fullName: true } },
        },
      })
      if (!participant) {
        return NextResponse.json({ success: false, error: 'Participant not found' }, { status: 404 })
      }
    } else {
      // Auto-enroll: upsert a MealProgramParticipants record for this employee on first use
      participant = await prisma.mealProgramParticipants.upsert({
        where: { employeeId: employeeIdFromBody },
        create: {
          businessId,
          participantType: 'EMPLOYEE',
          employeeId: employeeIdFromBody,
          isActive: true,
          registeredBy: user.id,
        },
        update: {}, // no-op: keep existing record unchanged
        include: {
          employees: { select: { id: true, fullName: true } },
          persons: { select: { id: true, fullName: true } },
        },
      })
    }

    const participantId = participant.id

    if (!participant.isActive) {
      return NextResponse.json(
        { success: false, error: 'Participant is inactive and cannot use the meal program' },
        { status: 400 }
      )
    }

    // ----- Check daily subsidy limit -----
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const todayTxn = await prisma.mealProgramTransactions.findFirst({
      where: {
        participantId,
        businessId,
        transactionDate: { gte: todayStart, lte: todayEnd },
      },
      select: { id: true },
    })

    if (todayTxn) {
      return NextResponse.json(
        { success: false, error: 'This participant has already used their daily meal program subsidy today' },
        { status: 409 }
      )
    }

    // ----- Resolve expense account (primary active account for business) -----
    const expenseAccount = await prisma.expenseAccounts.findFirst({
      where: { businessId, isActive: true },
      orderBy: { createdAt: 'asc' },
    })

    if (!expenseAccount) {
      return NextResponse.json(
        { success: false, error: 'No active expense account found for this business' },
        { status: 400 }
      )
    }

    // ----- Resolve "Employee Meal Program" expense category -----
    const mealCategory = await prisma.expenseCategories.findFirst({
      where: { name: 'Employee Meal Program' },
      select: { id: true },
    })

    if (!mealCategory) {
      return NextResponse.json(
        { success: false, error: 'Expense category "Employee Meal Program" not found. Please seed it.' },
        { status: 400 }
      )
    }

    // ----- Compute amounts -----
    const subsidizedUnitPrice = new Decimal(String(subsidizedItem.unitPrice))
    // Cash portion for the subsidised item (cannot be negative)
    const subsidizedCashPortion = Decimal.max(
      subsidizedUnitPrice.minus(SUBSIDY_AMOUNT),
      new Decimal(0)
    )

    // Cash items total
    const cashItemsTotal = cashItems.reduce((sum: Decimal, item: any) => {
      const qty = Number(item.quantity || 1)
      return sum.plus(new Decimal(String(item.unitPrice)).times(qty))
    }, new Decimal(0))

    const totalCashAmount = subsidizedCashPortion.plus(cashItemsTotal)
    const totalAmount = SUBSIDY_AMOUNT.plus(totalCashAmount)

    // ----- Build order number -----
    const now = new Date()
    const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, '')
    const randomSuffix = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0')
    const orderNumber = `MP-${datePrefix}-${randomSuffix}`

    // ----- Resolve soldByEmployeeId: verify it's actually an Employees record, not a User ID -----
    // The POS passes sessionUser.id which is a Users.id — we must not pass that as employeeId FK
    let resolvedSoldByEmployeeId: string | null = null
    let resolvedSoldByName: string = user.name || user.email || 'Staff'
    if (soldByEmployeeId) {
      const empRecord = await prisma.employees.findFirst({
        where: { id: soldByEmployeeId, primaryBusinessId: businessId },
        select: { id: true, fullName: true },
      })
      if (empRecord) {
        resolvedSoldByEmployeeId = empRecord.id
        resolvedSoldByName = empRecord.fullName
      } else {
        // soldByEmployeeId is likely a userId — look up name from Users
        const userRecord = await prisma.users.findFirst({
          where: { id: soldByEmployeeId },
          select: { name: true, email: true },
        })
        if (userRecord) resolvedSoldByName = userRecord.name || userRecord.email || resolvedSoldByName
      }
    }

    // ----- Participant display name -----
    const participantName =
      participant.employees?.fullName ||
      participant.persons?.fullName ||
      `Participant ${participantId.slice(-6)}`

    // ----- Build order items list -----
    type OrderItemInput = {
      productVariantId: string | null
      quantity: number
      unitPrice: Decimal
      totalPrice: Decimal
      attributes?: any
    }

    const allOrderItems: OrderItemInput[] = [
      {
        productVariantId: null, // meal program items may not have a product variant
        quantity: 1,
        unitPrice: subsidizedUnitPrice,
        totalPrice: subsidizedUnitPrice,
        attributes: {
          productName: subsidizedItem.productName,
          mealProgram: true,
          subsidyApplied: true,
          isEligibleItem: subsidizedItem.isEligibleItem ?? true,
          subsidyAmount: SUBSIDY_AMOUNT.toFixed(2),
          cashPortion: subsidizedCashPortion.toFixed(2),
          productId: subsidizedItem.productId || null,
        },
      },
      ...cashItems.map((ci: any) => {
        const qty = Number(ci.quantity || 1)
        const up = new Decimal(String(ci.unitPrice))
        return {
          productVariantId: null,
          quantity: qty,
          unitPrice: up,
          totalPrice: up.times(qty),
          attributes: {
            productName: ci.productName,
            mealProgram: true,
            subsidyApplied: false,
            productId: ci.productId || null,
          },
        }
      }),
    ]

    // ----- Execute everything in a single Prisma transaction -----
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the business order
      const order = await tx.businessOrders.create({
        data: {
          businessId,
          orderNumber,
          employeeId: resolvedSoldByEmployeeId,
          orderType: 'SALE',
          status: 'COMPLETED',
          businessType: 'restaurant',
          paymentMethod: 'EXPENSE_ACCOUNT',
          paymentStatus: 'PAID',
          subtotal: totalAmount,
          taxAmount: new Decimal(0),
          discountAmount: new Decimal(0),
          totalAmount,
          processedAt: new Date(),
          transactionDate: new Date(),
          updatedAt: new Date(),
          notes: notes || null,
          attributes: {
            mealProgram: true,
            participantId,
            participantName,
            participantType: participant.participantType,
            expenseAmount: SUBSIDY_AMOUNT.toFixed(2),
            cashAmount: totalCashAmount.toFixed(2),
            soldByName: resolvedSoldByName,
          },
          business_order_items: {
            create: allOrderItems.map((item, idx) => ({
              productVariantId: item.productVariantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountAmount: new Decimal(0),
              totalPrice: item.totalPrice,
              attributes: item.attributes,
            })),
          },
        },
      })

      // 2. Create the expense account payment ($0.50 from expense account)
      const expensePayment = await tx.expenseAccountPayments.create({
        data: {
          expenseAccountId: expenseAccount.id,
          payeeType: 'EMPLOYEE',
          payeeEmployeeId: participant.employeeId || null,
          payeePersonId: participant.personId || null,
          categoryId: mealCategory.id,
          amount: SUBSIDY_AMOUNT.toNumber(),
          paymentDate: new Date(),
          notes: `Meal program subsidy — ${participantName} — Order ${orderNumber}`,
          receiptNumber: orderNumber,
          isFullPayment: true,
          status: 'SUBMITTED',
          createdBy: user.id,
          submittedBy: user.id,
          submittedAt: new Date(),
        },
      })

      // 3. Decrement expense account balance directly (bypass validateBatchPaymentTotal)
      await tx.expenseAccounts.update({
        where: { id: expenseAccount.id },
        data: { balance: { decrement: SUBSIDY_AMOUNT.toNumber() } },
      })

      // 4. Create the MealProgramTransactions record
      const mealTxn = await tx.mealProgramTransactions.create({
        data: {
          businessId,
          participantId,
          orderId: order.id,
          expenseAccountId: expenseAccount.id,
          expensePaymentId: expensePayment.id,
          soldByEmployeeId: resolvedSoldByEmployeeId,
          soldByUserId: user.id,
          subsidyAmount: SUBSIDY_AMOUNT,
          cashAmount: totalCashAmount,
          totalAmount,
          subsidizedProductId: subsidizedItem.productId || null,
          subsidizedProductName: subsidizedItem.productName,
          subsidizedIsEligibleItem: subsidizedItem.isEligibleItem ?? true,
          transactionDate: now,
          itemsSummary: allOrderItems.map((i) => ({
            name: i.attributes?.productName || 'Item',
            quantity: i.quantity,
            unitPrice: i.unitPrice.toFixed(2),
            totalPrice: i.totalPrice.toFixed(2),
          })),
          notes: notes || null,
        },
      })

      return { order, expensePayment, mealTxn }
    })

    return NextResponse.json({
      success: true,
      data: {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        mealTransactionId: result.mealTxn.id,
        subsidyAmount: SUBSIDY_AMOUNT.toFixed(2),
        cashAmount: totalCashAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        participantName,
      },
    })
  } catch (error: any) {
    console.error('[Meal Program Transaction] Error:', error)
    // Return a friendly message — never expose raw Prisma/DB errors to the client
    const friendly =
      error?.code === 'P2002' ? 'A duplicate record was detected. Please try again.' :
      error?.code === 'P2025' ? 'A required record was not found. Please refresh and try again.' :
      error?.code?.startsWith('P') ? 'A database error occurred. Please try again.' :
      'Failed to process meal program transaction. Please try again.'
    return NextResponse.json(
      { success: false, error: friendly },
      { status: 500 }
    )
  }
}

/**
 * GET /api/restaurant/meal-program/transactions
 *
 * Query params:
 *   businessId          required
 *   participantId?      filter by participant
 *   soldByEmployeeId?   filter by salesperson
 *   dateFrom?           ISO date string
 *   dateTo?             ISO date string
 *   page?               default 1
 *   limit?              default 30
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const businessId = searchParams.get('businessId')
    const participantId = searchParams.get('participantId')
    const soldByEmployeeId = searchParams.get('soldByEmployeeId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '30'))

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 })
    }

    const where: any = { businessId }
    if (participantId) where.participantId = participantId
    if (soldByEmployeeId) where.soldByEmployeeId = soldByEmployeeId
    if (dateFrom || dateTo) {
      where.transactionDate = {}
      if (dateFrom) where.transactionDate.gte = new Date(dateFrom)
      if (dateTo) where.transactionDate.lte = new Date(dateTo)
    }

    const [total, transactions] = await Promise.all([
      prisma.mealProgramTransactions.count({ where }),
      prisma.mealProgramTransactions.findMany({
        where,
        orderBy: { transactionDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          participant: {
            select: {
              id: true,
              participantType: true,
              employees: { select: { id: true, fullName: true } },
              persons: { select: { id: true, fullName: true } },
            },
          },
          soldByEmployee: { select: { id: true, fullName: true } },
          soldByUser: { select: { id: true, name: true, email: true } },
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              totalAmount: true,
              createdAt: true,
            },
          },
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: transactions.map((t) => ({
        id: t.id,
        participantName:
          t.participant.employees?.fullName ||
          t.participant.persons?.fullName ||
          `Participant`,
        participantType: t.participant.participantType,
        orderNumber: t.order.orderNumber,
        subsidyAmount: Number(t.subsidyAmount),
        cashAmount: Number(t.cashAmount),
        totalAmount: Number(t.totalAmount),
        subsidizedProductName: t.subsidizedProductName,
        subsidizedIsEligibleItem: t.subsidizedIsEligibleItem,
        soldByName: t.soldByEmployee?.fullName || t.soldByUser?.name || t.soldByUser?.email,
        transactionDate: t.transactionDate.toISOString(),
        itemsSummary: t.itemsSummary,
        notes: t.notes,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('[Meal Program Transactions GET] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}
