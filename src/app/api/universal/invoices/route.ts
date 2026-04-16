import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { InvoiceType } from '@prisma/client'

/**
 * GET /api/universal/invoices?businessId=&type=&status=&q=&page=&limit=
 * List invoices/quotations with optional filters.
 * q searches by number or customerName.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const type = searchParams.get('type') as InvoiceType | null
    const status = searchParams.get('status')
    const q = searchParams.get('q')?.trim()
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '25', 10))

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    const where: any = { businessId }
    if (type) where.type = type
    if (status) where.status = status
    if (q) {
      where.OR = [
        { number: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
      ]
    }

    const [total, records] = await Promise.all([
      prisma.invoices.count({ where }),
      prisma.invoices.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          type: true,
          number: true,
          status: true,
          customerName: true,
          preparedByName: true,
          issueDate: true,
          validUntilDate: true,
          total: true,
          currency: true,
          currencySymbol: true,
          createdAt: true,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: records,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('GET /api/universal/invoices error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/universal/invoices
 * Create a new invoice or quotation. Atomically assigns the next sequential number.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      businessId,
      type,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      preparedByName,
      issueDate,
      validUntilDate,
      notes,
      items,          // InvoiceItemInput[]
      discountAmount,
      taxAmount,
    } = body

    if (!businessId || !type || !customerName || !validUntilDate || !preparedByName) {
      return NextResponse.json(
        { error: 'businessId, type, customerName, validUntilDate and preparedByName are required' },
        { status: 400 }
      )
    }
    if (!['INVOICE', 'QUOTATION'].includes(type)) {
      return NextResponse.json({ error: 'type must be INVOICE or QUOTATION' }, { status: 400 })
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 })
    }
    if (items.length > 30) {
      return NextResponse.json({ error: 'Maximum 30 line items allowed' }, { status: 400 })
    }

    // Compute totals
    const subtotal = items.reduce((sum: number, item: any) => {
      const lineTotal = Number(item.quantity) * Number(item.unitPrice) * (1 - (Number(item.discount) || 0) / 100)
      return sum + lineTotal
    }, 0)
    const disc = Number(discountAmount) || 0
    const tax = Number(taxAmount) || 0
    const total = Math.max(0, subtotal - disc + tax)

    const invoice = await prisma.$transaction(async (tx) => {
      const counterField = type === 'INVOICE' ? 'invoiceCounter' : 'quotationCounter'
      const prefix = type === 'INVOICE' ? 'INV' : 'QUO'

      const biz = await tx.businesses.update({
        where: { id: businessId },
        data: { [counterField]: { increment: 1 } },
        select: {
          invoiceCounter: true,
          quotationCounter: true,
          currency: true,
          currencySymbol: true,
        },
      })

      const seq = type === 'INVOICE' ? biz.invoiceCounter : biz.quotationCounter
      const number = `${prefix}-${String(seq).padStart(4, '0')}`

      return tx.invoices.create({
        data: {
          businessId,
          type,
          number,
          status: 'DRAFT',
          customerId: customerId || null,
          customerName,
          customerEmail: customerEmail || null,
          customerPhone: customerPhone || null,
          customerAddress: customerAddress || null,
          preparedById: user.id,
          preparedByName,
          issueDate: issueDate ? new Date(issueDate) : new Date(),
          validUntilDate: new Date(validUntilDate),
          notes: notes || null,
          subtotal,
          discountAmount: disc,
          taxAmount: tax,
          total,
          currency: biz.currency,
          currencySymbol: biz.currencySymbol,
          invoice_items: {
            create: items.map((item: any, idx: number) => ({
              description: item.description,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              discount: Number(item.discount) || 0,
              total: Number(item.quantity) * Number(item.unitPrice) * (1 - (Number(item.discount) || 0) / 100),
              sortOrder: idx,
            })),
          },
        },
        include: { invoice_items: true },
      })
    })

    return NextResponse.json({ success: true, data: invoice }, { status: 201 })
  } catch (error) {
    console.error('POST /api/universal/invoices error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
