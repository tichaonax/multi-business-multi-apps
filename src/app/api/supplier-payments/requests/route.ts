import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

// POST /api/supplier-payments/requests — POS submits a new payment request
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { businessId, supplierId, expenseAccountId, amount, dueDate, notes, receiptNumber, items } = body

    if (!businessId || !supplierId) {
      return NextResponse.json(
        { error: 'businessId and supplierId are required' },
        { status: 400 }
      )
    }

    // Validate items or amount
    const hasItems = Array.isArray(items) && items.length > 0
    if (!hasItems && !amount) {
      return NextResponse.json(
        { error: 'Either items or amount is required' },
        { status: 400 }
      )
    }

    const permissions = getEffectivePermissions(user, businessId)
    if (!permissions.canSubmitSupplierPaymentRequests) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Validate supplier exists and check flags
    const supplier = await prisma.businessSuppliers.findFirst({
      where: { id: supplierId },
      select: { id: true, name: true, discontinued: true, posBlocked: true }
    })

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }
    if (supplier.discontinued) {
      return NextResponse.json({ error: 'Cannot submit a request for a discontinued supplier' }, { status: 400 })
    }
    // POS blocked: only block if user does NOT have approve permission
    if (supplier.posBlocked && !permissions.canApproveSupplierPayments) {
      return NextResponse.json({ error: 'This supplier is blocked from POS payment requests' }, { status: 400 })
    }

    // Resolve expense account: use provided ID or fall back to first active account
    let resolvedAccountId = expenseAccountId
    if (!resolvedAccountId) {
      const defaultAccount = await prisma.expenseAccounts.findFirst({
        where: { businessId, isActive: true, accountType: 'GENERAL' },
        orderBy: { createdAt: 'asc' },
        select: { id: true }
      })
      if (!defaultAccount) {
        return NextResponse.json(
          { error: 'No active expense account found for this business. Please contact your manager.' },
          { status: 400 }
        )
      }
      resolvedAccountId = defaultAccount.id
    } else {
      // Validate the provided account belongs to this business
      const account = await prisma.expenseAccounts.findFirst({
        where: { id: resolvedAccountId, businessId },
        select: { id: true }
      })
      if (!account) {
        return NextResponse.json({ error: 'Expense account not found for this business' }, { status: 404 })
      }
    }

    // Compute total amount: sum of (amount + taxAmount) per item
    let parsedAmount: number
    if (hasItems) {
      const itemTotals = (items as any[]).map((item: any) => {
        const base = parseFloat(item.amount)
        const tax = item.taxAmount ? parseFloat(item.taxAmount) : 0
        return { base, tax }
      })
      if (itemTotals.some(t => isNaN(t.base) || t.base <= 0)) {
        return NextResponse.json({ error: 'Each item must have a positive amount' }, { status: 400 })
      }
      parsedAmount = itemTotals.reduce((sum: number, t) => sum + t.base + t.tax, 0)
    } else {
      parsedAmount = parseFloat(amount)
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
      }
    }

    const submittedAt = new Date()
    const resolvedDueDate = dueDate ? new Date(dueDate) : submittedAt

    const req = await prisma.$transaction(async (tx: any) => {
      const created = await tx.supplierPaymentRequests.create({
        data: {
          businessId,
          supplierId,
          expenseAccountId: resolvedAccountId,
          amount: parsedAmount,
          dueDate: resolvedDueDate,
          notes: notes?.trim() || null,
          receiptNumber: receiptNumber?.trim() || null,
          status: 'PENDING',
          submittedBy: user.id,
          submittedAt,
          paidAmount: 0,
        },
      })

      if (hasItems) {
        await tx.supplierPaymentRequestItems.createMany({
          data: (items as any[]).map((item: any) => ({
            requestId: created.id,
            description: item.description?.trim() || null,
            categoryId: item.categoryId || null,
            subcategoryId: item.subcategoryId || null,
            amount: parseFloat(item.amount),
          })),
        })
      }

      return tx.supplierPaymentRequests.findUnique({
        where: { id: created.id },
        include: {
          supplier: { select: { id: true, name: true, emoji: true } },
          expenseAccount: { select: { id: true, accountName: true } },
          submitter: { select: { id: true, name: true } },
          items: {
            include: {
              category: { select: { id: true, name: true, emoji: true } },
              subcategory: { select: { id: true, name: true, emoji: true } },
            },
          },
        },
      })
    })

    return NextResponse.json({ success: true, data: req }, { status: 201 })
  } catch (error) {
    console.error('Error creating supplier payment request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/supplier-payments/requests — list requests (scoped by role)
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const status = searchParams.get('status')
    const supplierId = searchParams.get('supplierId')
    const submittedBy = searchParams.get('submittedBy')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    const permissions = getEffectivePermissions(user, businessId)
    const canViewQueue = permissions.canViewSupplierPaymentQueue
    const canSubmit = permissions.canSubmitSupplierPaymentRequests

    if (!canViewQueue && !canSubmit) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const where: any = { businessId }

    // POS users see only their own requests
    if (!canViewQueue) {
      where.submittedBy = user.id
    } else {
      // Managers can filter by submitter
      if (submittedBy) where.submittedBy = submittedBy
    }

    if (status) where.status = status
    if (supplierId) where.supplierId = supplierId
    if (startDate || endDate) {
      where.submittedAt = {}
      if (startDate) where.submittedAt.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setDate(end.getDate() + 1)
        where.submittedAt.lt = end
      }
    }

    const [requests, total] = await Promise.all([
      prisma.supplierPaymentRequests.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true, emoji: true } },
          expenseAccount: { select: { id: true, accountName: true } },
          submitter: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } },
          denier: { select: { id: true, name: true } },
          items: {
            include: {
              category: { select: { id: true, name: true, emoji: true } },
              subcategory: { select: { id: true, name: true, emoji: true } },
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supplierPaymentRequests.count({ where }),
    ])

    const items = requests.map((r: typeof requests[0]) => ({
      ...r,
      amount: parseFloat(r.amount.toString()),
      paidAmount: parseFloat(r.paidAmount.toString()),
      remainingAmount: parseFloat(r.amount.toString()) - parseFloat(r.paidAmount.toString()),
      items: (r.items || []).map((item: any) => ({
        ...item,
        amount: parseFloat(item.amount.toString()),
        taxAmount: item.taxAmount != null ? parseFloat(item.taxAmount.toString()) : null,
        approvedAmount: item.approvedAmount != null ? parseFloat(item.approvedAmount.toString()) : null,
      })),
    }))

    return NextResponse.json({
      success: true,
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Error fetching supplier payment requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
