import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { emitNotification } from '@/lib/notifications/notification-emitter'

// GET /api/payment-vouchers?paymentId=xxx
// Returns the voucher for a specific payment (if it exists)
export async function GET(request: NextRequest) {
  const paymentId = request.nextUrl.searchParams.get('paymentId')
  if (!paymentId) {
    return NextResponse.json({ error: 'paymentId is required' }, { status: 400 })
  }

  const voucher = await prisma.expensePaymentVouchers.findUnique({
    where: { paymentId },
    include: {
      creator: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
    },
  })

  return NextResponse.json({ success: true, data: voucher })
}

// POST /api/payment-vouchers
// Creates or updates a voucher for a payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      paymentId,
      businessId,
      userId,           // session user id — we resolve to employee server-side
      collectorName,
      collectorPhone,
      collectorIdNumber,
      collectorDlNumber,
      collectorSignature,
      notes,
    } = body

    if (!paymentId || !businessId || !userId || !collectorName) {
      return NextResponse.json(
        { error: 'paymentId, businessId, userId and collectorName are required' },
        { status: 400 }
      )
    }

    // Resolve user → employee
    const employee = await prisma.employees.findFirst({
      where: { userId },
      select: { id: true, firstName: true, lastName: true },
    })
    const createdById = employee?.id
    if (!createdById) {
      return NextResponse.json({ error: 'No employee profile found for current user' }, { status: 403 })
    }
    const creatorName = `${employee.firstName} ${employee.lastName}`

    // Check if payment exists and pull payee info for the notification
    const payment = await prisma.expenseAccountPayments.findUnique({
      where: { id: paymentId },
      include: {
        payeeEmployee: { select: { firstName: true, lastName: true } },
        payeeSupplier: { select: { name: true } },
        payeeBusiness: { select: { name: true } },
        payeePerson: { select: { fullName: true } },
        payeeUser: { select: { name: true } },
      },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Determine if this is a create or update
    const existing = await prisma.expensePaymentVouchers.findUnique({
      where: { paymentId },
    })

    let voucher
    let isNew = false

    if (existing) {
      // Update — overwrite collector details
      voucher = await prisma.expensePaymentVouchers.update({
        where: { paymentId },
        data: {
          collectorName,
          collectorPhone: collectorPhone || null,
          collectorIdNumber: collectorIdNumber || null,
          collectorDlNumber: collectorDlNumber || null,
          collectorSignature: collectorSignature || null,
          notes: notes || null,
          createdById,
        },
      })
    } else {
      // Create — generate voucher number
      isNew = true
      const count = await prisma.expensePaymentVouchers.count({
        where: { businessId },
      })
      const seq = String(count + 1).padStart(4, '0')
      const year = new Date().getFullYear()
      const voucherNumber = `VCH-${year}-${seq}`

      voucher = await prisma.expensePaymentVouchers.create({
        data: {
          paymentId,
          businessId,
          voucherNumber,
          collectorName,
          collectorPhone: collectorPhone || null,
          collectorIdNumber: collectorIdNumber || null,
          collectorDlNumber: collectorDlNumber || null,
          collectorSignature: collectorSignature || null,
          notes: notes || null,
          createdById,
        },
      })
    }

    // Notify all admins + managers on first creation only
    if (isNew) {
      try {
        const payeeName =
          (payment as any).payeeEmployee
            ? `${(payment as any).payeeEmployee.firstName} ${(payment as any).payeeEmployee.lastName}`
            : (payment as any).payeeSupplier?.name ||
              (payment as any).payeeBusiness?.name ||
              (payment as any).payeePerson?.fullName ||
              (payment as any).payeeUser?.name ||
              'Unknown Payee'

        const managers = await prisma.users.findMany({
          where: {
            isActive: true,
            OR: [{ role: 'admin' }, { role: 'manager' }],
          },
          select: { id: true },
        })
        const managerIds = managers.map((m) => m.id)

        if (managerIds.length > 0) {
          await emitNotification({
            userIds: managerIds,
            type: 'PAYMENT_SUBMITTED',
            title: '📄 Payment Voucher Generated',
            message: `$${Number(payment.amount).toFixed(2)} to ${payeeName} — collected by ${collectorName} — ${voucher.voucherNumber} (prepared by ${creatorName})`,
            linkUrl: '/expense-accounts',
          })
        }
      } catch {
        // Non-critical — don't fail the request if notification fails
      }
    }

    return NextResponse.json({ success: true, data: voucher }, { status: isNew ? 201 : 200 })
  } catch (error) {
    console.error('Error saving payment voucher:', error)
    return NextResponse.json(
      { error: 'Failed to save voucher', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
